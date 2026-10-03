import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureTestServer, loadPlaywright, projectRoot, stopTestServer } from './helpers/test-runtime.mjs';

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
      value.Game.prototype.boot = function(...args) { window.__feedbackGame = this; return boot.apply(this, args); };
    } });
  });
  await page.goto(`${server.url}?seed=feedback-pass&arena=square-coop&profile=manual`);
  await page.waitForFunction(() => window.__ROOSTER_TEST__?.getState && window.__feedbackGame);
  await page.evaluate(() => {
    const api = window.__ROOSTER_TEST__;
    api.selectRooster('ace'); api.disableBot(); api.pauseWaves();
    api.clearEnemies(); api.clearProjectiles(); api.clearXpOrbs();
    api.movePlayerTo(700, 540);
    api.setPlayerCombatModifiers({ fireRate: 100000000 });
  });

  const id = await page.evaluate(() => window.__ROOSTER_TEST__.spawnEnemyType('brute', 700, 410,
    { speed: 0, damage: 0, hp: 9999, entryProtectionMs: 0 }));
  assert(id);
  const baseHp = await page.evaluate(() => window.__ROOSTER_TEST__.getEnemySnapshot()[0].hp);
  assert(await page.evaluate((target) => window.__ROOSTER_TEST__.igniteEnemyById(target, 2400, 2, 'fire-eggs-burn'), id));
  const initial = await page.evaluate(() => window.__ROOSTER_TEST__.getAreaEffectState().burningEnemies[0]);
  assert.equal(initial.flameCount, 2);
  assert.equal(initial.source, 'fire-eggs-burn');
  await page.waitForTimeout(760);
  const firstHp = await page.evaluate(() => window.__ROOSTER_TEST__.getEnemySnapshot()[0].hp);
  assert.equal(baseHp - firstHp, 2, 'First Fire Egg burn tick did not occur');
  const nextBefore = await page.evaluate(() => window.__ROOSTER_TEST__.getAreaEffectState().burningEnemies[0].nextTickInMs);
  await page.evaluate((target) => window.__ROOSTER_TEST__.igniteEnemyById(target, 2400, 2, 'fire-eggs-burn'), id);
  const nextAfter = await page.evaluate(() => window.__ROOSTER_TEST__.getAreaEffectState().burningEnemies[0].nextTickInMs);
  assert(nextAfter <= nextBefore + 65, 'Recontact postponed a Fire Egg burn tick');
  assert.equal((await page.evaluate(() => window.__ROOSTER_TEST__.getAreaEffectState().burningEnemies[0])).flameCount, 2);
  await page.waitForTimeout(620);
  const secondHp = await page.evaluate(() => window.__ROOSTER_TEST__.getEnemySnapshot()[0].hp);
  assert.equal(firstHp - secondHp, 2, 'Second burn tick was skipped after recontact');

  await page.evaluate((target) => window.__ROOSTER_TEST__.igniteEnemyById(target, 3000, 3, 'molotov-burn'), id);
  const mixed = await page.evaluate(() => window.__ROOSTER_TEST__.getAreaEffectState().burningEnemies[0]);
  assert.equal(mixed.source, 'molotov-burn');
  assert.equal(mixed.damage, 3);
  assert.equal(mixed.sources.length, 2);
  assert.equal(mixed.flameCount, 2);

  await page.evaluate(() => window.__feedbackGame.scene.getScene('GameScene').gamePause.request('feedback-test'));
  const paused = await page.evaluate(() => {
    const s = window.__feedbackGame.scene.getScene('GameScene');
    return { now: s.time.now, remaining: s.enemies[0].burnUntil - s.time.now,
      flamesPaused: s.enemies[0].burnFlames.every((flame) => flame.anims.isPaused) };
  });
  await page.waitForTimeout(400);
  const held = await page.evaluate(() => {
    const s = window.__feedbackGame.scene.getScene('GameScene');
    return { now: s.time.now, remaining: s.enemies[0].burnUntil - s.time.now };
  });
  assert.deepEqual(held, { now: paused.now, remaining: paused.remaining });
  assert(paused.flamesPaused);
  await page.evaluate(() => window.__feedbackGame.scene.getScene('GameScene').gamePause.release('feedback-test'));
  await page.waitForTimeout(3500);
  assert.equal((await page.evaluate(() => window.__ROOSTER_TEST__.getAreaEffectState().burningEnemies)).length, 0);
  const cleaned = await page.evaluate(() => {
    const s = window.__feedbackGame.scene.getScene('GameScene');
    return { flames: s.enemies[0].burnFlames.length, overlay: s.enemies[0].burnOverlay };
  });
  assert.equal(cleaned.flames, 0);
  assert.equal(cleaned.overlay, null);
  const damageSources = await page.evaluate(() => window.__ROOSTER_TEST__.getTelemetry().damageBySource);
  assert(damageSources['fire-eggs-burn'] >= 4, 'Fire Egg afterburn was attributed to the wrong source');
  assert(damageSources['molotov-burn'] >= 3, 'Molotov afterburn was attributed to the wrong source');

  const poolCleanup = await page.evaluate(() => {
    const api = window.__ROOSTER_TEST__;
    api.clearEnemies();
    const boss = api.spawnEnemyType('boss', 700, 410,
      { speed: 0, damage: 0, hp: 9999, aura: null, ability: null, entryProtectionMs: 0 });
    api.igniteEnemyById(boss, 3000, 3);
    const before = api.getAreaEffectState().burningEnemies[0].flameCount;
    api.clearEnemies();
    api.spawnEnemyType('slime', 700, 410, { speed: 0, damage: 0, hp: 9999 });
    return { before, after: api.getAreaEffectState().burningEnemies.length };
  });
  assert.deepEqual(poolCleanup, { before: 3, after: 0 });

  await page.evaluate(() => {
    const api = window.__ROOSTER_TEST__;
    api.clearEnemies(); api.clearProjectiles();
    api.applyUpgradeById('fire-eggs');
    api.spawnEnemyType('brute', 700, 385, { speed: 0, damage: 0, hp: 9999 });
    const s = window.__feedbackGame.scene.getScene('GameScene');
    s.lastShotAt = -Infinity;
    s.combat.autoShoot(s.time.now);
  });
  const shot = await page.evaluate(() => {
    const s = window.__feedbackGame.scene.getScene('GameScene');
    const projectile = s.projectiles.find((item) => item.source === 'fire-eggs');
    return projectile && { damage: projectile.damage, burnDamage: projectile.burnDamage,
      burnDuration: projectile.burnDuration, rank: s.player.getUpgradeRank('fire-eggs'),
      playerDamage: s.player.projectileDamage };
  });
  assert(shot);
  assert.equal(shot.damage, shot.playerDamage - 3);
  assert.equal(shot.burnDamage, 1);
  assert.equal(shot.burnDuration, 2400);
  await page.waitForFunction(() => window.__ROOSTER_TEST__.getAreaEffectState().burningEnemies
    .some((enemy) => enemy.source === 'fire-eggs-burn'), null, { timeout: 3000 });
  const actualHit = await page.evaluate(() => window.__ROOSTER_TEST__.getAreaEffectState().burningEnemies[0]);
  assert.equal(actualHit.damage, 1);

  for (const rank of [2, 3]) {
    const shot = await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      const s = window.__feedbackGame.scene.getScene('GameScene');
      api.clearEnemies(); api.clearProjectiles();
      api.applyUpgradeById('fire-eggs');
      api.spawnEnemyType('brute', 700, 385, { speed: 0, damage: 0, hp: 9999 });
      s.lastShotAt = -Infinity;
      s.combat.autoShoot(s.time.now);
      const projectile = s.projectiles.find((item) => item.source === 'fire-eggs');
      return { rank: s.player.getUpgradeRank('fire-eggs'), damage: projectile.damage,
        burnDamage: projectile.burnDamage, playerDamage: s.player.projectileDamage };
    });
    assert.equal(shot.rank, rank);
    assert.equal(shot.damage, shot.playerDamage - rank * 3);
    assert.equal(shot.burnDamage, rank);
  }

  const multiHit = await page.evaluate(() => {
    const s = window.__feedbackGame.scene.getScene('GameScene');
    const api = window.__ROOSTER_TEST__;
    api.clearEnemies(); api.clearProjectiles();
    const ids = [650, 700, 750].map((x) => api.spawnEnemyType('slime', x, 385,
      { speed: 0, damage: 0, hp: 9999, ability: null }));
    const enemies = ids.map((id) => s.enemies.find((enemy) => enemy.id === id));
    const projectile = s.spawnProjectile(0, enemies[0], 0,
      { source: 'fire-eggs', damage: 27, burnDamage: 1, burnDuration: 2400, pierce: 1, ricochet: 1 });
    s.hitEnemy(projectile, enemies[0]);
    const firstHp = enemies[0].hp;
    s.hitEnemy(projectile, enemies[0]);
    const duplicateIgnored = enemies[0].hp === firstHp;
    s.hitEnemy(projectile, enemies[1]);
    const hitsBeforeRicochet = projectile.hitEnemies.size;
    s.hitEnemy(projectile, enemies[2]);
    return { duplicateIgnored, burning: enemies.map((enemy) => enemy.burnSource),
      hitsBeforeRicochet, damaged: enemies.map((enemy) => enemy.hp < enemy.maxHp),
      destroyed: projectile.destroyed };
  });
  assert(multiHit.duplicateIgnored);
  assert.deepEqual(multiHit.burning, ['fire-eggs-burn', 'fire-eggs-burn', 'fire-eggs-burn']);
  assert.equal(multiHit.hitsBeforeRicochet, 2);
  assert.deepEqual(multiHit.damaged, [true, true, true]);
  assert(multiHit.destroyed);

  await page.evaluate(() => {
    const s = window.__feedbackGame.scene.getScene('GameScene');
    window.__ROOSTER_TEST__.clearEnemies();
    window.__ROOSTER_TEST__.clearProjectiles();
    const id = window.__ROOSTER_TEST__.spawnEnemyType('slime', 700, 385,
      { speed: 0, damage: 0, hp: 1 });
    const enemy = s.enemies.find((item) => item.id === id);
    const projectile = s.spawnProjectile(-Math.PI / 2, enemy, 0,
      { source: 'fire-eggs', damage: 50, burnDamage: 1, burnDuration: 2400, pierce: 0 });
    s.hitEnemy(projectile, enemy);
  });
  assert.equal((await page.evaluate(() => window.__ROOSTER_TEST__.getAreaEffectState().burningEnemies)).length, 0,
    'Lethal Fire Egg left a status behind');

  await page.evaluate(() => {
    const s = window.__feedbackGame.scene.getScene('GameScene');
    const api = window.__ROOSTER_TEST__;
    api.clearEnemies(); api.clearProjectiles();
    s.player.fireRate = 100000000;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 6; col++) {
        api.spawnEnemyType('slime', 600 + col * 40, 380 + row * 42,
          { speed: 0, damage: 0, hp: 9999, ability: null });
      }
    }
    s.molotovEgg.createImpact(630, 425, 1, false);
    s.molotovEgg.createImpact(770, 425, 1, false);
  });
  await page.waitForTimeout(850);
  const dense = await page.evaluate(() => ({
    state: window.__ROOSTER_TEST__.getState(),
    area: window.__ROOSTER_TEST__.getAreaEffectState()
  }));
  assert.equal(dense.area.hazards.length, 2);
  assert(dense.area.burningEnemies.length >= 12);
  assert(dense.area.burningEnemies.every((enemy) => enemy.flameCount === 2));
  const output = path.join(projectRoot, 'docs', 'qa', 'pickup-hit-feedback');
  await fs.mkdir(output, { recursive: true });
  await page.screenshot({ path: path.join(output, 'dense-burn.png') });
  await page.waitForTimeout(1000);
  const later = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
  assert(later.frames - dense.state.frames >= 10, 'Dense burn scene stopped rendering');
  for (const source of ['lightning-comb', 'pickup:bomb', 'void-nest']) {
    const impact = await page.evaluate((selectedSource) => {
      const s = window.__feedbackGame.scene.getScene('GameScene');
      const api = window.__ROOSTER_TEST__;
      api.clearEnemies(); api.clearProjectiles();
      const id = api.spawnEnemyType('brute', 700, 390,
        { speed: 0, damage: 0, hp: 9999, ability: null });
      const enemy = s.enemies.find((item) => item.id === id);
      const before = enemy.hp;
      s.damageEnemy(enemy, 5, enemy.sprite.x, enemy.sprite.y, { source: selectedSource });
      return { applied: before - enemy.hp, visuals: s.combatFeedback.activeHitVisuals.size };
    }, source);
    assert.equal(impact.applied, 5, `${source} feedback changed damage`);
    assert(impact.visuals >= 2, `${source} has no distinct impact accent`);
    await page.screenshot({ path: path.join(output, `impact-${source.replace(':', '-')}.png`) });
    await page.waitForTimeout(300);
    const leftover = await page.evaluate(() => window.__feedbackGame.scene.getScene('GameScene')
      .combatFeedback.activeHitVisuals.size);
    assert.equal(leftover, 0, `${source} feedback did not clean up`);
  }
  const limited = await page.evaluate(() => {
    const s = window.__feedbackGame.scene.getScene('GameScene');
    const enemy = s.enemies[0];
    for (let index = 0; index < 40; index++) {
      s.damageEnemy(enemy, 1, enemy.sprite.x, enemy.sprite.y, { source: 'lightning-comb' });
    }
    return s.combatFeedback.activeHitVisuals.size;
  });
  assert(limited <= 12, 'Hit feedback exceeded its visual budget');
  assert.deepEqual(errors, []);
  console.log('Feedback pass: moving burn ticks, shared source cap, pause, cleanup, real Fire Egg shot and lethal hit passed.');
} finally {
  await browser.close();
  await stopTestServer(server.server);
}
