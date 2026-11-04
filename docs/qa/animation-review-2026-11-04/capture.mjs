// Read-only review of existing effects, plus the newly approved Void in a mixed scene.
import fs from 'node:fs/promises';
import { ensureTestServer, loadPlaywright, stopTestServer } from '../../../tests/helpers/test-runtime.mjs';
const output = import.meta.dirname;
const server = await ensureTestServer(), browser = await loadPlaywright().chromium.launch({ headless: true });
const report = [];
const selected = process.argv.find(arg => arg.startsWith('--view='))?.split('=')[1];
try {
  for (const spec of [
    ['laser-r4', 'laserComb', 4, false, 210], ['laser-evo', 'laserComb', 4, true, 230],
    ['lightning-r4', 'lightningComb', 4, false, 25], ['lightning-evo', 'lightningComb', 4, true, 25],
    ['golden-r4', 'goldenEgg', 4, false, 190], ['orbit-evo', 'orbit', 4, true, 550],
    ['molotov-evo', 'molotovEgg', 4, true, 1100], ['boss-fireball', 'boss', 4, true, 170],
    ['evo-impacts', 'impacts', 4, true, 45], ['void-overlap', 'overlap', 4, true, 0]
  ]) {
    if (selected && spec[0] !== selected) continue;
    const [id] = spec, errors = [];
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      let phaser;
      Object.defineProperty(window, 'Phaser', { configurable: true, get: () => phaser, set(value) {
        phaser = value; const boot = value.Game.prototype.boot;
        value.Game.prototype.boot = function(...args) { window.__auditGame = this; return boot.apply(this, args); };
      } });
    });
    await page.goto(`${server.url}?arena=open-yard&seed=animation-review&profile=manual`);
    await page.waitForFunction(() => window.__auditGame?.scene.getScene('GameScene')?.player);
    const snapshot = await page.evaluate(async ([id, ability, rank, evolved, wait]) => {
      const s = window.__s = window.__auditGame.scene.getScene('GameScene');
      s.chooseRooster('ace'); s.waveSystem.active = false; s.bot.enabled = false; s.lastShotAt = Infinity;
      s.player.hp = s.player.maxHp = 999999; s.enemies.forEach(e => e.destroy()); s.enemies = [];
      s.arena.obstacles.forEach(o => o.sprite.setVisible(false));
      const x = s.player.sprite.x, y = s.player.sprite.y;
      s.cameras.main.stopFollow(); s.cameras.main.removeBounds(); s.cameras.main.setZoom(s.game.roosterDisplay?.renderScale ?? 1);
      s.cameras.main.centerOn(x + 150, y);
      const delay = ms => new Promise(resolve => s.time.delayedCall(ms, resolve));
      const spawn = (dx, dy, config = {}) => s.entities.spawnEnemyAt({ ...s.waveSystem.makeSlime(), speed: 0, damage: 0, hp: 999999, xp: 0, showHpBar: false, ...config }, x + dx, y + dy);
      if (ability !== 'impacts') [[180, -35], [265, 35], [300, -75], [350, 55], [400, -25]].forEach(([dx, dy]) => spawn(dx, dy));
      if (ability === 'orbit') {
        s.activeAbilities.companions.orbitEvolutionId = 'evo-shell-halo'; s.activeAbilities.companions.setOrbitEggRank(4);
      } else if (ability === 'boss') {
        spawn(350, -130, { ...s.waveSystem.makeBoss(), speed: 0, hp: 999999, damage: 0 });
        s.enemyAttacks.spawnBossFireball(x + 70, y - 65, 0);
      } else if (ability === 'impacts') {
        const { playEvolutionImpact } = await import('/src/systems/EvolutionVisuals.js');
        ['sunshot-array', 'siegebreaker-shell', 'tempest-crown', 'solar-scramble', 'phoenix-pan', 'thunder-roost', 'shell-halo', 'dawn-laser', 'chick-squadron'].forEach((name, i) => {
          const px = x - 140 + i % 3 * 300, py = y - 190 + Math.floor(i / 3) * 190;
          playEvolutionImpact(s, 'evo-' + name, px, py);
          s.add.text(px, py + 55, name, { fontFamily: 'Arial', fontSize: '16px', color: '#fff5df', backgroundColor: '#162019' }).setOrigin(.5).setDepth(30);
        });
        s.player.sprite.setVisible(false); s.player.groundMarker.setVisible(false);
      } else if (ability === 'overlap') {
        spawn(235, 90, { ...s.waveSystem.makeSupport(), speed: 0, damage: 0, hp: 999999 });
        s.voidNest.rank = 4; s.voidNest.evolved = true; s.voidNest.activate(s.time.now); s.voidNest.nextAt = Infinity;
        s.molotovEgg.rank = 4; s.molotovEgg.evolved = true; s.molotovEgg.activate(s.time.now); s.molotovEgg.nextAt = Infinity;
        await delay(1050);
        s.rocketEgg.createExplosion(x + 300, y + 70, 0, 158, true, 4);
        s.laserComb.rank = 4; s.laserComb.evolved = true; s.laserComb.activate(s.time.now); s.laserComb.nextAt = Infinity;
        await delay(220);
      } else {
        s[ability].rank = rank; s[ability].evolved = evolved; s[ability].activate(s.time.now); s[ability].nextAt = Infinity;
      }
      if (wait) await delay(wait);
      s.gamePause.request('audit');
      const style = document.createElement('style'); style.textContent = 'body > :not(#game-root){display:none!important}'; document.head.append(style);
      return { id, elapsed: s.elapsed, enemies: s.enemies.length, renderer: s.game.renderer.type,
        voids: s.voidZones.filter(z => z.active).map(z => z.visual.describe()),
        lightning: s.lightningBolts.filter(b => b.active).map(b => ({ rank: b.rank, evolved: b.evolved, age: b.age, life: b.life, segments: b.segments.length })),
        laserVisuals: s.laserComb.activeVisuals.size,
        enemyProjectiles: s.enemyProjectiles.map(p => ({ texture: p.sprite.texture.key, width: p.sprite.displayWidth, age: p.age })),
        error: s.debugStats.lastError };
    }, spec);
    await page.screenshot({ path: `${output}/${id}.png` });
    if (errors.length || snapshot.error) throw Error(JSON.stringify({ id, errors, snapshot }));
    report.push(snapshot); await page.close(); console.log(`Inspected runtime: ${id}`);
  }
  if (selected) {
    const previous = JSON.parse(await fs.readFile(`${output}/runtime.json`, 'utf8'));
    report.unshift(...previous.filter(item => item.id !== selected));
  }
  await fs.writeFile(`${output}/runtime.json`, JSON.stringify(report, null, 2));
} finally { await browser.close(); await stopTestServer(server.server); }
