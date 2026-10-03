import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { ensureTestServer, loadPlaywright, stopTestServer } from './helpers/test-runtime.mjs';

const server = await ensureTestServer();
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.addInitScript(() => {
  let phaser;
  Object.defineProperty(window, 'Phaser', { configurable: true, get: () => phaser, set(value) {
    phaser = value;
    const boot = value.Game.prototype.boot;
    value.Game.prototype.boot = function(...args) { window.__balanceGame = this; return boot.apply(this, args); };
  } });
});
try {
  await page.goto(`${server.url}?seed=elite-balance&arena=square-coop`);
  await page.waitForFunction(() => window.__balanceGame?.scene.getScene('GameScene')?.player);
  const result = await page.evaluate(() => {
    const s = window.__balanceGame.scene.getScene('GameScene');
    s.chooseRooster('ace'); s.bot.enabled = false; s.waveSystem.active = false;
    s.gamePause.request('balance-test');
    s.pickups.scheduleIndex = 7;
    s.player.sprite.body.reset(200, 200);
    const types = ['elite-runner', 'elite-brute', 'elite-spitter', 'champion-spitter', 'champion-charger', 'boss', 'slime'];
    const enemies = types.map((type, index) => {
      const config = s.waveSystem.makeEnemyFromSpec({ kind: type });
      const e = s.entities.spawnEnemyAt({ ...config, speed: 0, damage: 0, ability: null, aura: null, entryProtectionMs: 0 }, 650 + index * 55, 450);
      // Preserve references after normal enemies are released back to their pool.
      return { e, type, maxHp: e.maxHp };
    });
    const oldFirstTank = s.waveSystem.makeEliteBrute(0.8).hp;
    const hp = enemies.map(({ type, maxHp }) => ({ type, maxHp }));
    const bomb = s.pickups.spawn('bomb', 700, 600);
    const countBefore = s.pickups.collected.bomb;
    const collected = s.pickups.collect(bomb);
    const afterBomb = enemies.map(({ e, type, maxHp }) => ({ type, hp: e.hp, maxHp, active: e.sprite.active }));
    const afterTwoHits = enemies.filter(({ e }) => !e.boss && (e.elite || e.champion)).map(({ e, type }) => {
      s.damageEnemy(e, 350, e.sprite.x, e.sprite.y, { source: 'balance-probe' });
      s.damageEnemy(e, 350, e.sprite.x, e.sprite.y, { source: 'balance-probe' });
      return { type, hp: e.hp, active: e.sprite.active };
    });
    enemies.filter(({ e }) => !e.boss && (e.elite || e.champion)).forEach(({ e }) => {
      s.damageEnemy(e, 99999, e.sprite.x, e.sprite.y, { source: 'balance-probe' });
    });
    return { hp, firstTankHp: oldFirstTank, collected, countDelta: s.pickups.collected.bomb - countBefore,
      afterBomb, afterTwoHits, chests: s.pickups.items.filter(p => p.chest).map(p => p.kind) };
  });
  assert.deepEqual(result.hp, [
    { type: 'elite-runner', maxHp: 1080 }, { type: 'elite-brute', maxHp: 1350 },
    { type: 'elite-spitter', maxHp: 978 }, { type: 'champion-spitter', maxHp: 1080 },
    { type: 'champion-charger', maxHp: 1560 }, { type: 'boss', maxHp: 10000 },
    { type: 'slime', maxHp: 18 }
  ]);
  assert.equal(result.firstTankHp, 1080);
  assert(result.collected && result.countDelta === 1);
  assert(result.afterBomb.slice(0, 5).every(e => e.active && e.hp === e.maxHp), 'A bomb damaged an elite/champion');
  assert.equal(result.afterBomb[5].hp, 9500, 'Boss bomb damage changed');
  assert(!result.afterBomb[6].active, 'Bomb no longer clears ordinary enemies');
  assert(result.afterTwoHits.every(e => e.active && e.hp > 0), 'An elite still dies to two 350-damage hits');
  assert.equal(result.chests.filter(kind => kind === 'elite-chest').length, 3);
  assert.equal(result.chests.filter(kind => kind === 'golden-chest').length, 2);
  assert.deepEqual(errors, []);
  await fs.writeFile('test-results/elite-balance.json', JSON.stringify({ result, errors }, null, 2));
  console.log('Elite balance passed: 3× HP, bomb immunity, ordinary enemy clear, boss 5%, surviving strong hits and five chest drops.');
} finally { await browser.close(); await stopTestServer(server.server); }
