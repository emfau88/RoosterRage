import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { ensureTestServer, loadPlaywright, stopTestServer } from './helpers/test-runtime.mjs';

const server = await ensureTestServer();
const browser = await loadPlaywright().chromium.launch({ headless: true,
  ...(process.env.ROOSTER_CHROMIUM ? { executablePath: process.env.ROOSTER_CHROMIUM } : {}) });
const report = [];
await fs.mkdir('test-results/rocket-build-polish', { recursive: true });
try {
  for (const renderer of ['WEBGL', 'CANVAS']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => errors.push(request.url() + ': ' + request.failure()?.errorText));
    await page.addInitScript(renderer => {
      let phaser;
      Object.defineProperty(window, 'Phaser', { configurable: true, get: () => phaser, set(value) {
        phaser = value;
        const boot = value.Game.prototype.boot;
        value.Game.prototype.boot = function (...args) {
          this.config.renderType = value[renderer]; window.__qaGame = this;
          return boot.apply(this, args);
        };
      } });
    }, renderer);
    await page.goto(`${server.url}?arena=square-coop&seed=rocket-build-polish&profile=manual`);
    await page.waitForFunction(() => window.__ROOSTER_TEST__?.selectRooster);
    await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      api.selectRooster('ace'); api.pauseWaves(); api.disableBot(); api.clearEnemies(); api.clearProjectiles();
      api.advancePickupSchedule(10, 1); api.clearPickups(); api.setPlayerLevel(12);
      const s = window.__qaGame.scene.getScene('GameScene');
      s.lastShotAt = Infinity;
      window.__scene = s;
      window.__delay = ms => new Promise(resolve => s.time.delayedCall(ms, resolve));
      window.__clean = () => {
        api.clearEnemies(); api.clearProjectiles();
        s.supportChickens.forEach(c => c.destroy()); s.supportChickens = [];
        s.rocketEgg.nextAt = Infinity; s.lastShotAt = Infinity;
      };
      window.__target = (x, y, boss = false) => s.entities.spawnEnemyAt({
        ...(boss ? s.waveSystem.makeBoss() : s.waveSystem.makeSlime()),
        hp: 100000, damage: 0, xp: 0, speed: 0, aura: null, ability: null, heavyProjectile: null,
        bossPhases: [], bossSequences: [], entryProtectionMs: 0
      }, x, y);
    });

    const rockets = [];
    for (let stage = 1; stage <= 5; stage++) {
      const row = await page.evaluate(async stage => {
        const s = window.__scene;
        window.__clean();
        s.player.sprite.body.reset(460, 450);
        const enemy = window.__target(940, 450, true);
        const source = stage === 5 ? 'evo-broodstorm' : 'rocket-egg';
        s.rocketEgg.rank = Math.min(stage, 4); s.rocketEgg.evolved = stage === 5;
        const beforeShots = s.telemetry.summary.shotsBySource[source] ?? 0;
        const beforeHp = enemy.hp;
        s.rocketEgg.activate(s.time.now); s.rocketEgg.nextAt = Infinity;
        window.__Rocket = s.rocketProjectiles[0].constructor;
        await window.__delay(280);
        const flights = [...s.rocketProjectiles];
        const count = flights.length;
        const targetIds = flights.map(p => p.target?.id);
        const p = flights[0];
        const before = p.exhaust.flames.map(f => [f.displayWidth, f.displayHeight, f.alpha]);
        const puff = [...p.exhaust.particles].find(p => p.texture.key === 'rocket-smoke-puff');
        const oldPuff = puff ? [puff.x, puff.y] : null;
        const oldRocket = [p.sprite.x, p.sprite.y];
        await window.__delay(125);
        const after = p.exhaust.flames.map(f => [f.displayWidth, f.displayHeight, f.alpha]);
        const rocketMovement = Math.hypot(p.sprite.x - oldRocket[0], p.sprite.y - oldRocket[1]);
        const puffMovement = puff?.active ? Math.hypot(puff.x - oldPuff[0], puff.y - oldPuff[1]) : null;
        const frames = new Set();
        for (let sample = 0; sample < 10; sample++) {
          frames.add(Number(p.trail.frame.name));
          await window.__delay(45);
        }
        const snap = () => flights.map(p => ({ x: p.sprite.x, y: p.sprite.y, rotation: p.sprite.rotation,
          flames: p.exhaust.flames.map(f => [f.x, f.y, f.displayWidth, f.alpha, f.frame.name]),
          particles: [...p.exhaust.particles].map(f => [f.x, f.y, f.scaleX, f.alpha]) }));
        s.gamePause.request('qa-rocket-pause');
        const held = JSON.stringify(snap());
        await new Promise(resolve => setTimeout(resolve, 150));
        const pauseHeld = held === JSON.stringify(snap());
        s.gamePause.release('qa-rocket-pause');
        const engineCount = p.exhaust.engines.length;
        const smoke = p.exhaust.particles.size;
        await window.__delay(1900);
        return { stage, count, targetIds, enemyId: enemy.id, engineCount, smoke, before, after,
          rocketMovement, puffMovement, pauseHeld, animationFrames: [...frames], damage: beforeHp - enemy.hp,
          shots: (s.telemetry.summary.shotsBySource[source] ?? 0) - beforeShots,
          remainingFlights: s.rocketProjectiles.length, remainingWake: flights.reduce((n,p) => n+p.exhaust.particles.size,0),
          error: s.debugStats.lastError };
      }, stage);
      const expectedCount = stage === 5 ? 3 : stage === 4 ? 2 : 1;
      assert.equal(row.count, expectedCount, `Single-target salvo incomplete: ${JSON.stringify(row)}`);
      assert.equal(row.shots, expectedCount, 'Shot telemetry must count actual launches');
      assert(row.targetIds.every(id => id === row.enemyId));
      assert.equal(row.engineCount, [1, 1, 3, 2, 3][stage - 1]);
      assert.notDeepEqual(row.before, row.after, 'Exhaust is static');
      assert(row.animationFrames.length >= 6, `Painted flame frames are not playing: ${JSON.stringify(row)}`);
      assert(row.smoke > 0 && row.puffMovement !== null && row.puffMovement < row.rocketMovement * 0.65,
        `Smoke follows the rocket instead of its wake: ${JSON.stringify(row)}`);
      assert(row.pauseHeld, 'Flight, flames or smoke moved during pause');
      assert(row.damage >= [48, 64, 80, 192, 336][stage - 1], `Salvo did not damage the single boss: ${JSON.stringify(row)}`);
      assert.equal(row.remainingFlights, 0); assert.equal(row.remainingWake, 0);
      assert.equal(row.error, null);
      rockets.push(row);
    }
    const retarget = await page.evaluate(async () => {
      const s = window.__scene;
      window.__clean(); s.player.sprite.body.reset(460, 450);
      const a = window.__target(920, 450), b = window.__target(940, 500);
      s.rocketEgg.rank = 4; s.rocketEgg.evolved = false;
      s.rocketEgg.activate(s.time.now); s.rocketEgg.nextAt = Infinity;
      const first = s.rocketProjectiles[0];
      const originalActivation = first.targetActivationId;
      b.destroy(); a.destroy(); s.enemies = [];
      const replacement = window.__target(880, 530);
      s.player.sprite.body.reset(310, 450);
      await window.__delay(160);
      const second = s.rocketProjectiles[1];
      const muzzle = s.player.getMuzzlePosition(36);
      const result = { count: s.rocketProjectiles.length,
        currentTargets: s.rocketProjectiles.map(p => p.target?.id), replacementId: replacement.id,
        activationChanged: first.targetActivationId !== originalActivation,
        secondLaunchDistance: Math.hypot(second.sprite.x - muzzle.x, second.sprite.y - muzzle.y) };
      window.__clean();
      const before = s.telemetry.summary.shotsBySource['rocket-egg'];
      s.rocketEgg.activate(s.time.now);
      await window.__delay(180);
      result.emptyShots = s.telemetry.summary.shotsBySource['rocket-egg'] - before;
      result.emptyFlights = s.rocketProjectiles.length;
      return result;
    });
    assert.equal(retarget.count, 2);
    assert(retarget.currentTargets.every(id => id === retarget.replacementId));
    assert(retarget.activationChanged, 'Recycled enemy identity was not checked');
    assert(retarget.secondLaunchDistance < 45, 'Delayed rocket launched from the old player position');
    assert.equal(retarget.emptyShots, 0); assert.equal(retarget.emptyFlights, 0);

    const support = [];
    for (let stage = 1; stage <= 6; stage++) {
      const row = await page.evaluate(async stage => {
        const s = window.__scene;
        window.__clean(); s.player.sprite.body.reset(550, 450);
        const enemy = window.__target(735, 450);
        enemy.speed = enemy.baseSpeed = 100;
        enemy.attackMovement = { move: 0 }; // Keep the real enemy update and status expiry running.
        s.activeAbilities.companions.supportEvolutionId = stage === 6 ? 'evo-chick-squadron' : null;
        s.setSupportChickenRank(Math.min(stage, 5));
        s.supportChickens.forEach(c => { c.nextShotAt = Infinity; });
        const chick = s.supportChickens[0];
        chick.fireAt(enemy); chick.nextShotAt = Infinity;
        const start = s.time.now;
        while (enemy.slowUntil <= s.time.now && s.time.now - start < 1400) await window.__delay(25);
        const result = { stage, count: s.supportChickens.length, ratio: chick.slowRatio, duration: chick.slowMs,
          hitSpeed: enemy.speed, hp: enemy.hp, slowed: enemy.slowUntil > s.time.now };
        s.projectiles.forEach(p => p.destroy()); s.projectiles = [];
        await window.__delay(chick.slowMs + 90);
        result.restoredSpeed = enemy.speed;
        return result;
      }, stage);
      assert.equal(row.count, [1, 1, 1, 2, 3, 4][stage - 1]);
      assert.equal(row.ratio, [0.9, 0.9, 0.86, 0.86, 0.78, 0.68][stage - 1]);
      assert(row.slowed && row.hp < 100000, `Support shot failed to slow: ${JSON.stringify(row)}`);
      assert(Math.abs(row.hitSpeed - 100 * row.ratio) < 0.001);
      assert.equal(row.restoredSpeed, 100, `Slow failed to expire: ${JSON.stringify(row)}`);
      support.push(row);
    }

    await page.evaluate(() => {
      window.__clean();
      const api = window.__ROOSTER_TEST__;
      api.applyUpgradeById('support-chick');
      api.startLevelUp(1);
    });
    const card = page.locator('[data-upgrade-id="support-chick"]');
    await card.waitFor({ state: 'visible' });
    await page.screenshot({ path: `test-results/rocket-build-polish/build-offer-${renderer}.png` });
    await card.click();
    const ui = await page.evaluate(() => ({
      rank: window.__scene.player.getUpgradeRank('support-chick'),
      choosing: window.__scene.isChoosingUpgrade,
      text: window.__ROOSTER_TEST__.getUpgradeFeedbackState().hud
    }));
    assert.equal(ui.rank, 2); assert.equal(ui.choosing, false);
    await page.waitForTimeout(1000);
    const final = await page.evaluate(() => ({ error: window.__scene.debugStats.lastError,
      fx: window.__scene.objectPools.getStats().fx }));
    assert.equal(final.error, null); assert.deepEqual(errors, []);
    report.push({ renderer, rockets, retarget, support, ui, final, errors });
    await fs.writeFile('test-results/rocket-build-polish/verification.json', JSON.stringify(report, null, 2));
    console.log(`${renderer}: all 5 rocket stages, single-target damage, target recycling, moving launches, pause/cleanup, all 6 Support Chick stages and real upgrade selection passed.`);
    await page.close();
  }
} finally { await browser.close(); await stopTestServer(server.server); }
