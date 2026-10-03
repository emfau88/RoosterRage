import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'docs/qa/molotov-boundary');
await fs.mkdir(out, { recursive: true });
const raw = path.join(root, 'test-results/molotov-boundary/frames');
await fs.mkdir(raw, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
const browser = await chromium.launch();
const results = [];
try {
  for (const version of ['before', 'after']) {
    const dist = path.join(root, version === 'before'
      ? 'test-results/molotov-boundary/before-release' : 'dist-release');
    const server = http.createServer(async (req, res) => {
      try {
        const file = path.resolve(dist, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname.replace(/^\/$/, '/index.html')));
        if (path.relative(dist, file).startsWith('..')) { res.writeHead(403).end(); return; }
        const data = await fs.readFile(file);
        res.writeHead(200, { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream' }).end(data);
      } catch { res.writeHead(404).end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      for (const viewport of [{ width: 960, height: 540 }, { width: 390, height: 844 }]) {
        const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
        await context.addInitScript(() => {
          let phaser;
          Object.defineProperty(window, 'Phaser', { configurable: true, get: () => phaser, set(value) {
            phaser = value;
            const boot = value.Game.prototype.boot;
            value.Game.prototype.boot = function (...args) { window.__molotovGame = this; return boot.apply(this, args); };
          } });
        });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
        await page.goto(`http://127.0.0.1:${server.address().port}/?seed=molotov-boundary&arena=open-yard`);
        await page.locator('[data-run-start]').click();
        await page.evaluate(() => {
          const s = window.__molotovGame.scene.getScene('GameScene');
          s.gamePause.request('capture');
          s.hud.combatMessages.clear();
          s.cameras.main.stopFollow();
          // Hold native gameplay zoom; same world position and background in both builds.
          const x = s.player.sprite.x, y = s.player.sprite.y;
          s.cameras.main.centerOn(x + 170, y);
          window.__molotovCenter = { x: x + 170, y };
        });
        for (const stage of ['r1', 'r2', 'r3', 'r4', 'evo']) {
          const result = await page.evaluate(({ stage, version }) => {
            const s = window.__molotovGame.scene.getScene('GameScene');
            s.hazardZones.forEach(zone => zone.destroy());
            s.hazardZones = [];
            const rank = stage === 'evo' ? 4 : Number(stage.slice(1));
            const evolved = stage === 'evo';
            const { x, y } = window.__molotovCenter;
            const offsets = evolved ? [-112, 112] : rank === 4 ? [-92, 92] : [0];
            offsets.forEach(offset => s.molotovEgg.createImpact(x + offset, y, rank, evolved));
            // Remove only the launch flash so the matched images show the steady field.
            s.tweens.getTweens().filter(tween => tween.targets?.some(target =>
              ['molotov-ignition', 'molotov-embers'].includes(target.texture?.key)))
              .forEach(tween => { tween.targets.forEach(target => target.destroy()); tween.remove(); });
            const zones = s.hazardZones.map(zone => {
              zone.update(600);
              zone.heatSpots.forEach(spot => { spot.sprite.anims.pause(); spot.sprite.setFrame(5); });
              const hits = [], burned = [];
              const targets = Array.from({ length: 16 }, (_, index) => {
                const inside = index % 2 === 0;
                const angle = Math.floor(index / 2) * Math.PI / 4;
                const distance = zone.radius + (inside ? -1 : 1);
                return { id: index, sprite: { active: true, x: zone.x + Math.cos(angle) * distance,
                  y: zone.y + Math.sin(angle) * distance }, applyBurn: () => burned.push(index) };
              });
              const enemies = s.enemies, damage = s.damageEnemy;
              try {
                s.enemies = targets;
                s.damageEnemy = (enemy, amount) => hits.push({ id: enemy.id, amount });
                zone.applyDamageTick();
              } finally { s.enemies = enemies; s.damageEnemy = damage; }
              return { radius: zone.radius, damage: zone.damage, tickMs: zone.tickMs, maxLife: zone.maxLife,
                flames: zone.heatSpots.length, width: zone.groundSprite.displayWidth,
                height: zone.groundSprite.displayHeight, hits, burned,
                flamePositions: zone.heatSpots.map(spot => ({ x: spot.sprite.x - zone.x,
                  y: spot.sprite.y - zone.y, edge: spot.edge ?? false })) };
            });
            return { stage, version, zones };
          }, { stage, version });
          for (const zone of result.zones) {
            assert.deepEqual(zone.hits.map(hit => hit.id), [0, 2, 4, 6, 8, 10, 12, 14]);
            assert.deepEqual(zone.burned, [0, 2, 4, 6, 8, 10, 12, 14]);
            assert(zone.hits.every(hit => hit.amount === zone.damage));
            if (version === 'after') {
              assert(zone.width > zone.height * 1.5);
              assert(zone.flamePositions.every(spot => Math.hypot(spot.x, spot.y) < zone.radius));
              assert(zone.flamePositions.filter(spot => spot.edge).length >= 8);
            }
          }
          await page.waitForTimeout(80);
          await page.screenshot({ path: path.join(raw, `${stage}-${viewport.width}-${version}.png`) });
          const cleaned = await page.evaluate(() => {
            const s = window.__molotovGame.scene.getScene('GameScene');
            return s.hazardZones.every(zone => {
              const objects = [zone.groundSprite, zone.rim, zone.embers, ...zone.lobes,
                ...zone.heatSpots.map(spot => spot.sprite)];
              zone.update(zone.maxLife);
              return !zone.active && objects.every(object => !object.active);
            });
          });
          assert(cleaned, 'An expired field left visible flame objects behind');
          results.push({ ...result, viewport, cleaned });
        }
        assert.deepEqual(errors, []);
        await context.close();
      }
    } finally { await new Promise(resolve => server.close(resolve)); }
  }
  const mechanics = version => results.filter(result => result.version === version).map(result => ({
    stage: result.stage, viewport: result.viewport, zones: result.zones.map(({ radius, damage, tickMs, maxLife, hits, burned, width, height }) =>
      ({ radius, damage, tickMs, maxLife, hits, burned, width, height })) }));
  assert.deepEqual(mechanics('before'), mechanics('after'), 'Molotov mechanics changed during the visual pass');
  await fs.writeFile(path.join(out, 'checks.json'), JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
  console.log('Molotov matched comparisons, damage boundary, unchanged mechanics and cleanup passed.');
} finally { await browser.close(); }
