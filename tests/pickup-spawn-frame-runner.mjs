import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { ensureTestServer, loadPlaywright, projectRoot, stopTestServer } from './helpers/test-runtime.mjs';

const release = process.argv.includes('--release');
const reportOnly = process.argv.includes('--report-only');
const preview = release ? await (await import('vite')).preview({
  root: projectRoot, mode: 'release', logLevel: 'silent',
  preview: { host: '127.0.0.1', port: 0, open: false }
}) : null;
const server = preview ? { url: preview.resolvedUrls.local[0] } : await ensureTestServer();
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const report = [];
const failures = [];
const schedule = [
  [1, 0.6, 'heal'], [2, 0.55, 'magnet'], [3, 0.55, 'bomb'],
  [5, 0.45, 'heal'], [6, 0.55, 'magnet'], [7, 0.6, 'bomb']
];
const scenarios = [
  { arena: 'open-yard', width: 1280, height: 830 },
  { arena: 'vertical-run', width: 1280, height: 830 },
  { arena: 'square-coop', width: 1280, height: 830 },
  { arena: 'open-yard', width: 390, height: 844, slow: true }
];
function check(condition, message) { if (!condition) failures.push(message); }
try {
  for (const scenario of scenarios) {
    const { arena, width, height, slow } = scenario;
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: slow ? 3 : 1 });
    if (slow) {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    }
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      let phaser;
      Object.defineProperty(window, 'Phaser', { configurable: true, get: () => phaser, set(value) {
        phaser = value;
        const boot = value.Game.prototype.boot;
        value.Game.prototype.boot = function(...args) {
          window.__spawnFrameGame = this;
          return boot.apply(this, args);
        };
      } });
    });
    await page.goto(`${server.url}?arena=${arena}&seed=pickup-spawn-frame-${arena}`);
    await page.waitForFunction(() => window.__spawnFrameGame?.scene.getScene('GameScene')?.player);
    await page.evaluate(() => {
      const s = window.__spawnFrameGame.scene.getScene('GameScene');
      s.chooseRooster('ace'); s.waveSystem.active = false; s.bot.enabled = false;
      s.lastShotAt = Infinity; s.player.armor = 1000; s.player.regenPerSecond = 0;
      s.player.hp = s.player.maxHp;
      window.__spawnFrames = [];
      window.__arcadeHits = 0;
      window.__pickupFeedback = [];
      const spawn = s.pickups.spawn.bind(s.pickups);
      s.pickups.spawn = (...args) => {
        const p = spawn(...args);
        if (p) window.__spawnFrames.push({ pickup: p,
          x: p.sprite.x, y: p.sprite.y, physicsSteps: s.physics.world.stepsLastFrame,
          count: s.pickups.collected[p.kind] });
        return p;
      };
      const hitEnemy = s.hitEnemy.bind(s);
      s.hitEnemy = (...args) => { window.__arcadeHits++; return hitEnemy(...args); };
      const feedback = s.hud.showPickupFeedback.bind(s.hud);
      s.hud.showPickupFeedback = (...args) => {
        window.__pickupFeedback.push({ kind: args[0], title: args[1] });
        return feedback(...args);
      };
    });
    const rows = [];
    for (const [wave, threshold, kind] of schedule) {
      // The real projectile overlap kills the final enemy needed for a scheduled
      // drop. Never call collect(), spawn() or processWaveProgress() from the test.
      const before = await page.evaluate(({ wave, threshold }) => {
        const s = window.__spawnFrameGame.scene.getScene('GameScene');
        s.waveSystem.currentWave = wave;
        s.waveSystem.director.spawnedCount = Math.ceil(s.waveSystem.waves[wave - 1].count * threshold);
        let point;
        for (let attempt = 0; attempt < 200; attempt++) {
          point = s.arena.findSafePoint('spawn-frame-enemy', 100);
          if (Math.hypot(point.x - s.player.sprite.x, point.y - s.player.sprite.y) > 250) break;
        }
        const enemy = s.entities.spawnEnemyAt({ ...s.waveSystem.makeSlime(),
          hp: 1, damage: 0, speed: 0, xpOverride: 0 }, point.x, point.y);
        s.combat.spawnSpecialProjectileFrom(point.x, point.y, 0, enemy,
          { damage: 100, speed: 0, homing: false, canCrit: false });
        return { spawns: window.__spawnFrames.length, arcadeHits: window.__arcadeHits };
      }, { wave, threshold });
      await page.waitForFunction(n => window.__spawnFrames.length > n, before.spawns);
      // Wait for postUpdate and another complete physics frame: this is where
      // the old constructor displaced the invisible sprite away from its art.
      await page.evaluate(() => new Promise(resolve => {
        const world = window.__spawnFrameGame.scene.getScene('GameScene').physics.world;
        world.once('worldstep', () => world.once('worldstep', () => resolve()));
      }));
      const spawned = await page.evaluate(() => {
        const s = window.__spawnFrameGame.scene.getScene('GameScene');
        const entry = window.__spawnFrames.at(-1), p = entry.pickup;
        s.player.updateGroundMarker();
        const offset = s.player.groundMarker.y - s.player.sprite.y;
        // Approach the VISIBLE field, never the possibly displaced sprite.
        const ground = { x: p.field.x, y: p.field.y };
        const paths = [
          { key: 'd', x: ground.x - 75, y: ground.y - offset, dx: 1, dy: 0 },
          { key: 'a', x: ground.x + 75, y: ground.y - offset, dx: -1, dy: 0 },
          { key: 's', x: ground.x, y: ground.y - offset - 75, dx: 0, dy: 1 },
          { key: 'w', x: ground.x, y: ground.y - offset + 75, dx: 0, dy: -1 }
        ];
        const path = paths.find(candidate => [0, 20, 40, 60, 80, 100, 110].every(distance => {
          const x = candidate.x + candidate.dx * distance;
          const y = candidate.y + candidate.dy * distance;
          return s.arena.isInsidePlayable(x, y, 35) && !s.arena.overlapsObstacle(x, y, 40);
        }));
        return { kind: p.kind, count: entry.count, arcadeHits: window.__arcadeHits,
          physicsStepsAtSpawn: entry.physicsSteps,
          drift: { x: p.sprite.x - entry.x, y: p.sprite.y - entry.y },
          bodyToField: Math.hypot(p.sprite.body.center.x - ground.x, p.sprite.body.center.y - ground.y),
          ground, path, radius: p.sprite.body.halfWidth,
          feedbackCount: window.__pickupFeedback.length };
      });
      assert(spawned.path, `No clear approach on ${arena}, wave ${wave}`);
      await page.evaluate(path => {
        const s = window.__spawnFrameGame.scene.getScene('GameScene');
        s.player.sprite.body.reset(path.x, path.y); s.player.updateGroundMarker();
      }, spawned.path);
      await page.keyboard.down(spawned.path.key);
      await page.waitForFunction(({ path, kind, count }) => {
        const s = window.__spawnFrameGame.scene.getScene('GameScene');
        const moved = (s.player.sprite.x - path.x) * path.dx + (s.player.sprite.y - path.y) * path.dy;
        return moved >= 105 || s.pickups.collected[kind] > count;
      }, { path: spawned.path, kind, count: spawned.count }, { timeout: slow ? 8000 : 4000 });
      await page.keyboard.up(spawned.path.key);
      const after = await page.evaluate(feedbackCount => {
        const s = window.__spawnFrameGame.scene.getScene('GameScene');
        const p = window.__spawnFrames.at(-1).pickup;
        return { collected: s.pickups.collected[p.kind], active: p.sprite.active,
          artActive: p.visual.active, feedback: window.__pickupFeedback.slice(feedbackCount),
          magnetActive: s.pickups.isMagnetActive(), lastError: s.debugStats.lastError };
      }, spawned.feedbackCount);
      const label = `${arena} ${width}px wave ${wave} ${kind}`;
      check(spawned.kind === kind, `${label}: wrong scheduled drop`);
      check(spawned.arcadeHits > before.arcadeHits, `${label}: fixture did not use a real Arcade hit`);
      check(Math.hypot(spawned.drift.x, spawned.drift.y) < 0.001, `${label}: drift ${JSON.stringify(spawned.drift)}`);
      check(spawned.bodyToField < 0.1, `${label}: collider left visible field by ${spawned.bodyToField}px`);
      check(spawned.radius === (kind === 'bomb' ? 11 : 15), `${label}: changed radius`);
      check(after.active === (kind === 'heal') && after.artActive === (kind === 'heal'), `${label}: wrong availability after crossing`);
      check(after.collected === spawned.count + Number(kind !== 'heal'), `${label}: effect missing or duplicated`);
      check(after.feedback.some(f => f.kind === kind && (kind !== 'heal' || f.title === 'HP FULL')), `${label}: feedback missing`);
      if (kind === 'magnet') check(after.magnetActive, `${label}: magnet effect missing`);
      check(!after.lastError, `${label}: ${after.lastError}`);
      rows.push({ wave, kind, spawned, after });
    }
    check(errors.length === 0, `${arena}: browser errors ${errors.join('; ')}`);
    report.push({ ...scenario, rows, errors });
    await page.close();
    console.log(`Checked ${arena} ${width}px${slow ? ' CPU x6' : ''}: six drops from real projectile kills.`);
  }
  await fs.mkdir('test-results', { recursive: true });
  const bundled = release || Boolean(process.env.ROOSTER_TEST_URL);
  const file = `test-results/pickup-spawn-frame-${bundled ? 'release' : 'dev'}${reportOnly ? '-before' : ''}.json`;
  await fs.writeFile(file, JSON.stringify({ report, failures }, null, 2));
  console.log(`${file}: ${failures.length} failures.`);
  if (reportOnly) console.log(failures.join('\n'));
  else assert.deepEqual(failures, []);
} finally {
  await browser.close();
  if (preview) await new Promise(resolve => preview.httpServer.close(resolve));
  else await stopTestServer(server.server);
}
