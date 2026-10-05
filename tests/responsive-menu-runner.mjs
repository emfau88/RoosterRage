import {
  ensureTestServer,
  loadPlaywright,
  stopTestServer
} from './helpers/test-runtime.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { projectRoot } from './helpers/test-runtime.mjs';
import { verifyUpgradePanel, verifyReleaseMenuInteractions } from './helpers/menu-release-checks.mjs';

const viewports = [
  { name: 'desktop-full-hd', width: 1920, height: 1080 },
  { name: 'laptop-large', width: 1440, height: 900 },
  { name: 'laptop-standard', width: 1366, height: 768 },
  { name: 'portal-1280', width: 1280, height: 720 },
  { name: 'portal-1216', width: 1216, height: 684 },
  { name: 'portal-1077', width: 1077, height: 606 },
  { name: 'embedded-desktop', width: 967, height: 604 },
  { name: 'desktop', width: 960, height: 540 },
  { name: 'desktop-short', width: 907, height: 510 },
  { name: 'laptop-short', width: 821, height: 462 },
  { name: 'landscape-short', width: 800, height: 450 },
  { name: 'landscape-mobile', width: 844, height: 390 },
  { name: 'boundary-wide', width: 1100, height: 700 },
  { name: 'boundary-below-wide', width: 1099, height: 699 },
  { name: 'boundary-three', width: 900, height: 600 },
  { name: 'boundary-list', width: 899, height: 601 },
  { name: 'boundary-boss-grid', width: 720, height: 600 },
  { name: 'boundary-boss-list', width: 719, height: 599 },
  { name: 'portrait', width: 390, height: 844 },
  { name: 'phone-short', width: 320, height: 568 }
];

function assert(condition, message, details) {
  if (!condition) {
    throw new Error(`${message}\n${JSON.stringify(details, null, 2)}`);
  }
}

function insideViewport(rect, viewport) {
  const tolerance = 2;
  return rect.left >= -tolerance && rect.top >= -tolerance
    && rect.right <= viewport.width + tolerance && rect.bottom <= viewport.height + tolerance;
}

async function readRect(page, selector) {
  return page.locator(selector).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height
    };
  });
}

async function verifyViewport(browser, url, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  try {
    await page.goto(`${url}?seed=responsive-${viewport.name}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.henhouse-panel');
    await page.waitForFunction(() => document.body.dataset.roosterLoadState === 'ready');
    await page.waitForFunction(() => [...document.querySelectorAll('.hub-run-card img, .hub-rooster-hero__portrait > img:first-child')].every((image) => image.complete && image.naturalWidth > 0));
    const hub = await page.evaluate(() => {
      const panel = document.querySelector('.henhouse-panel');
      const play = document.querySelector('[data-hub-view="play"]');
      const start = document.querySelector('[data-run-start]');
      const panelRect = panel.getBoundingClientRect();
      const startRect = start.getBoundingClientRect();
      return {
        panel: { left: panelRect.left, top: panelRect.top, right: panelRect.right, bottom: panelRect.bottom },
        start: { left: startRect.left, top: startRect.top, right: startRect.right, bottom: startRect.bottom },
        playClientHeight: play.clientHeight,
        playScrollHeight: play.scrollHeight,
        documentWidth: document.documentElement.scrollWidth
      };
    });
    assert(insideViewport(hub.panel, viewport) && insideViewport(hub.start, viewport),
      `${viewport.name}: Henhouse or Start Run exceeds the viewport.`, hub);
    assert(Math.abs(hub.panel.left - (viewport.width - hub.panel.right)) <= 2,
      `${viewport.name}: Henhouse is not horizontally centered.`, hub);
    if (viewport.name !== 'phone-short') {
      assert(hub.playScrollHeight <= hub.playClientHeight + 1,
        `${viewport.name}: the Play tab should remain a single-screen layout.`, hub);
    }
    assert(hub.documentWidth <= viewport.width,
      `${viewport.name}: Hub creates horizontal document overflow.`, hub);
    const playContent = await page.evaluate(() => {
      const map = document.querySelector('.hub-arena-showcase__identity').getBoundingClientRect();
      const summary = document.querySelector('.hub-run-summary').getBoundingClientRect();
      const start = document.querySelector('[data-run-start]').getBoundingClientRect();
      const controls = [...document.querySelectorAll('[data-hub-rooster], [data-rooster-picker-open]')].filter((button) => button.getBoundingClientRect().height > 0);
      return { separated: map.right <= summary.left + 1 || map.bottom <= summary.top + 1,
        controlsClear: controls.every((button) => {
          const r = button.getBoundingClientRect();
          return r.right <= start.left + 1 || r.left >= start.right - 1
            || r.bottom <= start.top + 1 || r.top >= start.bottom - 1;
        }),
        importantLoaded: [...document.querySelectorAll('.hub-run-card img, .hub-rooster-hero__portrait > img:first-child')].every((image) => image.complete && image.naturalWidth > 0) };
    });
    assert(playContent.separated && playContent.importantLoaded,
      `${viewport.name}: map identity overlaps run information or a preview failed to load.`, playContent);
    if (viewport.width < 1100 || viewport.height < 700) assert(playContent.controlsClear,
      `${viewport.name}: Start Run overlaps a rooster control.`, playContent);
    if (viewport.width <= 899) {
      await page.locator('[data-rooster-picker-open]').click();
      const picker = await readRect(page, '[data-rooster-picker]');
      assert(insideViewport(picker, viewport), `${viewport.name}: compact character picker is outside the viewport.`, picker);
      await page.locator('[data-rooster-picker] [data-hub-rooster="ace"]').click();
      assert(!await page.locator('[data-rooster-picker]').isVisible(), `${viewport.name}: compact character picker did not close after selection.`);
    }
    const hubViews = [];
    for (const view of ['play', 'roosters', 'training', 'archive']) {
      await page.locator(`[data-hub-tab="${view}"]`).click();
      const geometry = await page.evaluate((activeView) => {
        const panel = document.querySelector('.henhouse-panel');
        const section = document.querySelector(`[data-hub-view="${activeView}"]`);
        const rect = panel.getBoundingClientRect();
        return {
          view: activeView,
          top: rect.top,
          left: rect.left,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
          sectionClientHeight: section.clientHeight,
          sectionScrollHeight: section.scrollHeight
        };
      }, view);
      hubViews.push(geometry);
    }
    const heights = hubViews.map((view) => view.height);
    const tops = hubViews.map((view) => view.top);
    const leftOffsets = hubViews.map((view) => Math.abs(view.left - (viewport.width - view.right)));
    assert(Math.max(...heights) - Math.min(...heights) <= 2
      && Math.max(...tops) - Math.min(...tops) <= 2,
    `${viewport.name}: switching hub tabs must not move or resize the outer frame.`, hubViews);
    assert(leftOffsets.every((offset) => offset <= 2),
      `${viewport.name}: every hub tab must stay horizontally centered.`, hubViews);
    await page.locator('[data-hub-tab="play"]').click();
    const menuTextChecks = [];
    for (const [view, selectors] of [
      ['roosters', '.rooster-card__primary, .rooster-card__passive, .rooster-card__compact-copy > em, .rooster-card__progress, .rooster-card__choose small'],
      ['training', '.talent-node__copy small, .talent-node > b, .talent-node__frame > em, .talent-tier > header em'],
      ['archive', '.henhouse-archive-stats small, .henhouse-records small, .history-list strong, .history-list span, .lexicon-list span']
    ]) {
      await page.locator(`[data-hub-tab="${view}"]`).click();
      const texts = await page.locator(selectors).evaluateAll((elements) => elements.filter((element) => element.getBoundingClientRect().height > 0).map((element) => ({ text: element.textContent.trim(), size: parseFloat(getComputedStyle(element).fontSize) })));
      const floor = viewport.width <= 899 ? 13 : 12;
      assert(texts.length > 0 && texts.every((text) => text.size >= floor), `${viewport.name}: ${view} contains unreadable decision text.`, texts);
      menuTextChecks.push({ view, floor, checked: texts.length });
      if (view === 'training') {
        await page.locator('[data-talent]').first().click();
        await page.locator('.talent-inspector').evaluate(async (dialog) => { await Promise.all(dialog.getAnimations().map((animation) => animation.finished)); });
        const dialog = await readRect(page, '.talent-inspector');
        assert(insideViewport(dialog, viewport), `${viewport.name}: talent details leave the viewport.`, dialog);
        const detailText = await page.locator('.talent-inspector > p, .talent-inspector > header em, .talent-inspector__values small, .talent-inspector__purchase').evaluateAll((elements) => elements.map((element) => ({ text: element.textContent.trim(), size: parseFloat(getComputedStyle(element).fontSize), height: element.getBoundingClientRect().height })));
        assert(detailText.every((text) => text.size >= floor && text.height > 0), `${viewport.name}: talent details hide or shrink a cost or effect.`, detailText);
        await page.locator('.talent-inspector__purchase').scrollIntoViewIfNeeded();
        const action = await readRect(page, '.talent-inspector__purchase');
        assert(insideViewport(action, viewport) && action.height >= 44, `${viewport.name}: talent purchase is unreachable.`, action);
        await page.locator('.talent-inspector__close').click();
      }
    }
    await page.locator('[data-hub-tab="play"]').click();
    await page.evaluate(() => window.__ROOSTER_TEST__.selectRooster('ace'));
    await page.waitForFunction(() => !window.__ROOSTER_TEST__.getState().choosingRooster);
    await page.evaluate(() => window.__ROOSTER_TEST__.openSettings());
    const settings = {
      panel: await readRect(page, '.settings-panel'),
      continue: await readRect(page, '.settings-close'),
      documentWidth: await page.evaluate(() => document.documentElement.scrollWidth)
    };
    assert(insideViewport(settings.panel, viewport) && insideViewport(settings.continue, viewport),
      `${viewport.name}: Settings or Continue is outside the viewport.`, settings);
    assert(settings.documentWidth <= viewport.width,
      `${viewport.name}: Settings creates horizontal document overflow.`, settings);
    const returnButton = page.locator('[data-return-hub]');
    if (await returnButton.count()) {
      await returnButton.click();
      const returnPanel = await readRect(page, '.return-hub-panel');
      assert(insideViewport(returnPanel, viewport),
        `${viewport.name}: Return-to-Henhouse confirmation exceeds the viewport.`, returnPanel);
      await page.locator('[data-return-cancel]').click();
      await page.waitForSelector('.settings-panel');
    }
    await page.locator('.settings-panel').press('Escape');
    await page.waitForFunction(() => !window.__ROOSTER_TEST__.getState().pause?.paused);

    await page.evaluate(() => window.__ROOSTER_TEST__.startLevelUp());
    const upgradeReadability = await verifyUpgradePanel(page, viewport, 3);
    const upgrade = {
      panel: await readRect(page, '.upgrade-panel').then((rect) => rect),
      emblem: await readRect(page, '.upgrade-panel__emblem'),
      frameImage: await page.locator('.upgrade-panel__frame').first().evaluate((element) => (
        getComputedStyle(element).backgroundImage
      )),
      framePieces: await page.locator('.upgrade-panel__frame').count(),
      choices: await page.locator('.upgrade-button').evaluateAll((buttons) => buttons.map((button) => {
        const rect = button.getBoundingClientRect();
        return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
      })),
      iconArt: await page.locator('.upgrade-button__art').first().evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
          cssWidth: Number.parseFloat(getComputedStyle(element).width)
        };
      }),
      documentWidth: await page.evaluate(() => document.documentElement.scrollWidth)
    };
    assert(insideViewport(upgrade.panel, viewport),
      `${viewport.name}: the upgrade frame is outside the viewport.`, upgrade);
    assert(upgrade.documentWidth <= viewport.width,
      `${viewport.name}: Upgrade selection creates horizontal document overflow.`, upgrade);
    assert(upgrade.framePieces === 8 && upgrade.frameImage.includes('upgrade-panel-frame-v1-top.png') && upgrade.emblem.width >= 43,
      `${viewport.name}: Upgrade selection is missing its illustrated frame or title emblem.`, upgrade);
    if (viewport.width >= 1100 && viewport.height >= 700) {
      assert(upgrade.iconArt.cssWidth >= 75,
        `${viewport.name}: Upgrade artwork should use the larger desktop treatment.`, upgrade);
    }
    await page.evaluate(() => window.__ROOSTER_TEST__.resumeIfUpgradeOpen());
    await page.evaluate(() => window.__ROOSTER_TEST__.startChestReward('boss'));
    const bossReadability = await verifyUpgradePanel(page, viewport, 4);
    await page.locator('.upgrade-button').nth(3).click();
    assert(!(await page.evaluate(() => window.__ROOSTER_TEST__.getProgressionState())).choosingUpgrade,
      `${viewport.name}: selecting the fourth boss offer did not resume the game.`);

    assert(errors.length === 0, `${viewport.name}: browser errors while checking menus.`, errors);
    return { name: viewport.name, hub, hubViews, settings, upgrade, playContent, menuTextChecks, upgradeReadability, bossReadability };
  } finally {
    await page.close();
  }
}

async function run() {
  const { server, url } = await ensureTestServer();
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  try {
    const results = [];
    for (const viewport of viewports) {
      results.push(await verifyViewport(browser, url, viewport));
    }
    const interactions = await verifyReleaseMenuInteractions(browser, url);
    const artifactDir = path.join(projectRoot, 'test-results', 'package-1');
    await fs.mkdir(artifactDir, { recursive: true });
    await fs.writeFile(path.join(artifactDir, 'menus.json'), JSON.stringify({ viewports: results, interactions }, null, 2));
    console.log('Responsive menu test passed.');
    console.log(JSON.stringify({ viewportCount: results.length, interactionScenarios: interactions.length, report: path.join(artifactDir, 'menus.json') }, null, 2));
  } finally {
    await browser.close();
    await stopTestServer(server);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
