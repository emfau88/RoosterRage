import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { ensureTestServer, loadPlaywright, stopTestServer } from './helpers/test-runtime.mjs';

const { server, url } = await ensureTestServer();
const browser = await loadPlaywright().chromium.launch();
const page = await browser.newPage();
page.setDefaultTimeout(30_000);
const errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await page.addInitScript(() => {
    let phaser;
    Object.defineProperty(window, 'Phaser', { configurable: true, get: () => phaser, set(value) {
      phaser = value;
      const boot = value.Game.prototype.boot;
      value.Game.prototype.boot = function(...args) {
        window.__audioGame = this;
        return boot.apply(this, args);
      };
    } });
  });
  await page.goto(`${url}?seed=user-sounds`);
  await page.waitForFunction(() => window.__audioGame?.scene.getScene('GameScene')?.player);
  // A real user gesture unlocks WebAudio before testing actual playback.
  await page.locator('canvas').click({ position: { x: 10, y: 10 }, force: true });
  await page.evaluate(() => window.__audioGame.scene.getScene('GameScene').runState.chooseRooster('ace'));
  const report = await page.evaluate(async () => {
    const s = window.__audioGame.scene.getScene('GameScene');
    s.waveSystem.active = false; s.bot.enabled = false; s.lastShotAt = Infinity;
    s.gamePause.request('audio-test');
    await s.sound.context.resume();
    const calls = [];
    const originalPlay = s.audio.play.bind(s.audio);
    s.audio.play = (key, options) => {
      const sound = originalPlay(key, options);
      calls.push({ key, playing: Boolean(sound?.isPlaying), duration: sound?.duration ?? null });
      return sound;
    };
    const reset = () => { s.audio.stopAll(); s.audio.lastPlayedAt.clear(); calls.length = 0; };
    const rows = [];
    // Exercise the actual choice handler (level/chest), not just a sound API.
    const choose = (id, type = 'level') => {
      const upgrade = s.upgradeSystem.upgrades.find(u => u.id === id);
      s.runState.choosingUpgrade = true;
      s.runState.currentSelection = { type, kind: type === 'chest' ? 'elite' : null };
      return s.runState.chooseUpgrade(s.upgradeSystem.presentUpgrade(upgrade, s.player));
    };
    for (let rank = 1; rank <= 5; rank++) {
      reset();
      const ok = choose('support-chick', rank === 3 ? 'chest' : 'level');
      rows.push({ event: `support-r${rank}`, ok, calls: [...calls] });
    }
    reset(); choose('faster-eggs'); choose('evo-chick-squadron');
    rows.push({ event: 'support-evolution', calls: [...calls] });
    reset(); choose('move-speed');
    rows.push({ event: 'unrelated-upgrade', calls: [...calls] });

    reset(); s.unlockMolotovEgg(1);
    const ability = s.activeAbilities.molotovEgg;
    ability.createImpact(s.player.sprite.x + 100, s.player.sprite.y + 100, 1, false);
    rows.push({ event: 'molotov-impact', calls: [...calls] });

    reset();
    const heal = s.pickups.spawn('heal');
    s.player.hp = s.player.maxHp;
    const deferred = s.pickups.collect(heal);
    const bomb = s.pickups.spawn('bomb');
    const first = s.pickups.collect(bomb);
    const repeat = s.pickups.collect(bomb);
    rows.push({ event: 'bomb-after-full-health', deferred, first, repeat, calls: [...calls] });

    for (const factory of ['makeEliteRunner', 'makeEliteBrute', 'makeEliteSpitter',
      'makeChampionCharger', 'makeChampionSpitter', 'makeSlime', 'makeBoss']) {
      reset();
      s.entities.spawnEnemyAt(s.waveSystem[factory](), s.player.sprite.x + 300, s.player.sprite.y);
      rows.push({ event: factory, calls: [...calls] });
    }
    reset();
    s.entities.spawnEnemyAt(s.waveSystem.makeEliteRunner(), s.player.sprite.x + 300, s.player.sprite.y);
    s.entities.spawnEnemyAt(s.waveSystem.makeEliteBrute(), s.player.sprite.x + 350, s.player.sprite.y);
    rows.push({ event: 'simultaneous-elites', calls: [...calls] });
    for (const factory of ['makeEliteRunner', 'makeEliteBrute', 'makeEliteSpitter',
      'makeChampionCharger', 'makeChampionSpitter', 'makeSlime', 'makeBoss']) {
      reset();
      const enemy = s.entities.spawnEnemyAt(s.waveSystem[factory](), s.player.sprite.x + 300, s.player.sprite.y);
      enemy.invulnerableUntil = 0;
      reset();
      const first = s.damageEnemy(enemy, enemy.maxHp * 100, enemy.sprite.x, enemy.sprite.y, { quiet: true });
      const repeat = s.damageEnemy(enemy, enemy.maxHp * 100, enemy.sprite.x, enemy.sprite.y, { quiet: true });
      rows.push({ event: `death-${factory}`, first, repeat, calls: [...calls] });
    }
    reset();
    const removed = s.entities.spawnEnemyAt(s.waveSystem.makeEliteRunner(), s.player.sprite.x + 300, s.player.sprite.y);
    reset(); removed.destroy();
    rows.push({ event: 'cleanup-without-death', calls: [...calls] });
    reset(); s.audio.setVolume('sfx', 0);
    s.setSupportChickenRank(5);
    ability.createImpact(s.player.sprite.x + 100, s.player.sprite.y + 100, 1, false);
    const mutedElite = s.entities.spawnEnemyAt(s.waveSystem.makeEliteRunner(), s.player.sprite.x + 300, s.player.sprite.y);
    mutedElite.invulnerableUntil = 0;
    s.damageEnemy(mutedElite, mutedElite.maxHp * 100, mutedElite.sprite.x, mutedElite.sprite.y, { quiet: true });
    rows.push({ event: 'muted-sfx', calls: [...calls] });
    return rows;
  });
  const played = (row, key) => row.calls.filter(c => c.key === key && c.playing);
  for (const row of report.filter(r => r.event.startsWith('support-'))) {
    assert.equal(played(row, 'support-chirp').length, 1, JSON.stringify(row));
    if ('ok' in row) assert.equal(row.ok, true);
  }
  assert.equal(played(report.find(r => r.event === 'unrelated-upgrade'), 'support-chirp').length, 0);
  const molotov = played(report.find(r => r.event === 'molotov-impact'), 'molotov-impact');
  assert.equal(molotov.length, 1);
  assert(molotov[0].duration > 1.4 && molotov[0].duration < 1.7);
  const bomb = report.find(r => r.event === 'bomb-after-full-health');
  assert.equal(bomb.deferred, false); assert.equal(bomb.first, true); assert.equal(bomb.repeat, false);
  assert.equal(played(bomb, 'pickup-bomb').length, 1);
  assert(played(bomb, 'pickup-bomb')[0].duration > 2.3);
  for (const row of report.filter(r => /^make(Elite|Champion)/.test(r.event))) {
    assert.equal(played(row, 'elite-entry').length, 1, JSON.stringify(row));
  }
  for (const event of ['makeSlime', 'makeBoss']) {
    assert.equal(played(report.find(r => r.event === event), 'elite-entry').length, 0);
  }
  assert.equal(played(report.find(r => r.event === 'simultaneous-elites'), 'elite-entry').length, 1);
  for (const row of report.filter(r => r.event.startsWith('death-'))) {
    assert.equal(row.first, true, JSON.stringify(row));
    assert.equal(row.repeat, false, JSON.stringify(row));
    const elite = /^death-make(Elite|Champion)/.test(row.event);
    assert.equal(played(row, 'elite-death').length, elite ? 1 : 0, JSON.stringify(row));
    if (elite) {
      assert(row.calls.filter(c => c.key === 'elite-death').length === 1);
      assert(played(row, 'elite-death')[0].duration > 0.7 && played(row, 'elite-death')[0].duration < 0.85);
    }
  }
  assert.equal(played(report.find(r => r.event === 'cleanup-without-death'), 'elite-death').length, 0);
  assert(report.find(r => r.event === 'muted-sfx').calls.every(c => !c.playing));
  assert.deepEqual(errors, []);
  await fs.mkdir('test-results', { recursive: true });
  await fs.writeFile('test-results/user-sounds.json', JSON.stringify(report, null, 2));
  console.log('User sounds: real playback, Support Chick ranks + EVO, Molotov, bomb, elite/champion spawns and deaths, repeat damage, cleanup, cooldown and mute passed.');
} finally {
  await browser.close();
  await stopTestServer(server);
}
