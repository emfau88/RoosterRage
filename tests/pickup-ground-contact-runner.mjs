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
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      let phaser;
      Object.defineProperty(window, 'Phaser', { configurable: true, get: () => phaser, set(value) {
        phaser = value;
        const boot = value.Game.prototype.boot;
        value.Game.prototype.boot = function(...args) { window.__groundContactGame = this; return boot.apply(this, args); };
      } });
    });
    await page.goto(`${server.url}?seed=pickup-ground-contact&arena=square-coop`);
    await page.waitForFunction(() => window.__groundContactGame?.scene.getScene('GameScene')?.player);
    await page.evaluate(() => {
      const s = window.__groundContactGame.scene.getScene('GameScene');
      s.chooseRooster('ace'); s.bot.enabled = false; s.waveSystem.active = false; s.pickups.scheduleIndex = 7;
      s.lastShotAt = Infinity; s.player.armor = 1000; s.player.regenPerSecond = 0;
    });
    const rows = [];
    for (const rooster of ['ace', 'storm', 'artillery']) {
      for (const kind of ['heal', 'bomb', 'magnet']) {
        // All paths are defined relative to the visible ground field, with
        // the original small radii. Both sides must agree on what is contact.
        for (const path of ['south-contact', 'north-contact', 'south-miss', 'north-miss', 'sprite-center']) {
          const contact = !path.endsWith('miss');
          const before = await page.evaluate(({ rooster, kind, path }) => {
            const s = window.__groundContactGame.scene.getScene('GameScene');
            s.roosterClasses.select(rooster);
            s.enemies.forEach(enemy => enemy.destroy()); s.enemies = [];
            s.pickups.items.forEach(pickup => pickup.destroy()); s.pickups.items = [];
            s.pickups.spawned[kind] = 0; s.pickups.magnetUntil = 0;
            s.player.hp = s.player.maxHp / 2;
            s.player.updateGroundMarker();
            const footOffset = s.player.groundMarker.y - s.player.sprite.y;
            const pickup = s.pickups.spawn(kind, 700, 450);
            window.__groundContactPickup = pickup;
            const reach = pickup.contactRadius + s.player.sprite.body.halfWidth;
            const distance = path.endsWith('miss') ? reach + 5 : reach - 4;
            const direction = path.startsWith('north') ? -1 : 1;
            const playerY = path === 'sprite-center'
              ? pickup.visual.y
              : pickup.field.y + direction * distance - footOffset;
            s.player.sprite.body.reset(pickup.field.x - 60, playerY);
            s.player.updateGroundMarker();
            if (kind === 'bomb') {
              window.__groundContactEnemy = s.entities.spawnEnemyAt({ ...s.waveSystem.makeSlime(),
                speed: 0, damage: 0, xpOverride: 0 }, 1000, 450);
            }
            return { count: s.pickups.collected[kind], hp: s.player.hp, maxHp: s.player.maxHp,
              reach, footOffset, ground: [pickup.field.x, pickup.field.y],
              anchor: [pickup.sprite.x, pickup.sprite.y], stopX: pickup.field.x + 60 };
          }, { rooster, kind, path });
          await page.keyboard.down('d');
          try {
            await page.waitForFunction(stopX => window.__groundContactGame.scene.getScene('GameScene').player.sprite.x >= stopX,
              before.stopX, { timeout: 3000 });
          } finally { await page.keyboard.up('d'); }
          const after = await page.evaluate(kind => {
            const s = window.__groundContactGame.scene.getScene('GameScene');
            const pickup = window.__groundContactPickup;
            return { count: s.pickups.collected[kind], active: pickup.sprite.active,
              artActive: pickup.visual.active, hp: s.player.hp, magnet: s.pickups.isMagnetActive(),
              enemyActive: kind === 'bomb' ? window.__groundContactEnemy.sprite.active : null,
              duplicate: pickup.sprite.active ? null : s.pickups.collect(pickup), error: s.debugStats.lastError };
          }, kind);
          rows.push({ rooster, kind, path, before, after });
          const label = JSON.stringify({ viewport, rooster, kind, path, before, after });
          assert.equal(after.count, before.count + Number(contact), `Incorrect ground contact: ${label}`);
          assert.equal(after.active, !contact, label);
          assert.equal(after.artActive, !contact, label);
          assert(!after.error, after.error);
          if (contact) {
            assert.equal(after.duplicate, false, label);
            if (kind === 'heal') assert.equal(after.hp, before.hp + Math.max(12, Math.round(before.maxHp * 0.25)), label);
            if (kind === 'magnet') assert(after.magnet, label);
            if (kind === 'bomb') assert.equal(after.enemyActive, false, label);
          } else {
            assert.equal(after.hp, before.hp, label);
            if (kind === 'magnet') assert.equal(after.magnet, false, label);
            if (kind === 'bomb') assert(after.enemyActive, label);
          }
        }
      }
    }
    assert.deepEqual(errors, []);
    report.push({ viewport, rows, errors });
    await page.close();
  }
  await fs.mkdir('test-results', { recursive: true });
  await fs.writeFile('test-results/pickup-ground-contact.json', JSON.stringify(report, null, 2));
  console.log('Pickup ground contact passed: 90 real crossings, all roosters and pickup kinds, desktop + portrait DPR 3, both contact edges, both near-miss edges, sprite-center crossings, immediate effects and exactly once.');
} finally { await browser.close(); await stopTestServer(server.server); }
