import assert from 'node:assert/strict';
import { ensureTestServer, loadPlaywright, stopTestServer } from './helpers/test-runtime.mjs';

const { chromium } = loadPlaywright();
const server = await ensureTestServer();
const browser = await chromium.launch();
const errors = [];

try {
  const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    let phaser;
    Object.defineProperty(window, 'Phaser', { configurable: true, get: () => phaser, set(value) {
      phaser = value;
      const boot = value.Game.prototype.boot;
      value.Game.prototype.boot = function(...args) { window.__indicatorGame = this; return boot.apply(this, args); };
    } });
  });
  await page.goto(`${server.url}?seed=pickup-indicators&arena=square-coop&profile=manual`);
  await page.waitForFunction(() => window.__ROOSTER_TEST__?.getState && window.__indicatorGame);
  await page.evaluate(() => {
    const api = window.__ROOSTER_TEST__;
    api.selectRooster('ace'); api.disableBot(); api.pauseWaves(); api.clearEnemies(); api.clearProjectiles();
    api.movePlayerTo(700, 450);
  });

  for (const viewport of [{ width: 960, height: 720 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const targets = await page.evaluate(() => {
      const s = window.__indicatorGame.scene.getScene('GameScene');
      s.pickups.items.forEach((pickup) => pickup.destroy());
      s.pickups.items = [];
      for (const kind of ['heal', 'bomb', 'magnet']) s.pickups.spawned[kind] = 0;
      s.cameras.main.stopFollow();
      s.cameras.main.centerOn(700, 450);
      s.player.sprite.body.reset(700, 450);
      s.player.updateGroundMarker();
      const view = s.cameras.main.worldView;
      const positions = [
        ['heal', Math.max(90, view.x - 70), 390],
        ['bomb', Math.min(1310, view.right + 70), 450],
        ['magnet', Math.max(90, view.x - 70), 520]
      ];
      return positions.map(([kind, x, y]) => s.pickups.spawn(kind, x, y)?.kind);
    });
    assert.deepEqual(targets, ['heal', 'bomb', 'magnet']);
    await page.waitForFunction(() => document.querySelectorAll('.pickup-indicator:not([hidden])').length === 3);
    const positions = await page.locator('.pickup-indicator:not([hidden])').evaluateAll((nodes) => nodes.map((node) => ({
      kind: node.dataset.pickupKind,
      tier: Number(node.dataset.distanceTier),
      box: node.getBoundingClientRect().toJSON()
    })));
    assert.equal(positions.length, 3);
    for (const entry of positions) {
      assert(entry.tier >= 1 && entry.tier <= 3);
      assert(entry.box.top >= (viewport.width < 760 ? 86 : 68));
      assert(entry.box.bottom <= viewport.height - (viewport.width < 760 ? 128 : 32));
    }
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const a = positions[i].box, b = positions[j].box;
        assert(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top,
          `Overlapping pickup indicators at ${viewport.width}px`);
      }
    }
    await page.evaluate(() => {
      const s = window.__indicatorGame.scene.getScene('GameScene');
      const view = s.cameras.main.worldView;
      const replacement = s.pickups.spawn('heal', Math.min(1310, view.right + 180), 390);
      if (!replacement) throw new Error('Could not spawn replacement health pickup');
      const original = s.pickups.items.find((pickup) => pickup.kind === 'heal' && pickup !== replacement);
      original.destroy();
      s.pickups.items = s.pickups.items.filter((pickup) => pickup !== original);
    });
    await page.waitForFunction(() => {
      const node = document.querySelector('.pickup-indicator--heal');
      return !node.hidden && Number.parseFloat(node.style.left) > window.innerWidth / 2;
    });
    await page.evaluate(() => {
      const s = window.__indicatorGame.scene.getScene('GameScene');
      s.player.hp = s.player.maxHp - 10;
      const heal = s.pickups.items.find((pickup) => pickup.kind === 'heal');
      s.cameras.main.centerOn(heal.sprite.x, heal.sprite.y);
    });
    try {
      await page.waitForFunction(() => document.querySelector('.pickup-indicator--heal').hidden);
    } catch (error) {
      console.log(await page.evaluate(() => {
        const s = window.__indicatorGame.scene.getScene('GameScene');
        return { view: s.cameras.main.worldView, pickups: s.pickups.getState(), state: window.__ROOSTER_TEST__.getState() };
      }));
      throw error;
    }
    await page.evaluate(() => window.__indicatorGame.scene.getScene('GameScene').cameras.main.centerOn(700, 450));
    await page.waitForFunction(() => document.querySelectorAll('.pickup-indicator:not([hidden])').length === 3);
    assert(await page.locator('.pickup-indicator--heal').evaluate((node) => node.classList.contains('is-urgent')));
    await page.evaluate(() => window.__indicatorGame.scene.getScene('GameScene').gamePause.request('indicator-test'));
    await page.waitForFunction(() => document.querySelectorAll('.pickup-indicator:not([hidden])').length === 0);
    await page.evaluate(() => window.__indicatorGame.scene.getScene('GameScene').gamePause.release('indicator-test'));
    await page.waitForFunction(() => document.querySelectorAll('.pickup-indicator:not([hidden])').length === 3);
    await page.evaluate(() => {
      const s = window.__indicatorGame.scene.getScene('GameScene');
      s.pickups.items.forEach((pickup) => pickup.destroy());
      s.pickups.items = [];
    });
    await page.waitForFunction(() => document.querySelectorAll('.pickup-indicator:not([hidden])').length === 0);
  }
  await page.evaluate(() => window.__indicatorGame.scene.getScene('GameScene').scene.restart());
  await page.waitForFunction(() => document.querySelectorAll('.pickup-indicators').length === 1
    && window.__ROOSTER_TEST__?.getState);
  assert.equal(await page.locator('.pickup-indicator:not([hidden])').count(), 0);
  assert.deepEqual(errors, []);
  console.log('Pickup indicators passed: three types, desktop/portrait safe area, separation, target switching, camera movement, low-HP highlight, pause and restart cleanup.');
} finally {
  await browser.close();
  await stopTestServer(server.server);
}
