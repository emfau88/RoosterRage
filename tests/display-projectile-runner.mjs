import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { ensureTestServer, loadPlaywright, stopTestServer } from './helpers/test-runtime.mjs';

const { server, url } = await ensureTestServer();
const browser = await loadPlaywright().chromium.launch();
const reports = [];
await fs.mkdir('test-results', { recursive: true });
try {
  for (const renderer of ['WEBGL', 'CANVAS']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(renderer => {
      let phaser;
      Object.defineProperty(window, 'Phaser', { configurable: true, get: () => phaser, set(value) {
        phaser = value;
        const boot = value.Game.prototype.boot;
        value.Game.prototype.boot = function(...args) {
          this.config.renderType = value[renderer]; window.__displayGame = this;
          return boot.apply(this, args);
        };
      } });
    }, renderer);
    await page.goto(`${url}?arena=square-coop&seed=display-projectile`);
    await page.waitForFunction(() => window.__displayGame?.scene.getScene('GameScene')?.player);
    await page.evaluate(() => {
      const s = window.__displayGame.scene.getScene('GameScene');
      s.meta.unlockAllForTesting(); s.startRunFromHub('ace', 'featherweight');
    });
    await page.waitForFunction(() => {
      const s = window.__displayGame.scene.getScene('GameScene');
      return s?.challenge?.id === 'featherweight' && s.player && !s.isChoosingRooster;
    });
    await page.evaluate(() => {
      const s = window.__displayGame.scene.getScene('GameScene');
      s.waveSystem.active = false; s.bot.enabled = false; s.lastShotAt = Infinity;
      for (const e of s.enemies) e.destroy(); s.enemies = [];
    });
    const sizes = [];
    for (const size of [
      { width: 1920, height: 1080 }, { width: 2560, height: 1440 },
      { width: 3440, height: 1440 }, { width: 1440, height: 1600 },
      { width: 1280, height: 800 }, { width: 390, height: 844 }
    ]) {
      await page.setViewportSize(size);
      await page.waitForFunction(({ width, height }) => {
        const d = window.__displayGame.roosterDisplay; return d.width === width && d.height === height;
      }, size);
      await page.waitForTimeout(100);
      const row = await page.evaluate(() => {
        const s = window.__displayGame.scene.getScene('GameScene'), c = s.cameras.main;
        const canvas = s.game.canvas, r = canvas.getBoundingClientRect();
        const project = (x, y) => {
          const p = c.matrix.transformPoint(x - c.scrollX, y - c.scrollY);
          return [p.x * r.width / canvas.width, p.y * r.height / canvas.height];
        };
        return { viewport: [innerWidth, innerHeight], css: [r.x, r.y, r.width, r.height],
          camera: [c.x, c.y, c.width, c.height], canvas: [canvas.width, canvas.height],
          center: project(700, 450), corners: [project(0, 0), project(1400, 900)],
          zoom: s.logicalCameraZoom, physics: { x:s.physics.world.bounds.x, y:s.physics.world.bounds.y,
            width:s.physics.world.bounds.width, height:s.physics.world.bounds.height } };
      });
      assert.deepEqual(row.camera, [0, 0, ...row.canvas]);
      assert(row.css.every((v, i) => Math.abs(v - [0, 0, size.width, size.height][i]) < 1));
      assert.deepEqual(row.physics, { x: 0, y: 0, width: 1400, height: 900 });
      if (size.width >= 1400 && size.height >= 900) {
        assert(Math.abs(row.center[0] - size.width / 2) < 1 && Math.abs(row.center[1] - size.height / 2) < 1,
          `Arena is not centered: ${JSON.stringify(row)}`);
        const [[left, top], [right, bottom]] = row.corners;
        assert(left >= -1 && top >= -1 && right <= size.width + 1 && bottom <= size.height + 1,
          'Large-screen arena is clipped');
        assert(Math.abs(right - left - size.width) < 1 || Math.abs(bottom - top - size.height) < 1,
          'Arena does not fill the limiting screen dimension');
      }
      sizes.push(row);
      if (size.width === 1920) await page.screenshot({ path: `test-results/featherweight-${renderer.toLowerCase()}.png` });
    }
    // Exercise the real Fullscreen API as well as the large-window resize path.
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.locator('[data-fullscreen]').click();
    await page.waitForFunction(() => document.fullscreenElement === document.documentElement);
    await page.evaluate(() => document.exitFullscreen());
    await page.waitForFunction(() => !document.fullscreenElement);
    await page.waitForTimeout(100);
    const rockets = await page.evaluate(async () => {
      const s = window.__displayGame.scene.getScene('GameScene');
      // Obtain the production constructor through a real ability launch; this
      // also works against the bundled release without importing source files.
      const seed = s.entities.spawnEnemyAt({ ...s.waveSystem.makeEliteBrute(), aura:null, ability:null,
        speed:0, showHpBar:false }, s.player.sprite.x + 300, s.player.sprite.y);
      s.rocketEgg.rank = 1; s.rocketEgg.activate(s.time.now);
      await new Promise(resolve => s.time.delayedCall(20, resolve));
      const Rocket = s.rocketProjectiles[0].constructor;
      s.rocketProjectiles.forEach(p => p.destroy()); s.rocketProjectiles = [];
      seed.destroy(); s.enemies = []; s.rocketEgg.rank = 0;
      const baseline = s.events.listenerCount('postupdate');
      const fixtures = [];
      for (let variant = 0; variant < 5; variant++) {
        for (let direction = 0; direction < 8; direction++) {
          const a = direction * Math.PI / 4;
          const x = 250 + direction * 120, y = 170 + variant * 135;
          const target = { sprite: { x:x + Math.cos(a)*1000, y:y + Math.sin(a)*1000, active:true } };
          const p = new Rocket(s, x, y, target, Math.min(4, variant + 1), variant === 4);
          s.rocketProjectiles.push(p);
          fixtures.push({ p, target, previous:{x,y}, angle:a, moves:0, maxAngleError:0, maxExhaustError:0 });
        }
      }
      const angleError = (a,b) => Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
      await new Promise(resolve => {
        let frame = 0;
        const sample = () => {
          for (const f of fixtures) {
            const {p} = f, dx = p.sprite.x - f.previous.x, dy = p.sprite.y - f.previous.y;
            if (Math.hypot(dx,dy) > .001) {
              f.moves++;
              f.maxAngleError = Math.max(f.maxAngleError, angleError(p.sprite.rotation, Math.atan2(dy,dx)));
            }
            const rear = p.sprite.displayWidth * .32;
            f.maxExhaustError = Math.max(f.maxExhaustError,
              Math.hypot(p.trail.x - (p.sprite.x - Math.cos(p.sprite.rotation)*rear),
                p.trail.y - (p.sprite.y - Math.sin(p.sprite.rotation)*rear)));
            f.previous = {x:p.sprite.x,y:p.sprite.y};
            // Moving targets require continued steering, including diagonal
            // and reverse turns rather than only testing straight launches.
            f.target.sprite.x += Math.cos(f.angle + Math.PI/2)*12;
            f.target.sprite.y += Math.sin(f.angle + Math.PI/2)*12;
          }
          if (++frame === 35) {s.events.off('postupdate',sample);resolve();}
        };
        s.events.on('postupdate',sample);
      });
      s.gamePause.request('rocket-pause');
      const held = fixtures.map(f => [f.p.sprite.x,f.p.sprite.y,f.p.sprite.rotation,f.p.trail.x,f.p.trail.y]);
      await new Promise(resolve => setTimeout(resolve,120));
      const pauseHeld = JSON.stringify(held) === JSON.stringify(fixtures.map(f =>
        [f.p.sprite.x,f.p.sprite.y,f.p.sprite.rotation,f.p.trail.x,f.p.trail.y]));
      const rows = fixtures.map(f => ({ rank:f.p.rank, evolved:f.p.evolved, moves:f.moves,
        maxAngleError:f.maxAngleError, maxExhaustError:f.maxExhaustError }));
      fixtures.forEach(f => f.p.destroy()); s.rocketProjectiles = [];
      const after = s.events.listenerCount('postupdate');
      s.gamePause.release('rocket-pause');
      return { rows, pauseHeld, baseline, after };
    });
    assert(rockets.pauseHeld, 'Rocket/exhaust drift during pause');
    assert.equal(rockets.after, rockets.baseline, 'Rocket post-update hooks leak after destruction');
    for (const row of rockets.rows) {
      assert(row.moves >= 25, 'Rocket did not actually fly');
      assert(row.maxAngleError < .00001, `Rocket nose differs from executed flight: ${JSON.stringify(row)}`);
      assert(row.maxExhaustError < .001, `Exhaust detaches from nozzle: ${JSON.stringify(row)}`);
    }
    assert.deepEqual(errors, []);
    reports.push({ renderer, sizes, rockets });
    console.log(`Display/projectiles passed in ${renderer}: large-screen arena fit/center, resize + fullscreen, unchanged physics, 40 steering rockets, exhaust follow, pause and cleanup.`);
    await page.close();
  }
  await fs.writeFile('test-results/display-projectiles.json', JSON.stringify(reports,null,2));
} finally { await browser.close(); await stopTestServer(server); }
