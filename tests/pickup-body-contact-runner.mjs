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
        value.Game.prototype.boot = function(...args) { window.__bodyContactGame = this; return boot.apply(this, args); };
      } });
    });
    await page.goto(`${server.url}?seed=pickup-body-contact&arena=square-coop`);
    for (const rooster of ['ace', 'storm', 'artillery']) {
      // Reuse the browser and restart the real scene between runs. On the
      // second run, health stays first in the array through all four pickups.
      for (const fullHp of [false, true]) {
        await page.waitForFunction(() => window.__bodyContactGame?.scene.getScene('GameScene')?.isChoosingRooster);
        await page.evaluate(({ rooster, fullHp }) => {
          const s = window.__bodyContactGame.scene.getScene('GameScene');
          s.chooseRooster('ace'); s.roosterClasses.select(rooster);
          s.bot.enabled = false; s.waveSystem.active = false; s.pickups.scheduleIndex = 7;
          s.lastShotAt = Infinity; s.player.armor = 1000; s.player.regenPerSecond = 0;
          s.player.hp = fullHp ? s.player.maxHp : s.player.maxHp / 2;
          s.player.sprite.body.reset(620, 400); s.player.updateGroundMarker();
          window.__leftHealth = s.pickups.spawn('heal', 700, 450);
          window.__contactEffects = [];
          const collect = s.pickups.collect.bind(s.pickups);
          s.pickups.collect = function(pickup) {
            const body = s.player.sprite.body;
            const targetBody = pickup?.sprite.body;
            const contact = targetBody ? { kind: pickup.kind,
              footDistance: Math.hypot(s.player.groundMarker.x - pickup.field.x, s.player.groundMarker.y - pickup.field.y),
              footReach: pickup.contactRadius + body.halfWidth,
              bodyDistance: Math.hypot(body.center.x - targetBody.center.x, body.center.y - targetBody.center.y),
              bodyReach: body.halfWidth + targetBody.halfWidth } : {};
            const result = collect(pickup);
            if (result) window.__contactEffects.push(contact);
            return result;
          };
        }, { rooster, fullHp });
        const rows = [];
        for (const [index, kind] of ['heal', 'magnet', 'bomb', 'bomb', 'magnet'].entries()) {
          const before = await page.evaluate(({ index, kind }) => {
            const s = window.__bodyContactGame.scene.getScene('GameScene');
            const pickup = index === 0 ? window.__leftHealth : s.pickups.spawn(kind, 700, 450);
            window.__bodyTarget = pickup;
            s.player.updateGroundMarker();
            const footOffset = s.player.groundMarker.y - s.player.sprite.y;
            // Same real crossing: early heal/magnet are inside the foot check,
            // both bombs are outside it. Fifth pickup tests body-only magnet.
            const footDistance = index === 4 ? 15 + s.player.sprite.body.halfWidth + 5
              : 11 + s.player.sprite.body.halfWidth + 2;
            s.player.sprite.body.reset(pickup.field.x - 80, pickup.field.y + footDistance - footOffset);
            s.player.updateGroundMarker();
            if (kind === 'bomb') window.__bombVictim = s.entities.spawnEnemyAt({ ...s.waveSystem.makeSlime(),
              speed: 0, damage: 0, xpOverride: 0 }, 1000, 450);
            if (kind === 'magnet') {
              // Expire the previous effect, so the fifth pickup must activate
              // its own magnet. This is not a reset of the pickup collection.
              s.pickups.magnetUntil = 0;
              s.entities.spawnXp(1100, 600, 1);
            }
            return { count: s.pickups.collected[kind], hp: s.player.hp, xp: s.debugStats.xpCollected,
              stopX: pickup.field.x + 80, footDistance, footReach: pickup.contactRadius + s.player.sprite.body.halfWidth };
          }, { index, kind });
          await page.keyboard.down('d');
          try {
            await page.waitForFunction(stopX => window.__bodyContactGame.scene.getScene('GameScene').player.sprite.x >= stopX,
              before.stopX, { timeout: 4000 });
          } finally { await page.keyboard.up('d'); }
          if (kind === 'magnet') await page.waitForFunction(xp => window.__bodyContactGame.scene.getScene('GameScene').debugStats.xpCollected > xp,
            before.xp, { timeout: 3000 }).catch(() => {});
          const after = await page.evaluate(kind => {
            const s = window.__bodyContactGame.scene.getScene('GameScene');
            return { count: s.pickups.collected[kind], active: window.__bodyTarget.sprite.active,
              artActive: window.__bodyTarget.visual.active, healthActive: window.__leftHealth.sprite.active,
              hp: s.player.hp, xp: s.debugStats.xpCollected, magnet: s.pickups.isMagnetActive(),
              enemyActive: kind === 'bomb' ? window.__bombVictim.sprite.active : null,
              effects: [...window.__contactEffects], error: s.debugStats.lastError };
          }, kind);
          const contact = kind !== 'heal' || !fullHp;
          rows.push({ index, kind, before, after });
          const label = JSON.stringify({ viewport, rooster, fullHp, index, kind, before, after });
          assert.equal(after.count, before.count + Number(contact), `Missed body contact: ${label}`);
          assert.equal(after.active, !contact, label);
          assert.equal(after.artActive, !contact, label);
          assert.equal(after.healthActive, fullHp, label);
          if (kind === 'heal' && !fullHp) assert(after.hp > before.hp, label);
          if (kind === 'bomb') assert.equal(after.enemyActive, false, label);
          if (kind === 'magnet') assert(after.magnet && after.xp > before.xp, label);
          if (kind === 'bomb' || index === 4) {
            const effect = after.effects.at(-1);
            assert(effect.footDistance > effect.footReach, `Regression path no longer isolates body contact: ${label}`);
            assert(effect.bodyDistance <= effect.bodyReach + 0.2, label);
          }
          assert(!after.error, after.error);
        }
        const retainedHealth = await page.evaluate(async fullHp => {
          const s = window.__bodyContactGame.scene.getScene('GameScene');
          if (fullHp) {
            s.player.hp = s.player.maxHp - 10;
            s.player.sprite.body.reset(700, 457);
            await new Promise(resolve => setTimeout(resolve, 180));
          }
          return { collected: { ...s.pickups.collected }, active: window.__leftHealth.sprite.active,
            hp: s.player.hp, maxHp: s.player.maxHp };
        }, fullHp);
        assert.equal(retainedHealth.active, false);
        assert.equal(retainedHealth.collected.heal, 1);
        if (fullHp) assert.equal(retainedHealth.hp, retainedHealth.maxHp);
        assert.deepEqual(errors, []);
        report.push({ viewport, rooster, fullHp, rows, retainedHealth });
        await page.evaluate(() => {
          const s = window.__bodyContactGame.scene.getScene('GameScene');
          s.scene.restart();
        });
      }
    }
    await page.close();
  }
  await fs.mkdir('test-results', { recursive: true });
  await fs.writeFile('test-results/pickup-body-contact.json', JSON.stringify(report, null, 2));
  console.log('Pickup body contact passed: 60 real crossings, 12 sequential runs, all roosters, desktop + portrait, two bombs, fifth-item XP magnet, retained full-HP health and scene restarts.');
} finally { await browser.close(); await stopTestServer(server.server); }
