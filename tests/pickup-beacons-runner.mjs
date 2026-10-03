import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureTestServer, loadPlaywright, projectRoot, stopTestServer } from './helpers/test-runtime.mjs';

const { chromium } = loadPlaywright();
const server = await ensureTestServer();
const browser = await chromium.launch();
const output = path.join(projectRoot, 'docs/qa/pickup-hit-feedback');
const errors = [];
await fs.mkdir(output, { recursive: true });
try {
  const page = await browser.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    let phaser;
    Object.defineProperty(window, 'Phaser', { configurable: true, get: () => phaser, set(value) {
      phaser = value;
      const boot = value.Game.prototype.boot;
      value.Game.prototype.boot = function(...args) { window.__beaconGame = this; return boot.apply(this, args); };
    } });
  });
  for (const [name, viewport] of [['desktop', { width: 1280, height: 830 }], ['portrait', { width: 390, height: 844 }]]) {
    await page.setViewportSize(viewport);
    await page.goto(`${server.url}?seed=pickup-beacons&arena=open-yard&profile=manual`);
    await page.waitForFunction(() => window.__ROOSTER_TEST__?.getState && window.__beaconGame);
    await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      api.selectRooster('ace'); api.disableBot(); api.pauseWaves(); api.clearEnemies(); api.clearProjectiles();
      api.setPlayerCombatModifiers({ fireRate: 100000000 });
    });
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const s = window.__beaconGame.scene.getScene('GameScene');
      const center = s.arena.getCenter();
      s.cameras.main.stopFollow(); s.cameras.main.centerOn(center.x, center.y);
      window.__beaconRefs = [];
      for (const [index, kind] of ['heal', 'bomb', 'magnet', 'elite-chest', 'golden-chest', 'royal-chest'].entries()) {
        const x = center.x + (index % 3 - 1) * 150;
        const y = center.y + (index < 3 ? -75 : 175);
        const pickup = s.pickups.spawn(kind, x, y);
        if (!pickup) throw new Error(`Could not spawn ${kind}`);
        pickup.sprite.body.reset(x, y); pickup.visual.setPosition(x, y); pickup.baseY = y;
        pickup.beam.setPosition(x, y + 12); pickup.beamCore.setPosition(x, y + 12); pickup.field.setPosition(x, y + 14);
        window.__beaconRefs.push(pickup);
      }
    });
    await page.waitForTimeout(600);
    const before = await page.evaluate(() => window.__beaconRefs.map((p) => ({
      kind: p.kind, radius: p.contactRadius, beamHeight: p.beam.displayHeight,
      sparkCount: p.beaconParticles.length, sparkY: p.beaconParticles.map((spark) => spark.y)
    })));
    await page.waitForTimeout(250);
    const after = await page.evaluate(() => window.__beaconRefs.map((p) => p.beaconParticles.map((spark) => spark.y)));
    before.forEach((p, index) => {
      assert.equal(p.radius, p.kind.includes('chest') ? 24 : { heal: 15, bomb: 11, magnet: 15 }[p.kind]);
      if (p.kind.includes('chest')) {
        assert.equal(p.sparkCount, 6);
        assert(p.sparkY.some((y, spark) => Math.abs(y - after[index][spark]) > 1), 'Chest sparkles must move');
      }
    });
    await page.screenshot({ path: path.join(output, `beacons-${name}.png`) });
    await page.evaluate(() => {
      const s = window.__beaconGame.scene.getScene('GameScene');
      s.gamePause.request('beacon-test');
      window.__pausedSparkY = window.__beaconRefs[3].beaconParticles.map((spark) => spark.y);
    });
    await page.waitForTimeout(150);
    assert(await page.evaluate(() => window.__beaconRefs[3].beaconParticles.every((spark, i) => spark.y === window.__pausedSparkY[i])),
      'Paused sparkles must stay still');
    await page.evaluate(() => {
      const s = window.__beaconGame.scene.getScene('GameScene');
      s.gamePause.release('beacon-test');
      const view = s.cameras.main.worldView;
      // Put four different types along the same edge; retain a visible health
      // pickup so it cannot mask the offscreen health target.
      for (const [index, p] of window.__beaconRefs.entries()) {
        if (index === 3 || index === 4) { p.destroy(); continue; }
        const x = view.right + 130, y = view.centerY + index * 3;
        p.sprite.body.reset(x, y); p.visual.x = x; p.baseY = y;
        p.beam.setPosition(x, y + 12); p.beamCore.setPosition(x, y + 12); p.field.setPosition(x, y + 14);
      }
      s.pickups.items = s.pickups.items.filter((p) => !p.destroyed);
      s.pickups.spawn('heal', s.player.groundMarker.x + 90, s.player.groundMarker.y);
    });
    await page.waitForFunction(() => document.querySelectorAll('.pickup-indicator:not([hidden])').length === 4);
    await page.waitForTimeout(200);
    const indicators = await page.locator('.pickup-indicator:not([hidden])').evaluateAll((nodes) => nodes.map((node) => ({
      kind: node.dataset.pickupKind, royal: node.classList.contains('is-royal'),
      iconLoaded: node.querySelector('img').complete && node.querySelector('img').naturalWidth > 0,
      distance: node.querySelector('b').textContent, box: node.getBoundingClientRect().toJSON(),
      arrowBox: node.querySelector('.pickup-indicator__arrow').getBoundingClientRect().toJSON()
    })));
    assert.deepEqual(indicators.map((i) => i.kind), ['heal', 'bomb', 'magnet', 'chest']);
    assert(indicators.find((i) => i.kind === 'chest').royal);
    assert(indicators.every((i) => i.iconLoaded), 'Every wayfinder icon must load');
    for (const entry of indicators) {
      assert(['NAH', 'WEIT', 'FERN'].includes(entry.distance));
      for (const box of [entry.box, entry.arrowBox]) {
        assert(box.left >= 0 && box.right <= viewport.width && box.top >= 68
          && box.bottom <= viewport.height - (viewport.width < 760 ? 128 : 32), JSON.stringify({ entry, viewport }));
      }
    }
    for (let i = 0; i < indicators.length; i++) for (let j = i + 1; j < indicators.length; j++) {
      const a = indicators[i].box, b = indicators[j].box;
      assert(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top, 'Four indicators overlap');
    }
    await page.screenshot({ path: path.join(output, `wayfinders-${name}.png`) });
    await page.evaluate(() => {
      const p = window.__beaconRefs[5];
      p.playChestOpening(() => p.destroy());
    });
    await page.waitForTimeout(250);
    assert(await page.evaluate(() => {
      const p = window.__beaconRefs[5];
      return p.beam.alpha === 0 && p.beaconParticles.every((spark) => spark.alpha === 0);
    }), 'Opening chest beacon must fade while gameplay is paused');
    await page.waitForTimeout(350);
    assert(await page.evaluate(() => window.__beaconRefs[5].destroyed && window.__beaconRefs[5].beaconParticles.length === 0));
    await page.evaluate(() => {
      const s = window.__beaconGame.scene.getScene('GameScene');
      s.pickups.items.forEach((p) => p.destroy()); s.pickups.items = [];
    });
    await page.waitForFunction(() => document.querySelectorAll('.pickup-indicator:not([hidden])').length === 0);
    assert(await page.evaluate(() => window.__beaconRefs.every((p) => !p.beam.active && !p.beamCore.active && p.beaconParticles.length === 0)));
  }
  assert.deepEqual(errors, []);
  console.log('Pickup beacons passed: Harvest Yard desktop/portrait, four visible wayfinders, visible same-type target, moving/paused chest sparkles, opening fade and complete cleanup.');
} finally {
  await browser.close();
  await stopTestServer(server.server);
}
