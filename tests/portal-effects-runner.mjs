// Exercise shipped objects without importing source files or enabling TestApi.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { ensureTestServer, loadPlaywright, stopTestServer } from './helpers/test-runtime.mjs';
const server = await ensureTestServer();
const browser = await loadPlaywright().chromium.launch({ headless: true, args: ['--disable-features=NetworkChangeNotifierWin'] });
const output = 'test-results/portal-effects'; await fs.mkdir(output, { recursive: true });
const reports = [];
try {
  for (const renderer of ['WEBGL', 'CANVAS']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await page.addInitScript(renderer => {
      let phaser; Object.defineProperty(window, 'Phaser', { configurable: true, get: () => phaser, set(value) {
        phaser = value; const boot = value.Game.prototype.boot;
        value.Game.prototype.boot = function(...args) { this.config.renderType = value[renderer]; window.__bundleGame = this; return boot.apply(this, args); };
      } });
    }, renderer);
    await page.goto(`${server.url}?seed=portal-effects&profile=manual&arena=open-yard`);
    await page.waitForFunction(() => window.__bundleGame?.scene.getScene('GameScene')?.player);
    const result = await page.evaluate(async () => {
      const s = window.__s = window.__bundleGame.scene.getScene('GameScene'); s.chooseRooster('ace');
      s.waveSystem.active = false; s.bot.enabled = false; s.lastShotAt = Infinity; s.player.hp = s.player.maxHp = 99999;
      s.enemies.forEach(enemy => enemy.destroy()); s.enemies = [];
      const p = s.player.sprite, delay = ms => new Promise(resolve => s.time.delayedCall(ms, resolve));
      const target = s.entities.spawnEnemyAt({ ...s.waveSystem.makeSupport(), hp: 999999, speed: 0, damage: 0 }, p.x + 240, p.y);
      // Let the normal frame update settle the camera after spawning.
      await delay(80);
      const textures = ['enemy-map-rammer-run', 'enemy-map-stomper-run', 'enemy-map-stomper-stomp', 'enemy-kornkrabbler-alley-run', 'enemy-kornkrabbler-coop-run'].every(key => s.textures.exists(key));
      const stages = [];
      for (let stage = 1; stage <= 5; stage++) {
        s.hazardZones.forEach(zone => zone.destroy()); s.hazardZones = [];
        const rank = Math.min(4, stage), evolved = stage === 5;
        s.molotovEgg.createImpact(p.x + 190, p.y + 80, rank, evolved);
        const nearest = !!s.findNearestEnemy();
        s.laserComb.rank = rank; s.laserComb.evolved = evolved; s.laserComb.activate(s.time.now);
        s.voidNest.rank = rank; s.voidNest.evolved = evolved; s.voidNest.activate(s.time.now);
        await delay(210);
        const zone = s.hazardZones[0], voidZone = s.voidZones.find(zone => zone.active);
        const frames = zone.heatSpots.map(flame => flame.sprite.frame.name);
        const laser = [...s.laserComb.activeVisuals][0]?.visual;
        const laserDrawing = !!laser?.beam.commandBuffer.length;
        await delay(130);
        stages.push({ stage, flameCount: zone.heatSpots.length, style: zone.renderStyle,
          animated: JSON.stringify(frames) !== JSON.stringify(zone.heatSpots.map(flame => flame.sprite.frame.name)),
          laserDrawing, nearest, laserCount: s.laserComb.activeVisuals.size, laserBuffers: laser?.objects.map(o => ({type:o.type, size:o.commandBuffer?.length})), voidKind: voidZone?.visual.kind, voidScale: voidZone?.visual.presentationScale });
      }
      const shot = s.enemyAttacks.spawnBossFireball(p.x - 290, p.y, 0, { speed: 140, muzzleDistance: 0 });
      await delay(250);
      const fireball = !!shot.fireballVisual?.body.commandBuffer.length && shot.sprite.alpha === 0 && shot.sprite.body.enable;
      const aura = target.auraVisual?.style === 'regen-green' && s.textures.exists('enemy-aura-live-green-ground');
      return { textures, stages, fireball, aura, count: s.waveSystem.waves[0].count };
    });
    assert(result.textures && result.fireball && result.aura); assert.equal(result.count, 25);
    for (const row of result.stages) {
      assert.equal(row.flameCount, [10, 12, 15, 16, 21][row.stage - 1]);
      assert.equal(row.style, 'animated-burn-field'); assert(row.animated && row.laserDrawing, JSON.stringify(row));
      assert.equal(row.voidKind, row.stage === 5 ? 'b' : 'a');
      assert.equal(row.voidScale, row.stage >= 4 ? .82 : 1);
    }
    await page.screenshot({ path: `${output}/${renderer}.png` });
    assert.deepEqual(errors, []); reports.push({ renderer, ...result }); await page.close();
  }
  await fs.writeFile(`${output}/verification.json`, JSON.stringify({ status: 'passed', reports }, null, 2));
  console.log('Shipped effects and map assets passed in WebGL and Canvas.');
} finally { await browser.close(); await stopTestServer(server.server); }
