import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'docs/qa/portal-refinements');
const dist = path.join(root, 'dist-release');
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.webp':'image/webp', '.png':'image/png', '.mp3':'audio/mpeg' };
const assert = (value, message, details) => { if (!value) throw new Error(`${message}\n${JSON.stringify(details)}`); };
await fs.mkdir(output, { recursive: true });
const save = JSON.parse(await fs.readFile(path.join(root, 'docs/qa/portal-package-0/advanced-save.json'), 'utf8'));
const originalGeometry = JSON.parse(await fs.readFile(path.join(root, 'docs/qa/portal-package-2/combat-checks.json'), 'utf8')).geometry;
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = path.resolve(dist, `.${pathname === '/' ? '/index.html' : pathname}`);
    const relative = path.relative(dist, file);
    if (relative.startsWith('..') || path.isAbsolute(relative)) { response.writeHead(403).end(); return; }
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream' });
    response.end(await fs.readFile(file));
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch();
const cases = [], geometry = [], screenshots = [];
const shot = async (page, name) => {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(output, `${name}.png`) }); screenshots.push(name);
};
async function open(viewport, state = save, arena = 'open-yard') {
  const context = await browser.newContext({ viewport, hasTouch: viewport.width < 900, deviceScaleFactor: viewport.width === 390 ? 2 : 1 });
  await context.addInitScript(state => {
    if (state) localStorage.setItem('rooster-rage:meta:v2', JSON.stringify(state));
    let phaser;
    Object.defineProperty(window, 'Phaser', { configurable:true, get:() => phaser, set(value) {
      phaser = value; const boot = value.Game.prototype.boot;
      value.Game.prototype.boot = function (...args) { window.__refinementGame = this; return boot.apply(this, args); };
    } });
  }, state);
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto(`${url}?seed=combat-geometry&arena=${arena}`);
  await page.waitForSelector('.henhouse-panel');
  await page.waitForFunction(() => document.body.dataset.roosterLoadState === 'ready');
  assert(!await page.evaluate(() => !!window.__ROOSTER_TEST__), 'Test API shipped in release');
  return { context, page, errors };
}
try {
  for (const viewport of [{width:1440,height:900}, {width:960,height:540}, {width:844,height:390}, {width:736,height:360}, {width:640,height:360}, {width:390,height:844}, {width:320,height:568}]) {
    const { context, page, errors } = await open(viewport);
    await page.locator('[data-hub-tab="roosters"]').click();
    const cards = await page.evaluate(() => {
      const rect = element => { const r = element.getBoundingClientRect(); return { top:r.top, bottom:r.bottom, height:r.height }; };
      return [...document.querySelectorAll('.rooster-entry')].map(entry => ({ card:rect(entry.querySelector('.rooster-card')), select:rect(entry.querySelector('.rooster-card__choose')),
        rows:[...entry.querySelectorAll('.rooster-card__stats, .rooster-card__primary, .rooster-card__passive, .rooster-card__mastery, .rooster-card__progress')].map(rect) }));
    });
    assert(Math.max(...cards.map(card => card.card.height)) - Math.min(...cards.map(card => card.card.height)) <= 1, 'Character cards have unequal heights', {viewport,cards});
    if (viewport.width > 760) {
      assert(Math.max(...cards.map(card => card.select.top)) - Math.min(...cards.map(card => card.select.top)) <= 1, 'Selection actions are not aligned', cards);
      for (let row = 0; row < 5; row++) assert(Math.max(...cards.map(card => card.rows[row].top)) - Math.min(...cards.map(card => card.rows[row].top)) <= 1, 'Character information rows are not aligned', cards);
    }
    await shot(page, `roosters-${viewport.width}`);
    await page.locator('.rooster-card--storm').click();
    assert(await page.locator('.cosmetic-panel:not([hidden])').count() === 1 && await page.locator('.cosmetic-panel:not([hidden])').getAttribute('data-rooster-id') === 'storm', 'Wrong cosmetics shown for inspected character');
    if (viewport.width <= 760) {
      assert((await page.locator('.rooster-inspector').innerText()).includes('Static Chain'), 'Shared character details missing');
      await shot(page, `rooster-details-${viewport.width}`);
    }
    await page.locator('.rooster-card--artillery + .rooster-card__choose').click();
    await page.locator('[data-run-start]').click();
    await page.evaluate(() => {
      const s = window.__refinementGame.scene.getScene('GameScene');
      s.gamePause.request('refinement-fixture'); s.player.level = 6; s.startLevelUp();
      const offers = ['primary-artillery-rank', 'artillery-reinforced-breech', 'rocket-egg'].map(id => s.upgradeSystem.upgrades.find(upgrade => upgrade.id === id));
      if (!offers.every(offer => s.upgradeSystem.isAvailable(offer, s.player))) throw new Error('Unavailable fixture offer');
      s.runState.pendingUpgradeChoices = offers.map(offer => s.upgradeSystem.presentUpgrade(offer, s.player));
      s.hud.showUpgradeChoices(s.runState.pendingUpgradeChoices, {type:'level',canReroll:true});
    });
    await page.locator('.upgrade-panel').evaluate(async element => { await Promise.all(element.getAnimations().map(animation => animation.finished)); });
    const compact = viewport.width >= 600 && viewport.width > viewport.height && viewport.height <= 500;
    const offers = await page.evaluate(() => {
      const panel = document.querySelector('.upgrade-panel'), body = panel.querySelector('.upgrade-panel__body'), r = body.getBoundingClientRect();
      return { body:{top:r.top,bottom:r.bottom}, scrollHeight:body.scrollHeight, clientHeight:body.clientHeight,
        cards:[...panel.querySelectorAll('.upgrade-offer')].map(element => {const c=element.getBoundingClientRect();return {top:c.top,bottom:c.bottom};}) };
    });
    if (compact) assert(offers.cards.every(card => card.top >= offers.body.top - 1 && card.bottom <= offers.body.bottom + 1), 'Three upgrade offers need scrolling', {viewport,offers});
    await shot(page, `upgrades-${viewport.width}`);
    if (compact) {
      for (let index = 0; index < 3; index++) {
        const before = await page.evaluate(() => JSON.stringify(window.__refinementGame.scene.getScene('GameScene').runState.pendingUpgradeChoices));
        await page.locator('.upgrade-offer__details').nth(index).tap();
        assert(await page.locator('.upgrade-detail__card .upgrade-button__rank').isVisible(), 'Detail rank hidden');
        if (index === 0) {
          assert(await page.locator('.upgrade-detail .upgrade-button__evolution-hint').isVisible(), 'Complete EVO recipe missing');
          await shot(page, `upgrade-details-${viewport.width}`);
        }
        assert(await page.evaluate(() => JSON.stringify(window.__refinementGame.scene.getScene('GameScene').runState.pendingUpgradeChoices)) === before, 'Detail view changes offers');
        await page.keyboard.press('Tab');
        assert(await page.locator('.upgrade-detail__select').evaluate(element => document.activeElement === element), 'Tab escaped the detail view');
        await page.keyboard.press('Tab');
        assert(await page.locator('[data-upgrade-detail-close]').evaluate(element => document.activeElement === element), 'Detail focus did not wrap');
        await page.keyboard.press('Escape');
        assert(await page.locator('.upgrade-offer__details').nth(index).evaluate(element => document.activeElement === element), 'Detail return lost focus');
      }
      await page.locator('.reroll-button').tap();
      assert(await page.evaluate(() => window.__refinementGame.scene.getScene('GameScene').runState.rerollsRemaining === 0), 'Reroll did not consume one charge');
      await page.locator('.upgrade-offer__details').first().tap();
      const selection = await page.evaluate(() => {const s=window.__refinementGame.scene.getScene('GameScene'), id=s.runState.pendingUpgradeChoices[0].id;return {id,rank:s.player.getUpgradeRank(id)};});
      await page.locator('.upgrade-detail__select').tap();
      assert(await page.evaluate(({id,rank}) => {const s=window.__refinementGame.scene.getScene('GameScene');return !s.isChoosingUpgrade && s.player.getUpgradeRank(id) === rank+1;}, selection), 'Selecting from details did not apply exactly once');
    } else await page.locator('.upgrade-button').first().click();
    await page.evaluate(() => window.__refinementGame.scene.getScene('GameScene').runState.startChestReward('boss'));
    await page.locator('.upgrade-panel').evaluate(async element => { await Promise.all(element.getAnimations().map(animation => animation.finished)); });
    if (compact) {
      const full = await page.evaluate(() => { const body=document.querySelector('.upgrade-panel__body'), b=body.getBoundingClientRect();return [...document.querySelectorAll('.upgrade-offer')].every(element=>{const r=element.getBoundingClientRect();return r.top>=b.top-1&&r.bottom<=b.bottom+1;});});
      assert(full, 'Four boss rewards need scrolling', viewport);
    }
    await shot(page, `boss-rewards-${viewport.width}`);
    await page.locator('.upgrade-button').nth(3).click();
    assert(await page.evaluate(() => !window.__refinementGame.scene.getScene('GameScene').isChoosingUpgrade), 'Fourth boss offer did not close selection');
    assert(!errors.length, 'Browser errors', errors);
    cases.push({viewport,cards,compact,offers,errors});
    await context.close();
  }
  for (const viewport of [{width:844,height:390}, {width:390,height:844}]) {
    const {context,page,errors} = await open(viewport, save, 'vertical-run');
    await page.locator('[data-run-start]').click();
    await page.evaluate(() => {const s=window.__refinementGame.scene.getScene('GameScene');s.gamePause.request('shadow-fixture');s.hud.combatMessages.clear();s.player.sprite.setFrame(0);s.player.updateGroundMarker();});
    for (const rooster of ['ace','artillery','storm']) {
      const measure = await page.evaluate(rooster => {
        const s=window.__refinementGame.scene.getScene('GameScene');s.roosterClasses.select(rooster);s.player.sprite.anims.pause();s.player.sprite.setFrame(0);s.player.updateGroundMarker();s.updateHud();
        const p=s.player, canvas=s.game.canvas, source=s.textures.get('player-contact-shadow').getSourceImage(), ctx=source.getContext('2d');
        return {rooster,scale:p.baseScale,zoom:s.cameras.main.zoom,cssPerRenderPixel:canvas.getBoundingClientRect().height/canvas.height,radius:p.sprite.body.radius*p.sprite.scaleX,
          shadow:{texture:p.groundMarker.texture.key,width:p.groundMarker.displayWidth,height:p.groundMarker.displayHeight,depth:p.groundMarker.depth,center:[...ctx.getImageData(64,32,1,1).data],corner:[...ctx.getImageData(0,0,1,1).data]},hasWorldHp:!!(p.hpBarBack||p.hpBarFill||p.hpBarBorder)};
      },rooster);
      const previous=originalGeometry.find(row=>row.viewport.width===viewport.width&&row.rooster===rooster);
      assert(previous && Math.abs(measure.radius-previous.radius)<0.001 && Math.abs(measure.scale-previous.scale)<0.001 && Math.abs(measure.zoom*measure.cssPerRenderPixel-previous.zoom*previous.cssPerRenderPixel)<0.001, 'Point 4 camera, figure scale or collision changed', measure);
      assert(!measure.hasWorldHp && measure.shadow.corner[3]===0 && measure.shadow.center[0]>measure.shadow.center[1] && measure.shadow.depth<6, 'Shadow is not a soft warm ground contact', measure);
      geometry.push({viewport,...measure});
      await shot(page, `shadow-${viewport.width}-${rooster}`);
    }
    assert(!errors.length, 'Ground-contact errors', errors);
    await context.close();
  }
  const {context,page,errors}=await open({width:390,height:844},null);
  await page.locator('[data-hub-tab="roosters"]').click();
  await page.locator('.rooster-card--storm').tap();
  assert(await page.locator('.rooster-card--storm + .rooster-card__choose').isDisabled(), 'Locked preview allowed selection');
  assert((await page.locator('.rooster-inspector').innerText()).includes('Locked:'), 'Locked preview lost unlock condition');
  await shot(page,'locked-rooster-details-390');
  assert(!errors.length, 'Locked-character errors', errors);
  await context.close();
  const sourceFiles=['src/entities/Player.js','src/systems/assets/PlayerContactShadow.js','src/ui/HUD.js','src/menu-layouts.css','src/scenes/GameScene.js','src/systems/RoosterClassSystem.js'];
  const sourceHashes=Object.fromEntries(await Promise.all(sourceFiles.map(async file=>[file,crypto.createHash('sha256').update(await fs.readFile(path.join(root,file))).digest('hex')])));
  await fs.writeFile(path.join(output,'checks.json'),JSON.stringify({generatedAt:new Date().toISOString(),cases,geometry,screenshots,sourceHashes},null,2)+'\n');
  console.log(JSON.stringify({productionCases:cases.length,geometryCases:geometry.length,screenshots:screenshots.length,point4Unchanged:true}));
} finally {
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
