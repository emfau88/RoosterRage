import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { ensureTestServer, loadPlaywright, stopTestServer } from './helpers/test-runtime.mjs';

const server = await ensureTestServer();
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const report = [];
try {
  for (const viewport of [{ width: 1280, height: 830 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: viewport.width < 500 ? 3 : 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      let phaser;
      Object.defineProperty(window, 'Phaser', { configurable: true, get: () => phaser, set(value) {
        phaser = value;
        const boot = value.Game.prototype.boot;
        value.Game.prototype.boot = function(...args) { window.__sequenceGame = this; return boot.apply(this, args); };
      } });
    });
    await page.goto(`${server.url}?seed=pickup-sequence&arena=open-yard`);
    await page.waitForFunction(() => window.__sequenceGame?.scene.getScene('GameScene')?.player);
    await page.evaluate(() => {
      const s = window.__sequenceGame.scene.getScene('GameScene');
      s.chooseRooster('ace'); s.bot.enabled = false; s.waveSystem.active = false; s.pickups.scheduleIndex = 7;
      s.player.armor = 1000; s.player.regenPerSecond = 0;
      // Use obstacle-free points inside the active window. A line extending
      // past its edge gets clamped and can stack multiple test pickups.
      const points = [{ x: s.player.sprite.x, y: s.player.sprite.y }];
      window.__sequenceItems = ['heal', 'magnet', 'bomb', 'heal', 'magnet', 'bomb'].map((kind, i) => {
        for (let attempt = 0; attempt < 200; attempt++) {
          const p = s.arena.findSafePoint(`sequence-${i}`, 130);
          if (points.some(other => Math.hypot(other.x - p.x, other.y - p.y) < 200)) continue;
          points.push(p);
          return s.pickups.spawn(kind, p.x, p.y);
        }
        throw new Error(`Could not place isolated pickup ${i}`);
      });
    });
    const rows = [];
    for (let i = 0; i < 6; i++) {
      if (i === 3) {
        await page.evaluate(() => {
          const s = window.__sequenceGame.scene.getScene('GameScene');
          s.waveSystem.currentWave = 8;
          for (const id of ['primary-ace-rank','primary-ace-rank','primary-ace-rank','ace-deadeye-drill','evo-sunshot-array',
            'molotov-egg','molotov-egg','molotov-egg','molotov-egg','regen','evo-phoenix-pan',
            'lightning-comb','lightning-comb','lightning-comb','lightning-comb','evo-tempest-comb']) {
            const u = s.upgradeSystem.upgrades.find(u => u.id === id);
            if (u) s.player.applyUpgrade(u, s);
          }
          s.player.regenPerSecond = 0;
          for (let n = 0; n < 60; n++) {
            const angle = n / 60 * Math.PI * 2;
            s.entities.spawnEnemyAt({ ...s.waveSystem.makeSlime(), hp: 99999, damage: 0, speed: 0, xpOverride: 0 },
              s.player.sprite.x + Math.cos(angle) * 240, s.player.sprite.y + Math.sin(angle) * 240);
          }
        });
        await page.waitForTimeout(3000);
      }
      const before = await page.evaluate(i => {
        const s = window.__sequenceGame.scene.getScene('GameScene'), p = window.__sequenceItems[i];
        if (!p.sprite.active) throw new Error(`Item ${i} disappeared before intentional contact`);
        s.player.hp = s.player.maxHp / 2;
        s.player.updateGroundMarker();
        const offset = s.player.groundMarker.y - s.player.sprite.y;
        // Keep existing pickups and group members throughout the full sequence.
        s.player.sprite.body.reset(p.sprite.x - 80, p.sprite.y - offset);
        s.player.updateGroundMarker();
        return { kind: p.kind, count: s.pickups.collected[p.kind], hp: s.player.hp,
          ageMs: s.time.now - p.spawnedAt, ground: [p.sprite.x, p.sprite.y] };
      }, i);
      await page.keyboard.down('d');
      await page.waitForFunction(({ i, before }) => {
        const s = window.__sequenceGame.scene.getScene('GameScene');
        return s.pickups.collected[before.kind] > before.count && !window.__sequenceItems[i].sprite.active;
      }, { i, before }, { timeout: 2000 });
      await page.keyboard.up('d');
      const after = await page.evaluate(({i,before}) => {
        const s = window.__sequenceGame.scene.getScene('GameScene');
        return { count: s.pickups.collected[before.kind], hp: s.player.hp, magnet: s.pickups.isMagnetActive(),
          artActive: window.__sequenceItems[i].visual.active, renderer: s.game.renderer.type, error: s.debugStats.lastError };
      }, { i, before });
      assert.equal(after.count, before.count + 1);
      assert.equal(after.artActive, false);
      if (before.kind === 'heal') assert(after.hp > before.hp, 'Healing was deferred');
      if (before.kind === 'magnet') assert(after.magnet, 'Magnet activation was deferred');
      assert(!after.error, after.error);
      rows.push({ stage: i < 3 ? 'early' : 'late', before, after });
    }
    assert.deepEqual(errors, []);
    report.push({ viewport, rows, errors });
    await page.close();
  }
  await fs.writeFile('test-results/pickup-sequence.json', JSON.stringify(report, null, 2));
  console.log('Sequential pickups passed: Ace, Harvest Yard, desktop + mobile DPR 3, 6 existing items each, early + late combat, immediate effects and removed artwork.');
} finally { await browser.close(); await stopTestServer(server.server); }
