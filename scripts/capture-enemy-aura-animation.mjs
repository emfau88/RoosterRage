import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ensureTestServer, loadPlaywright, stopTestServer } from '../tests/helpers/test-runtime.mjs';

const metrics = [];
for (const version of ['v1', 'v2']) {
  const directory = `art-source/fx/enemy-auras-${version}`;
  for (const meta of JSON.parse(await fs.readFile(`${directory}/preview-metrics.json`, 'utf8'))) {
    metrics.push({ ...meta, url: `/${directory}/${meta.file}` });
  }
}
const output = 'docs/qa/enemy-auras-v2';
const fps = 20, seconds = 8;
const frames = await fs.mkdtemp(path.join(os.tmpdir(), 'rooster-aura-preview-'));
const server = await ensureTestServer();
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1740, height: 1040 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.addInitScript(() => {
  let phaser;
  Object.defineProperty(window, 'Phaser', { configurable: true, get: () => phaser, set(value) {
    phaser = value;
    const boot = value.Game.prototype.boot;
    value.Game.prototype.boot = function(...args) {
      this.config.renderType = value.WEBGL;
      window.__auraPreviewGame = this;
      return boot.apply(this, args);
    };
  } });
});
try {
  await page.goto(`${server.url}?arena=open-yard&seed=enemy-aura-preview-v1`);
  await page.waitForFunction(() => window.__auraPreviewGame?.scene.getScene('GameScene')?.player);
  await page.evaluate(async metrics => {
    const s = window.__auraPreviewGame.scene.getScene('GameScene');
    s.chooseRooster('ace'); s.waveSystem.active = false; s.bot.enabled = false;
    s.lastShotAt = Infinity;
    s.gamePause.request('aura-art-preview');
    for (const enemy of s.enemies) enemy.destroy(); s.enemies = [];
    s.projectiles.forEach(p => p.destroy()); s.projectiles = [];
    s.player.sprite.setVisible(false); s.player.groundMarker.setVisible(false);
    s.pickupIndicators.hide();
    await new Promise(resolve => {
      for (const asset of metrics) s.load.image(`preview-aura-${asset.id}`, asset.url);
      s.load.once('complete', resolve); s.load.start();
    });
    const center = { x: s.player.sprite.x, y: s.player.sprite.y };
    const camera = s.cameras.main;
    const renderScale = s.game.roosterDisplay?.renderScale ?? 1;
    camera.stopFollow(); camera.removeBounds(); camera.setZoom(renderScale);
    camera.centerOn(center.x, center.y);
    // Actual Harvest Yard tiles remain in the scene. Hide obstructing props
    // only for this presentation so every enemy and hollow aura is visible.
    for (const obstacle of s.arena.obstacles) obstacle.sprite.setVisible(false);
    for (const record of s.arena.chunkRecords) {
      record.landmark?.setVisible?.(false);
      record.decorations?.forEach?.(o => o.setVisible(false));
    }
    const specs = [
      { id: 'wind-slim', effect: 'wind', make: 'makeEliteRunner', title: 'TURBO GOOSE', label: 'Tempo · laufende Windlichter', tint: null, radius: 148, alpha: 0.7 },
      { id: 'shield-slim', effect: 'shield', make: 'makeEliteBrute', title: 'PANZER TURKEY', label: 'Rüstung · leuchtende Schildsegmente', tint: null, radius: 164, alpha: 0.65 },
      { id: 'regen-slim', effect: 'regen', make: 'makeEliteSpitter', title: 'CHILI GOBBLER', label: 'Regeneration · aufsteigende Lichtpunkte', tint: 0xc18aff, radius: 168, alpha: 0.65 },
      { id: 'regen', make: 'makeSupport', title: 'BROOD TENDER', label: 'Regeneration · grüner Kranz', tint: 0x65ef8b, radius: 185, alpha: 0.65 },
      { id: 'danger', make: 'makeBomber', title: 'BOMBER', label: 'Explosion · roter Gefahrenkranz', tint: null, radius: 86, alpha: 0.85 },
      { id: 'royal', make: 'makeBoss', title: 'THE BROOD KING', label: 'Boss-Effekt · königlicher Kranz', tint: null, radius: 125, alpha: 0.8 }
    ];
    const rows = [];
    const animated = [];
    const glow = s.make.graphics({ x: 0, y: 0, add: false });
    for (const [radius, alpha] of [[7, .035], [5, .075], [3, .22], [1.5, .95]]) {
      glow.fillStyle(0xffffff, alpha); glow.fillCircle(8, 8, radius);
    }
    glow.generateTexture('aura-preview-glint', 16, 16); glow.destroy();
    for (let index = 0; index < specs.length; index++) {
      const spec = specs[index];
      const screen = { x: 320 + index % 3 * 550, y: index < 3 ? 365 : 750 };
      const ground = { x: center.x + screen.x - 870, y: center.y + screen.y - 520 };
      const config = s.waveSystem[spec.make]();
      // Spawn the real current enemy artwork with normal scale; disable attack
      // and legacy graphics in this paused preview, not in production code.
      const enemy = s.entities.spawnEnemyAt({ ...config, aura: null, ability: null,
        heavyProjectile: null, entryProtectionMs: 0, explodeOnDeath: false,
        speed: 0, showHpBar: false }, ground.x, ground.y);
      enemy.sprite.setY(ground.y - enemy.sprite.displayHeight * 0.28);
      enemy.sprite.stop(); enemy.sprite.setFrame(0);
      const meta = metrics.find(m => m.id === spec.id);
      const [left, top, right, bottom] = meta.crop;
      const diameter = spec.radius * 2;
      const scaleX = diameter / (right - left);
      const scaleY = diameter * 0.42 / (bottom - top);
      const crop = { x: Math.max(0, left - 18), y: Math.max(0, top - 18),
        right: Math.min(meta.size[0], right + 18), bottom: Math.min(meta.size[1], bottom + 18) };
      const ring = s.add.image(
        ground.x + (meta.size[0] / 2 - (left + right) / 2) * scaleX,
        ground.y + (meta.size[1] / 2 - (top + bottom) / 2) * scaleY,
        `preview-aura-${spec.id}`)
        .setCrop(crop.x, crop.y, crop.right - crop.x, crop.bottom - crop.y)
        .setScale(scaleX, scaleY).setDepth(3).setAlpha(spec.alpha);
      if (spec.tint !== null) ring.setTint(spec.tint);
      const highlight = s.add.image(ring.x, ring.y, ring.texture.key)
        .setCrop(crop.x, crop.y, crop.right - crop.x, crop.bottom - crop.y)
        .setScale(scaleX, scaleY).setDepth(3.01).setBlendMode('ADD');
      if (spec.tint !== null) highlight.setTint(spec.tint);
      const mask = s.make.graphics({ x: 0, y: 0, add: false });
      highlight.setMask(mask.createGeometryMask());
      const effect = spec.effect ?? spec.id;
      const color = spec.tint ?? ({wind:0xffd55f, shield:0x9eeaff, danger:0xff8638, royal:0xffd477}[effect]);
      const particles = Array.from({ length: effect === 'regen' ? 8 : 4 }, () =>
        s.add.image(ground.x, ground.y, 'aura-preview-glint').setTint(color)
          .setDepth(3.02).setBlendMode('ADD'));
      animated.push({ spec, effect, ground, meta, ring, highlight, mask, particles,
        scaleX, scaleY, diameter });
      rows.push({ ...spec, screen, enemyTexture: enemy.sprite.texture.key,
        enemySize: { width: enemy.sprite.displayWidth, height: enemy.sprite.displayHeight },
        displayedAura: { width: diameter, height: diameter * 0.42 } });
    }
    const style = document.createElement('style');
    style.textContent = `body > :not(#game-root):not(#aura-preview-labels){display:none!important}
      #aura-preview-labels{position:fixed;inset:0;pointer-events:none;z-index:99999;font-family:Arial,sans-serif;color:#fff6df}
      .aura-preview-heading{position:absolute;left:40px;right:40px;top:28px;padding:20px 24px;border-radius:12px;background:rgba(20,29,22,.9);border:1px solid #8a805e}
      .aura-preview-heading strong{font-size:27px;letter-spacing:2px}.aura-preview-heading p{margin:9px 0 0;font-size:16px;color:#d2d7c4}
      .aura-preview-caption{position:absolute;width:430px;transform:translateX(-50%);text-align:center;background:rgba(20,27,22,.88);border:1px solid rgba(215,204,153,.5);border-radius:10px;padding:12px 10px}
      .aura-preview-caption strong{display:block;font-size:19px;letter-spacing:1.5px}.aura-preview-caption span{display:block;margin-top:6px;font-size:15px;color:#d4dfc9}
      .aura-preview-footer{position:absolute;left:44px;bottom:22px;font-size:14px;background:rgba(20,27,22,.88);padding:10px 14px;border-radius:8px}`;
    document.head.append(style);
    const root = document.createElement('div'); root.id = 'aura-preview-labels';
    root.innerHTML = `<div class="aura-preview-heading"><strong>ROOSTER RAGE · ANIMIERTE AUREN</strong><p>Obere Reihe: Radius −20 % und schlankere Ränder · flache Ellipsen mit transparentem Innenbereich</p></div>`;
    for (const row of rows) {
      const caption = document.createElement('div'); caption.className = 'aura-preview-caption';
      caption.style.left = `${row.screen.x}px`; caption.style.top = `${row.screen.y + 125}px`;
      caption.innerHTML = `<strong>${row.title}</strong><span>${row.label}</span>`;
      root.append(caption);
    }
    root.insertAdjacentHTML('beforeend', '<div class="aura-preview-footer">Animierte Vorschau im Spielrenderer · echte Gegner und Map · noch nicht im Live-Build</div>');
    document.body.append(root);
    window.__auraPreviewRows = rows;
    // All periods divide the eight-second loop. The texture stays on the
    // ground plane: only light sectors travel, never the entire ellipse.
    window.__setAuraPreviewTime = milliseconds => {
      const time = milliseconds / 1000;
      for (const a of animated) {
        const { effect, ground, spec, mask, particles, ring, highlight } = a;
        const rx = spec.radius * .95, ry = spec.radius * .42 * .95;
        const period = { wind: 2, shield: 4, regen: 4, danger: 1, royal: 4 }[effect];
        const phase = time / period * Math.PI * 2;
        const pulse = (Math.sin(phase) + 1) / 2;
        ring.setAlpha(spec.alpha * (effect === 'danger' ? .76 + .24 * pulse : .9 + .1 * pulse));
        highlight.setAlpha(effect === 'danger' ? .12 + .24 * pulse : .23);
        mask.clear(); mask.fillStyle(0xffffff, 1);
        const sectors = effect === 'wind' ? 2 : 1;
        const sweep = effect === 'shield' ? .65 : 1.0;
        for (let sector = 0; sector < sectors; sector++) {
          const start = phase + sector * Math.PI;
          mask.beginPath(); mask.moveTo(ground.x, ground.y);
          for (let j = 0; j <= 16; j++) {
            const angle = start + j / 16 * sweep;
            mask.lineTo(ground.x + Math.cos(angle) * spec.radius * 1.35,
              ground.y + Math.sin(angle) * spec.radius * .42 * 1.6);
          }
          mask.closePath(); mask.fillPath();
        }
        particles.forEach((particle, index) => {
          const offset = index / particles.length;
          if (effect === 'regen') {
            const life = (time / 2 + offset) % 1;
            const angle = offset * Math.PI * 2 + phase;
            particle.setPosition(ground.x + Math.cos(angle) * rx,
              ground.y + Math.sin(angle) * ry - life * 22);
            particle.setAlpha(Math.sin(life * Math.PI) * .7).setScale(.5 + .4 * (1 - life));
          } else {
            const angle = phase + offset * Math.PI * 2;
            particle.setPosition(ground.x + Math.cos(angle) * rx, ground.y + Math.sin(angle) * ry);
            particle.setAlpha((effect === 'danger' ? .4 + .5 * pulse : .65) * (index < 2 ? 1 : .55));
            particle.setScale(effect === 'wind' ? 1.0 : .8);
          }
        });
      }
    };
    window.__setAuraPreviewTime(0);
    if (s.game.renderer.type !== window.Phaser.WEBGL) throw new Error('Preview requires WebGL for actual green/violet tinting.');
  }, metrics);
  await page.waitForTimeout(350);
  await fs.mkdir(output, { recursive: true });
  for (let frame = 0; frame < seconds * fps; frame++) {
    await page.evaluate(async milliseconds => {
      window.__setAuraPreviewTime(milliseconds);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }, frame * 1000 / fps);
    await page.screenshot({ path: path.join(frames, `frame-${String(frame).padStart(4, '0')}.png`) });
    if (frame === 20) await page.screenshot({ path: `${output}/all-enemies-ingame.png` });
    if (frame % 40 === 0) console.log(`Captured ${frame}/${seconds * fps} animation frames.`);
  }
  const rows = await page.evaluate(() => window.__auraPreviewRows);
  await fs.writeFile(`${output}/preview-report.json`, JSON.stringify({ rows, errors, fps, seconds, frames: seconds * fps }, null, 2));
  if (errors.length) throw new Error(errors.join('\n'));
  const input = path.join(frames, 'frame-%04d.png');
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-framerate', String(fps), '-i', input,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    `${output}/all-enemies-animated.mp4`]);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-framerate', String(fps), '-i', input,
    '-filter_complex', '[0:v]scale=1305:780:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3',
    '-loop', '0', `${output}/all-enemies-animated.gif`]);
  console.log('Captured and encoded six animated aura variants in the actual game renderer.');
  // Delete only this exact mkdtemp directory, checked against the OS temp root.
  const relative = path.relative(os.tmpdir(), frames);
  if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) await fs.rm(frames, { recursive: true });
} finally { await browser.close(); await stopTestServer(server.server); }
