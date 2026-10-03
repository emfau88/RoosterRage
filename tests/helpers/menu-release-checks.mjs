import fs from 'node:fs/promises';
import path from 'node:path';
import { projectRoot } from './test-runtime.mjs';

function assert(condition, message, details) {
  if (!condition) throw new Error(`${message}\n${JSON.stringify(details, null, 2)}`);
}

export async function verifyUpgradePanel(page, viewport, expectedCount) {
  await page.locator('.upgrade-panel').evaluate(async (panel) => {
    await Promise.all(panel.getAnimations().map((animation) => animation.finished));
    panel.querySelector('.upgrade-panel__body').scrollTop = 0;
  });
  const geometry = await page.evaluate(() => {
    const rect = (element) => {
      const r = element.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };
    const panel = document.querySelector('.upgrade-panel');
    const body = panel.querySelector('.upgrade-panel__body');
    const important = [...panel.querySelectorAll('.upgrade-button__rank, .upgrade-button__changes > span, .upgrade-button__description, .upgrade-button__synergy, .upgrade-button__evolution-hint, .upgrade-button__summary')]
      .filter(element => element.getClientRects().length > 0);
    return {
      panel: rect(panel), body: rect(body), reroll: panel.querySelector('.reroll-button') ? rect(panel.querySelector('.reroll-button')) : null,
      columns: getComputedStyle(panel.querySelector('.upgrade-list')).gridTemplateColumns.split(' ').length,
      cards: [...panel.querySelectorAll('.upgrade-button')].map((button) => ({
        ...rect(button), titleSize: parseFloat(getComputedStyle(button.querySelector('.upgrade-button__heading strong')).fontSize)
      })),
      important: important.map((element) => ({ text: element.textContent, ...rect(element), fontSize: parseFloat(getComputedStyle(element).fontSize), display: getComputedStyle(element).display })),
      bodyClientWidth: body.clientWidth, bodyScrollWidth: body.scrollWidth,
      documentWidth: document.documentElement.scrollWidth
    };
  });
  const inside = (r) => r.left >= -2 && r.top >= -2 && r.right <= viewport.width + 2 && r.bottom <= viewport.height + 2;
  assert(inside(geometry.panel) && inside(geometry.body) && (!geometry.reroll || inside(geometry.reroll)), `${viewport.name}: upgrade frame, scroll area or reroll leaves the viewport.`, geometry);
  assert(Math.abs(geometry.panel.top - (viewport.height - geometry.panel.bottom)) <= 2, `${viewport.name}: upgrade dialog is not vertically centered.`, geometry);
  assert(geometry.documentWidth <= viewport.width && geometry.bodyScrollWidth <= geometry.bodyClientWidth + 1, `${viewport.name}: upgrade content overflows horizontally.`, geometry);
  assert(geometry.cards.length === expectedCount && geometry.cards.every((card) => card.height >= 44 && card.titleSize >= 16), `${viewport.name}: missing offer, undersized title or touch target.`, geometry);
  const floor = viewport.width <= 899 ? 13 : 12;
  assert(geometry.important.length > 0 && geometry.important.every((text) => text.fontSize >= floor && text.display !== 'none' && text.height > 0), `${viewport.name}: an effect, rank, synergy or recipe was hidden or reduced below ${floor}px.`, geometry.important);
  const compact = viewport.width >= 600 && viewport.width > viewport.height && viewport.height <= 500;
  const expectedColumns = expectedCount === 4 ? (compact || viewport.width >= 720 ? 2 : 1) : (!compact && viewport.width >= 900 ? 3 : 1);
  assert(geometry.columns === expectedColumns, `${viewport.name}: offers are not distributed equally across ${expectedColumns} columns.`, geometry);
  if (compact) {
    assert(geometry.cards.every(card => card.top >= geometry.body.top - 1 && card.bottom <= geometry.body.bottom + 1), `${viewport.name}: compact offers require scrolling.`, geometry);
    const original = await page.evaluate(() => JSON.stringify(window.__ROOSTER_TEST__.getProgressionState()));
    await page.locator('.upgrade-offer__details').first().click();
    const detail = await page.locator('.upgrade-detail').evaluate(element => {
      const r = element.getBoundingClientRect();
      const texts = [...element.querySelectorAll('.upgrade-button__changes > span, .upgrade-button__description, .upgrade-button__synergy, .upgrade-button__evolution-hint')];
      return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, readable:texts.every(text => text.getClientRects().length && parseFloat(getComputedStyle(text).fontSize) >= 13) };
    });
    assert(inside(detail) && detail.readable, `${viewport.name}: full details are clipped or hidden.`, detail);
    assert(await page.evaluate(() => JSON.stringify(window.__ROOSTER_TEST__.getProgressionState())) === original, 'Opening details consumed or replaced an upgrade.');
    await page.keyboard.press('Escape');
    assert(await page.locator('.upgrade-offer__details').first().evaluate(element => document.activeElement === element), 'Closing details lost the original focus.');
  }
  // Each card must be reachable inside its own scroll area, including the fourth boss offer.
  const cards = page.locator('.upgrade-button');
  for (let index = 0; index < expectedCount; index += 1) {
    await cards.nth(index).scrollIntoViewIfNeeded();
    const reachable = await cards.nth(index).evaluate((button) => {
      const r = button.getBoundingClientRect(), b = button.closest('.upgrade-panel__body').getBoundingClientRect();
      const x = r.left + r.width / 2, y = Math.max(r.top, b.top) + Math.min(r.bottom - Math.max(r.top, b.top), b.height) / 2;
      return button.contains(document.elementFromPoint(x, y));
    });
    assert(reachable, `${viewport.name}: offer ${index + 1} cannot be reached through the dialog scroll area.`, geometry);
  }
  await page.locator('.upgrade-panel__body').evaluate((body) => { body.scrollTop = 0; });
  return { count: expectedCount, columns: geometry.columns, textFloor: floor, panel: geometry.panel, allOffersReachable: true };
}

export async function verifyReleaseMenuInteractions(browser, url) {
  const results = [];
  const save = JSON.parse(await fs.readFile(path.join(projectRoot, 'docs/qa/portal-package-0/advanced-save.json'), 'utf8'));
  for (const viewport of [
    { name: 'desktop-interactions', width: 960, height: 540 },
    { name: 'landscape-interactions', width: 844, height: 390 },
    { name: 'touch-interactions', width: 390, height: 844, touch: true },
    { name: 'short-interactions', width: 320, height: 568, touch: true }
  ]) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, hasTouch: !!viewport.touch, deviceScaleFactor: viewport.touch ? 2 : 1 });
    await context.addInitScript((state) => {
      localStorage.setItem('rooster-rage:meta:v2', JSON.stringify(state));
      // Observe the same scene as the production QA harness without adding a shipped API.
      let phaser;
      Object.defineProperty(window, 'Phaser', { configurable: true, get: () => phaser, set(value) {
        phaser = value;
        const boot = value.Game.prototype.boot;
        value.Game.prototype.boot = function (...args) { window.__menuGame = this; return boot.apply(this, args); };
      } });
    }, save);
    const page = await context.newPage(), errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    try {
      await page.goto(`${url}?seed=menu-release-${viewport.name}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.henhouse-panel');
      assert(await page.locator('[data-hub-tab="training"]').innerText() === 'Talents', 'The navigation does not consistently name Talents.');
      if (viewport.touch) {
        await page.locator('[data-rooster-picker-open]').tap();
        await page.locator('[data-rooster-picker] [data-hub-rooster="storm"]').tap();
        assert(!await page.locator('[data-rooster-picker]').isVisible(), 'The mobile rooster picker did not close after selecting.');
        const strip = page.locator('.hub-challenge-list');
        await strip.scrollIntoViewIfNeeded();
        const bounds = await strip.boundingBox(), session = await context.newCDPSession(page);
        const startX = Math.round(bounds.x + bounds.width * .8), endX = Math.round(bounds.x + bounds.width * .2), y = Math.round(bounds.y + bounds.height / 2);
        await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y }] });
        for (let step = 1; step <= 6; step += 1) {
          await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: Math.round(startX + (endX - startX) * step / 6), y }] });
          await page.waitForTimeout(20);
        }
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await session.detach();
        await page.waitForTimeout(120);
        assert(await strip.evaluate((element) => element.scrollLeft > 20), 'Horizontal touch scrolling cannot reach the later expedition cards.');
      }
      await page.locator('[data-hub-tab="roosters"]').click();
      await page.locator('.rooster-card--storm').click();
      const choose = page.locator('.rooster-entry').filter({ has: page.locator('.rooster-card--storm') }).locator('.rooster-card__choose');
      assert((await choose.innerText()).includes('SELECT'), 'Rooster selection incorrectly promises to start the run.');
      await choose.click();
      assert(await page.locator('[data-hub-view="play"]').isVisible() && await page.locator('.henhouse-panel').isVisible(), 'Selecting a rooster should return to Play before starting.');
      await page.locator('[data-run-start]').click();
      await page.evaluate(() => { const api = window.__ROOSTER_TEST__; api.pauseWaves(); api.clearEnemies(); api.clearProjectiles(); api.setPlayerLevel(20); });

      // Exact offers use valid prerequisites, not a fake EVO or fabricated display text.
      await page.evaluate(() => {
        const scene = window.__menuGame.scene.getScene('GameScene');
        scene.startLevelUp();
        const choices = ['primary-storm-rank', 'storm-static-plumage', 'orbit-eggs'].map((id) => scene.upgradeSystem.upgrades.find((upgrade) => upgrade.id === id));
        if (!choices.every((upgrade) => scene.upgradeSystem.isAvailable(upgrade, scene.player))) throw new Error('Invalid recipe fixture');
        scene.runState.pendingUpgradeChoices = choices.map((upgrade) => scene.upgradeSystem.presentUpgrade(upgrade, scene.player));
        scene.hud.showUpgradeChoices(scene.runState.pendingUpgradeChoices, { type: 'level', canReroll: true });
      });
      const recipe = await verifyUpgradePanel(page, viewport, 3);
      assert(await page.locator('.upgrade-button__evolution-hint').count() > 0, 'The primary offer is missing its EVO recipe.');
      if (await page.locator('.upgrade-offer__details').first().isVisible()) {
        await page.locator('.upgrade-offer__details').first().click();
        assert((await page.locator('.upgrade-detail').innerText()).includes('EVO RECIPE'), 'The complete EVO recipe is missing from details.');
        await page.keyboard.press('Escape');
      } else {
        assert((await page.locator('.upgrade-panel').innerText()).includes('EVO RECIPE'), 'Recipe label is not English.');
      }
      await page.locator('.reroll-button').focus();
      await page.keyboard.press('Tab');
      assert(await page.locator('.upgrade-button').first().evaluate((button) => document.activeElement === button), 'Tab does not wrap from reroll to the first offer.');
      await page.keyboard.press('Shift+Tab');
      assert(await page.locator('.reroll-button').evaluate((button) => document.activeElement === button), 'Shift+Tab escapes the upgrade dialog.');
      await page.keyboard.press('Enter');
      assert((await page.evaluate(() => window.__ROOSTER_TEST__.getLoadout())).rerollsRemaining === 0 && await page.locator('.reroll-button').count() === 0, 'Keyboard reroll did not consume exactly one charge.');
      await page.locator('.upgrade-button').first().press('Space');
      assert(!(await page.evaluate(() => window.__ROOSTER_TEST__.getProgressionState())).choosingUpgrade, 'Space did not select an offer and resume.');

      // A normal multi-reward queue exercises replacement focus, receipts and the fourth card.
      await page.evaluate(() => { const api = window.__ROOSTER_TEST__; api.startLevelUp(3); api.startChestReward('elite'); api.startChestReward('boss'); });
      const kinds = [], panels = [];
      let receiptChecks = 0;
      for (let index = 0; index < 5; index += 1) {
        const state = await page.evaluate(() => window.__ROOSTER_TEST__.getProgressionState());
        kinds.push(state.currentSelection.kind ?? state.currentSelection.type);
        panels.push(await verifyUpgradePanel(page, viewport, state.choices.length));
        if (index > 0) {
          assert(await page.locator('.upgrade-selection-receipt').count() === 1, 'Queued selection lost the previous choice receipt.');
          receiptChecks += 1;
        }
        const offer = page.locator('.upgrade-button').nth(state.currentSelection.kind === 'boss' ? 3 : 0);
        if (viewport.touch) await offer.tap(); else await offer.click();
      }
      const final = await page.evaluate(() => ({ progression: window.__ROOSTER_TEST__.getProgressionState(), pause: window.__ROOSTER_TEST__.getState().pause }));
      assert(kinds.join(',') === 'level,elite,boss,level,level', 'Reward queue order changed or a choice was skipped.', kinds);
      assert(final.progression.regularChoices === 4 && !final.progression.choosingUpgrade && final.progression.queuedRewards.length === 0 && final.progression.pendingLevelUps === 0 && !final.pause.paused, 'The UI did not consume exactly the queued rewards and resume.', final);

      // Full active/passive slots, a ready primary EVO and an active synergy remain readable.
      await page.evaluate(() => {
        const scene = window.__menuGame.scene.getScene('GameScene');
        scene.player.upgradeRanks.clear(); scene.player.upgrades = []; scene.loadout.initializeStartWeapon(scene.roosterClasses.selected);
        for (const id of ['primary-storm-rank', 'storm-static-plumage', 'orbit-eggs', 'lightning-comb', 'rocket-egg', 'golden-egg', 'armor', 'critical-yolk', 'bigger-eggs']) {
          const upgrade = scene.upgradeSystem.upgrades.find((item) => item.id === id);
          const count = id === 'primary-storm-rank' ? 3 : 1;
          for (let i = 0; i < count; i += 1) {
            if (!scene.upgradeSystem.isAvailable(upgrade, scene.player)) throw new Error(`Invalid full-build fixture: ${id}`);
            scene.player.applyUpgrade(upgrade, scene);
          }
        }
        const choices = ['evo-tempest-crown', 'lightning-comb', 'rocket-egg'].map((id) => scene.upgradeSystem.upgrades.find((upgrade) => upgrade.id === id));
        if (!choices.every((upgrade) => scene.upgradeSystem.isAvailable(upgrade, scene.player))) throw new Error('Invalid full-build offers');
        scene.startLevelUp();
        scene.runState.pendingUpgradeChoices = choices.map((upgrade) => scene.upgradeSystem.presentUpgrade(upgrade, scene.player));
        scene.hud.showUpgradeChoices(scene.runState.pendingUpgradeChoices, { type: 'level' });
      });
      const fullBuild = await verifyUpgradePanel(page, viewport, 3);
      assert(await page.locator('.upgrade-button__synergy').count() > 0, 'The full-build fixture lost its active synergy information.');
      await page.locator('[data-upgrade-id="evo-tempest-crown"]').click();
      assert((await page.evaluate(() => window.__ROOSTER_TEST__.getLoadout())).evolutions.some((evo) => evo.id === 'evo-tempest-crown'), 'The actual EVO card did not apply its offered evolution.');
      assert(errors.length === 0, 'Browser errors in release menu interactions.', errors);
      results.push({ viewport, recipe, queue: kinds, panels, receiptChecks, fullBuild, keyboard: true, touch: !!viewport.touch, errors });
    } finally { await context.close(); }
  }
  return results;
}
