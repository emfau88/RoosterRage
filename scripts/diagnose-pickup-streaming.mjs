import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { ensureTestServer, loadPlaywright, stopTestServer } from '../tests/helpers/test-runtime.mjs';

// Diagnostic fixture, not a gameplay fix. --expect-fixed turns the observed
// failure into an acceptance assertion for a future world-state correction.
const expectFixed = process.argv.includes('--expect-fixed');
const cpuSlowdown = Number(process.argv.find(arg => arg.startsWith('--cpu-slowdown='))?.split('=')[1] ?? 1);
const server = await ensureTestServer();
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const reports = [];
try {
  for (const arena of ['open-yard', 'vertical-run']) {
    for (const kind of ['heal', 'magnet', 'bomb']) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 830 } });
      if (cpuSlowdown > 1) {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuSlowdown });
      }
      const errors = [];
      page.on('pageerror', error => errors.push(error.stack));
      await page.addInitScript(() => {
        let phaser;
        Object.defineProperty(window, 'Phaser', { configurable: true, get: () => phaser, set(value) {
          phaser = value;
          const boot = value.Game.prototype.boot;
          value.Game.prototype.boot = function(...args) { window.__streamGame = this; return boot.apply(this, args); };
        } });
      });
      await page.goto(`${server.url}?seed=pickup-stream-return&arena=${arena}`);
      await page.waitForFunction(() => window.__streamGame?.scene.getScene('GameScene')?.player);
      const setup = await page.evaluate(kind => {
        const s = window.__streamGame.scene.getScene('GameScene');
        s.chooseRooster('ace'); s.bot.enabled = false; s.waveSystem.active = false;
        s.pickups.scheduleIndex = 7; s.lastShotAt = Infinity;
        s.player.armor = 1000; s.player.hp = 50; s.player.regenPerSecond = 0;
        const obstacle = s.arena.obstacles.filter(o => o.destructible && o.sprite.active && o.kind === 'crate')
          .sort((a, b) => Math.hypot(a.x - s.player.sprite.x, a.y - s.player.sprite.y)
            - Math.hypot(b.x - s.player.sprite.x, b.y - s.player.sprite.y))[0];
        if (!obstacle) throw new Error('No crate fixture');
        window.__crate = { id: obstacle.id, x: obstacle.x, y: obstacle.y };
        s.player.sprite.body.reset(obstacle.x, obstacle.y - 160);
        s.player.updateGroundMarker(); s.arena.update();
        s.arena.damageObstacle(obstacle, obstacle.hp, 'diagnosis');
        s.waveSystem.currentWave = 3;
        // Select the requested kind using the existing budgets, and force only
        // the prop's random drop roll. Its spawn and placement stay unchanged.
        for (const [type, budget] of Object.entries({ heal: 3, bomb: 2, magnet: 2 })) {
          if (type !== kind) s.pickups.spawned[type] = budget;
        }
        const p = s.pickups.spawnFromProp(obstacle.x, obstacle.y, obstacle, { force: true });
        if (!p || p.kind !== kind) throw new Error('Wrong prop-drop fixture');
        window.__streamPickup = p;
        const before = { crate: window.__crate, point: { x: p.sprite.x, y: p.sprite.y },
          blocked: s.arena.overlapsObstacle(p.sprite.x, p.sprite.y, 0),
          bundle: [...document.scripts].find(script => script.type === 'module')?.src.split('/').at(-1) };
        // Relocate only to exercise actual chunk unloading/reloading. Contact
        // below is real keyboard movement through the normal physics loop.
        s.player.sprite.body.reset(obstacle.x, obstacle.y + 6000); s.arena.update();
        const unloaded = !s.arena.obstacles.some(o => o.sprite.active && o.id === window.__crate.id);
        const otherWorldPropActive = s.arena.obstacles.some(o => o.destructible && o.sprite.active
          && o.id !== window.__crate.id);
        s.player.sprite.body.reset(window.__crate.x, window.__crate.y - 160);
        s.arena.update(); s.player.updateGroundMarker();
        return { ...before, unloaded, otherWorldPropActive,
          destroyedObstacleCount: s.arena.getState().destroyedObstacleCount,
          blockedAfter: s.arena.overlapsObstacle(p.sprite.x, p.sprite.y, 0),
          restored: s.arena.obstacles.filter(o => o.sprite.active && o.id === window.__crate.id)
            .map(o => ({ id: o.id, x: o.x, y: o.y, hp: o.hp })) };
      }, kind);
      assert.equal(setup.blocked, false, 'Pickup started inside an obstacle');
      assert.equal(setup.unloaded, true, 'Fixture failed to unload the original chunk');
      assert.equal(setup.otherWorldPropActive, true, 'Recycled chunks lost their other props');
      const readState = () => page.evaluate(() => {
        const s = window.__streamGame.scene.getScene('GameScene'), p = window.__streamPickup;
        return { active: p.sprite.active, artActive: p.visual.active,
          body: [s.player.sprite.body.center.x, s.player.sprite.body.center.y],
          foot: [s.player.groundMarker.x, s.player.groundMarker.y],
          pickup: [p.sprite.x, p.sprite.y], counts: { ...s.pickups.collected },
          hp: s.player.hp, magnet: s.pickups.isMagnetActive(), error: s.debugStats.lastError };
      });
      const crossPickup = async () => {
        await page.keyboard.down('s');
        try {
          // On software-rendered CI, 1.6 seconds of wall time did not move
          // the player far enough to touch the item. Require actual travel,
          // while retaining a bounded observation for the blocked diagnostic.
          await page.waitForFunction(() => {
            const s = window.__streamGame.scene.getScene('GameScene'), p = window.__streamPickup;
            return !p.sprite.active || s.player.sprite.body.center.y >= p.sprite.y + 50;
          }, undefined, { timeout: 10000 });
          return 'completed';
        } catch (error) {
          if (error.name !== 'TimeoutError') throw error;
          return 'blocked-or-stalled';
        } finally {
          await page.keyboard.up('s');
        }
      };
      const firstCrossing = await crossPickup();
      const beforeIntervention = await readState();
      await page.evaluate(() => {
        const s = window.__streamGame.scene.getScene('GameScene');
        const obstacle = s.arena.obstacles.find(o => o.sprite.active && o.id === window.__crate.id);
        if (obstacle) s.arena.damageObstacle(obstacle, obstacle.hp, 'diagnosis');
      });
      const secondCrossing = await crossPickup();
      const afterIntervention = await readState();
      const blockedByRestoredProp = setup.blockedAfter && beforeIntervention.active && !afterIntervention.active;
      reports.push({ arena, kind, setup, firstCrossing, secondCrossing,
        beforeIntervention, afterIntervention, blockedByRestoredProp, errors });
      console.log(JSON.stringify({ arena, kind, bundle: setup.bundle, blockedByRestoredProp,
        activeBeforeBreaking: beforeIntervention.active, activeAfterBreaking: afterIntervention.active }));
      assert.equal(afterIntervention.active, false, 'Removing the obstacle did not restore pickup access');
      assert.equal(afterIntervention.counts[kind], 1, 'Pickup effect was not applied exactly once');
      assert.deepEqual(errors, []);
      if (expectFixed) {
        assert.equal(setup.destroyedObstacleCount, 1, 'Destroyed prop was not remembered by world ID');
        const previousRun = await page.evaluate(() => {
          const s = window.__streamGame.scene.getScene('GameScene');
          const run = s.pickupDiagnostics.run;
          s.scene.restart({ roosterId: 'ace' });
          return run;
        });
        await page.waitForFunction(run => window.__streamGame.scene.getScene('GameScene')
          .pickupDiagnostics?.run > run, previousRun);
        const newRun = await page.evaluate(() => {
          const s = window.__streamGame.scene.getScene('GameScene');
          s.player.sprite.body.reset(window.__crate.x, window.__crate.y - 160);
          s.arena.update();
          return { destroyedObstacleCount: s.arena.getState().destroyedObstacleCount,
            originalCrateActive: s.arena.obstacles.some(o => o.id === window.__crate.id && o.sprite.active) };
        });
        assert.deepEqual(newRun, { destroyedObstacleCount: 0, originalCrateActive: true },
          'A new run should restore the original crate');
      }
      await page.close();
    }
  }
  await fs.mkdir('test-results', { recursive: true });
  await fs.writeFile('test-results/pickup-streaming-audit.json', JSON.stringify(reports, null, 2));
  if (expectFixed) assert(reports.every(row => !row.beforeIntervention.active && !row.setup.blockedAfter),
    'Streaming still restores an obstacle over a retained pickup; see test-results/pickup-streaming-audit.json');
} finally { await browser.close(); await stopTestServer(server.server); }
