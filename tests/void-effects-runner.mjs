import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { ensureTestServer, loadPlaywright, stopTestServer } from './helpers/test-runtime.mjs';

const out = 'test-results/void-effects';
await fs.mkdir(out, { recursive: true });
const server = await ensureTestServer(), browser = await loadPlaywright().chromium.launch({ headless: true });
const reports = [];
try {
  for (const renderer of ['WEBGL', 'CANVAS']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }), errors = [];
    page.on('pageerror', e => errors.push(e.stack ?? e.message));
    page.on('requestfailed', r => errors.push(`${r.url()}: ${r.failure()?.errorText}`));
    await page.addInitScript(renderer => {
      let phaser;
      Object.defineProperty(window, 'Phaser', { configurable: true, get: () => phaser, set(value) {
        phaser = value; const boot = value.Game.prototype.boot;
        value.Game.prototype.boot = function(...args) { this.config.renderType = value[renderer]; window.__voidGame = this; return boot.apply(this, args); };
      } });
    }, renderer);
    await page.goto(`${server.url}?arena=open-yard&seed=void-approved&profile=manual`);
    await page.waitForFunction(() => window.__voidGame?.scene.getScene('GameScene')?.player);
    await page.evaluate(async () => {
      const s = window.__s = window.__voidGame.scene.getScene('GameScene');
      s.chooseRooster('ace'); s.waveSystem.active = false; s.bot.enabled = false; s.lastShotAt = Infinity;
      s.player.hp = s.player.maxHp = 999999;
      s.enemies.forEach(e => e.destroy()); s.enemies = [];
      window.__delay = ms => new Promise(resolve => s.time.delayedCall(ms, resolve));
      window.__Void = (await import('/src/entities/VoidZone.js')).VoidZone;
      window.__PreviousVoid = (await import('/docs/qa/void-effects-study/current-void-zone.js')).VoidZone;
    });
    // Compare gameplay with the actual preceding implementation at every rank and with the Molotov synergy.
    const parity = await page.evaluate(() => {
      const s = window.__s, results = [];
      const baseline = s.children.list.length, shutdownListeners = s.events.listenerCount('shutdown');
      for (const synergy of [false, true]) for (let stage = 1; stage <= 5; stage++) {
        const outcomes = [window.__PreviousVoid, window.__Void].map(Zone => {
          const mock = Object.create(s), hits = [];
          mock.molotovEgg = { rank: synergy ? 1 : 0 }; mock.time = { now: 0 };
          mock.enemies = [5, 30, 100, 145, 230].map((x, id) => ({ id, hp: 10000, sprite: { x, y: id % 2 ? 14 : 0, active: true } }));
          mock.damageEnemy = (enemy, damage) => { enemy.hp -= damage; hits.push([mock.time.now, enemy.id, damage]); };
          const z = new Zone(mock, 0, 0, Math.min(4, stage), stage === 5);
          const config = { radius: z.radius, damage: z.damage, maxLife: z.maxLife, tickMs: z.tickMs, pullOuter: z.pullOuter, pullInner: z.pullInner };
          while (z.active) {
            mock.time.now += 20; mock.pendingVoidPulls = new Map(); z.update(20);
            mock.pendingVoidPulls.forEach(({ enemy, x, y }) => { enemy.sprite.x += x; enemy.sprite.y += y; });
          }
          return { config, hits, enemies: mock.enemies.map(e => [e.hp, e.sprite.x, e.sprite.y]), endedAt: mock.time.now };
        });
        results.push({ stage, synergy, equal: JSON.stringify(outcomes[0]) === JSON.stringify(outcomes[1]), config: outcomes[1].config, ticks: outcomes[1].hits.length });
      }
      return { results, objectsClean: s.children.list.length === baseline, listenersClean: s.events.listenerCount('shutdown') === shutdownListeners };
    });
    assert(parity.results.every(r => r.equal), 'Damage, pull, tick timing or expiry changed');
    assert(parity.objectsClean && parity.listenersClean, 'Expired zones leaked objects/listeners');

    const lifecycle = await page.evaluate(async () => {
      const s = window.__s, x = s.player.sprite.x + 210, y = s.player.sprite.y;
      s.entities.spawnEnemyAt({ ...s.waveSystem.makeSlime(), speed: 0, hp: 999999, damage: 0, xp: 0 }, x, y);
      s.voidNest.unlock(4); s.voidNest.evolve('evo-singularity-nest'); s.voidNest.activate(s.time.now); s.voidNest.nextAt = Infinity;
      const first = s.voidZones.at(-1); await window.__delay(900);
      const before = first.visual.describe();
      s.gamePause.request('void-pause'); const held = JSON.stringify(first.visual.describe());
      await new Promise(resolve => setTimeout(resolve, 150));
      const pauseHeld = held === JSON.stringify(first.visual.describe()); s.gamePause.release('void-pause');
      await window.__delay(50);
      s.voidNest.activate(s.time.now); s.voidNest.nextAt = Infinity;
      const second = s.voidZones.at(-1);
      const replaces = !first.active && first.visual.retiring && second.active;
      const listeners = s.events.listenerCount('postupdate');
      await window.__delay(120);
      s.gamePause.request('retiring-pause'); const heldTail = JSON.stringify(first.visual.describe());
      await new Promise(resolve => setTimeout(resolve, 120));
      const tailPauseHeld = heldTail === JSON.stringify(first.visual.describe()); s.gamePause.release('retiring-pause');
      await window.__delay(800);
      const result = { before, pauseHeld, tailPauseHeld, replaces,
        tailClean: first.visual.scene === null && first.visual.objects.length === 0,
        listenerClean: s.events.listenerCount('postupdate') === listeners - 1,
        activeFields: s.voidZones.filter(z => z.active).length, secondAge: second.age };
      s.voidNest.rank = 0; second.destroy(); s.voidZones = [];
      return result;
    });
    assert(lifecycle.pauseHeld && lifecycle.tailPauseHeld && lifecycle.replaces && lifecycle.tailClean && lifecycle.listenerClean);
    assert.equal(lifecycle.activeFields, 1);

    // Capture the real production classes, on the real arena at one logical pixel per world unit.
    await page.evaluate(() => {
      const s = window.__s; s.enemies.forEach(e => e.destroy()); s.enemies = [];
      s.gamePause.request('review');
      s.arena.obstacles.forEach(o => o.sprite.setVisible(false));
      s.cameras.main.stopFollow(); s.cameras.main.removeBounds(); s.cameras.main.setZoom(s.game.roosterDisplay?.renderScale ?? 1);
      const c = { x: s.player.sprite.x, y: s.player.sprite.y }; s.cameras.main.centerOn(c.x, c.y);
      s.player.sprite.setVisible(false); s.player.groundMarker.setVisible(false);
      window.__review = [[240, 285], [720, 285], [1200, 285], [420, 690], [1020, 690]].map(([px, py], i) => {
        const x = c.x + px - 720, y = c.y + py - 450;
        const ref = s.entities.spawnEnemyAt({ ...s.waveSystem.makeSupport(), aura: null, ability: null, speed: 0, showHpBar: false }, x - (i === 4 ? 250 : 180), y);
        ref.sprite.stop().setFrame(0);
        const z = new window.__Void(s, x, y, Math.min(4, i + 1), i === 4);
        s.add.text(x, y + 150, ['R1 · Sogwirbel', 'R2 · Sogwirbel', 'R3 · Sogwirbel', 'R4 · Sogwirbel', 'EVO · Void-Spalt'][i], { fontSize: '21px', color: '#f6e8ff', backgroundColor: '#142019' }).setOrigin(.5).setDepth(30);
        return z;
      });
      const style = document.createElement('style'); style.textContent = 'body > :not(#game-root){display:none!important}'; document.head.append(style);
    });
    for (const ms of [220, 1700, 3300]) {
      await page.evaluate(ms => window.__review.forEach(z => z.visual.draw(ms)), ms);
      await page.screenshot({ path: `${out}/stages-${renderer}-${ms}.png` });
    }
    await page.evaluate(() => window.__review.forEach(z => z.visual.draw(z.maxLife - 220)));
    await page.screenshot({ path: `${out}/collapse-${renderer}.png` });
    const restart = await page.evaluate(() => {
      const s = window.__s;
      window.__savedVisuals = window.__review.map(z => z.visual);
      window.__review[4].destroy(true);
      s.gamePause.release('review'); s.scene.restart();
    });
    await page.waitForFunction(() => window.__voidGame.scene.getScene('GameScene')?.isChoosingRooster);
    assert(await page.evaluate(() => window.__savedVisuals.every(v => v.scene === null && v.objects.length === 0)), 'Restart leaked active or retiring visuals');
    assert.deepEqual(errors, []);
    reports.push({ renderer, parity, lifecycle, restartClean: true, errors });
    await page.close();
    console.log(`${renderer}: all ranks and synergy match previous gameplay; pause, replacement, expiry and restart passed.`);
  }
  await fs.writeFile(`${out}/verification.json`, JSON.stringify({ status: 'passed', results: reports }, null, 2));
} finally { await browser.close(); await stopTestServer(server.server); }
