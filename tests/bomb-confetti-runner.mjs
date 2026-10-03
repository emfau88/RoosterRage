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
        value.Game.prototype.boot = function(...args) { window.__confettiGame = this; return boot.apply(this, args); };
      } });
    });
    await page.goto(`${server.url}?seed=bomb-confetti&arena=open-yard`);
    await page.waitForFunction(() => window.__confettiGame?.scene.getScene('GameScene')?.player);
    await page.evaluate(() => {
      const s = window.__confettiGame.scene.getScene('GameScene');
      s.chooseRooster('ace'); s.bot.enabled = false; s.waveSystem.active = false; s.pickups.scheduleIndex = 7;
      s.lastShotAt = Infinity; s.effects.set('screenFlash', false); s.effects.set('screenShake', false);
      window.__bombFxCalls = [];
      const playFx = s.playFx.bind(s);
      s.playFx = (key, ...args) => { window.__bombFxCalls.push(key); return playFx(key, ...args); };
    });
    const rows = [];
    for (const count of [12, 170, 170]) {
      const before = await page.evaluate(count => {
        const s = window.__confettiGame.scene.getScene('GameScene');
        s.enemies.forEach(e => e.destroy()); s.enemies = [];
        const cx = s.player.sprite.x, cy = s.player.sprite.y;
        const columns = count === 12 ? 4 : 17;
        for (let i = 0; i < count; i++) {
          const config = i % 3 ? s.waveSystem.makeSlime() : s.waveSystem.makeKornkrabbler();
          s.entities.spawnEnemyAt({ ...config, speed: 0, damage: 0, ability: null, aura: null, xpOverride: 0 },
            cx + (i % columns - (columns - 1) / 2) * (count === 12 ? 65 : 18),
            cy + (Math.floor(i / columns) - (count === 12 ? 1 : 4.5)) * (count === 12 ? 70 : 20));
        }
        const confetti = s.combatFeedback.bombConfetti;
        confetti.getEmitter().emitCallback = p => window.__confettiOrigins.push({ x: p.x, y: p.y, frame: p.frame.name });
        window.__confettiOrigins = [];
        const before = confetti.getState();
        s.pickups.spawned.bomb = 0;
        const p = s.pickups.spawn('bomb', cx + 200, cy + 120);
        window.__bomb = p;
        s.player.updateGroundMarker();
        const offset = s.player.groundMarker.y - s.player.sprite.y;
        s.player.sprite.body.reset(p.sprite.x, p.sprite.y - offset); s.player.updateGroundMarker();
        return { ...before, enemies: s.enemies.length, collected: s.pickups.collected.bomb };
      }, count);
      assert.equal(before.enemies, count);
      await page.waitForFunction(n => window.__confettiGame.scene.getScene('GameScene').pickups.collected.bomb === n + 1,
        before.collected, { timeout: 2000 });
      const after = await page.evaluate(() => {
        const s = window.__confettiGame.scene.getScene('GameScene'), c = s.combatFeedback.bombConfetti;
        return { ...c.getState(), enemies: s.enemies.length, origins: window.__confettiOrigins,
          poolSize: c.emitter.getParticleCount(), artActive: window.__bomb.visual.active,
          deathEchoes: s.combatFeedback.activeDeathEchoes.size, fireFx: window.__bombFxCalls };
      });
      assert.equal(after.enemies, 0);
      assert.equal(after.deathBursts - before.deathBursts, count, 'Some bomb kills received no confetti');
      assert.equal(new Set(after.origins.map(p => `${p.x}:${p.y}`)).size, count, 'Confetti did not originate at every killed enemy');
      assert(after.activeParticles <= after.limit && after.poolSize <= after.limit, 'Confetti pool exceeded its limit');
      assert(new Set(after.origins.map(p => p.frame)).size >= 5, 'Confetti lost its baked color variety');
      assert.equal(after.artActive, false);
      assert.equal(after.deathEchoes, 0, 'A bomb kill still spawned its old blast death animation');
      assert.deepEqual(after.fireFx, [], 'Bomb pickup spawned a fire explosion');
      rows.push({ count, before, after: { ...after, origins: after.origins.length } });
      if (count === 12) {
        await page.waitForTimeout(240);
        const paused = await page.evaluate(() => {
          const s = window.__confettiGame.scene.getScene('GameScene'); s.gamePause.request('confetti-pause');
          const c = s.combatFeedback.bombConfetti;
          return c.emitter.alive.map(p => [p.x, p.y, p.lifeCurrent, p.angle]);
        });
        assert(paused.length > 0);
        await page.waitForTimeout(220);
        assert.deepEqual(await page.evaluate(() => window.__confettiGame.scene.getScene('GameScene')
          .combatFeedback.bombConfetti.emitter.alive.map(p => [p.x, p.y, p.lifeCurrent, p.angle])), paused,
        'Confetti moved during pause');
        await page.screenshot({ path: `test-results/bomb-confetti-${viewport.width < 500 ? 'portrait' : 'desktop'}.png` });
        await page.evaluate(() => window.__confettiGame.scene.getScene('GameScene').gamePause.release('confetti-pause'));
      }
    }
    await page.waitForFunction(() => window.__confettiGame.scene.getScene('GameScene')
      .combatFeedback.bombConfetti.getState().activeParticles === 0, null, { timeout: 6000 });
    assert.equal(await page.evaluate(() => window.__confettiGame.scene.getScene('GameScene')
      .combatFeedback.bombConfetti.getState().activeParticles), 0, 'Expired confetti remained active');
    const ordinary = await page.evaluate(() => {
      const s = window.__confettiGame.scene.getScene('GameScene'), c = s.combatFeedback.bombConfetti;
      const before = c.deathBursts;
      const e = s.entities.spawnEnemyAt({ ...s.waveSystem.makeSlime(), speed: 0, damage: 0, xpOverride: 0 }, s.player.sprite.x + 100, s.player.sprite.y);
      s.damageEnemy(e, 99999, e.sprite.x, e.sprite.y, { source: 'rocket-egg' });
      const after = c.deathBursts;
      window.__oldEmitter = c.emitter; s.scene.restart();
      return { before, after };
    });
    assert.equal(ordinary.after, ordinary.before, 'An ordinary weapon death emitted bomb confetti');
    await page.waitForFunction(() => window.__confettiGame.scene.getScene('GameScene')?.isChoosingRooster);
    assert(await page.evaluate(() => !window.__oldEmitter.scene &&
      window.__confettiGame.scene.getScene('GameScene').combatFeedback.bombConfetti.getState().deathBursts === 0),
    'Restart retained the old emitter');
    assert.deepEqual(errors, []);
    report.push({ viewport, rows, ordinary, errors });
    await page.close();
  }
  await fs.writeFile('test-results/bomb-confetti.json', JSON.stringify(report, null, 2));
  console.log('Bomb confetti passed: every kill in 12/170/170-enemy bursts, pooled limit 512, colorful frames, frozen pause, expiry, weapon distinction and restart; desktop + portrait.');
} finally { await browser.close(); await stopTestServer(server.server); }
