import fs from 'node:fs/promises';
import { ensureTestServer, loadPlaywright, stopTestServer } from '../tests/helpers/test-runtime.mjs';

const metrics = JSON.parse(await fs.readFile('art-source/fx/enemy-auras-v1/preview-metrics.json', 'utf8'));
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
      for (const asset of metrics) s.load.image(`preview-aura-${asset.id}`, `/art-source/fx/enemy-auras-v1/${asset.file}`);
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
      { id: 'wind', make: 'makeEliteRunner', title: 'TURBO GOOSE', label: 'Tempo · goldener Windkranz', tint: null, radius: 185, alpha: 0.7 },
      { id: 'shield', make: 'makeEliteBrute', title: 'PANZER TURKEY', label: 'Rüstung · blauer Schildkranz', tint: null, radius: 205, alpha: 0.65 },
      { id: 'regen', make: 'makeEliteSpitter', title: 'CHILI GOBBLER', label: 'Regeneration · violetter Kranz', tint: 0xc18aff, radius: 210, alpha: 0.65 },
      { id: 'regen', make: 'makeSupport', title: 'BROOD TENDER', label: 'Regeneration · grüner Kranz', tint: 0x65ef8b, radius: 185, alpha: 0.65 },
      { id: 'danger', make: 'makeBomber', title: 'BOMBER', label: 'Explosion · roter Gefahrenkranz', tint: null, radius: 86, alpha: 0.85 },
      { id: 'royal', make: 'makeBoss', title: 'THE BROOD KING', label: 'Boss-Effekt · königlicher Kranz', tint: null, radius: 125, alpha: 0.8 }
    ];
    const rows = [];
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
    root.innerHTML = `<div class="aura-preview-heading"><strong>ROOSTER RAGE · AUREN-VORSCHAU</strong><p>Echte Gegner auf Harvest Yard · elliptische Effektkränze · vollständig transparenter Innenbereich</p></div>`;
    for (const row of rows) {
      const caption = document.createElement('div'); caption.className = 'aura-preview-caption';
      caption.style.left = `${row.screen.x}px`; caption.style.top = `${row.screen.y + 125}px`;
      caption.innerHTML = `<strong>${row.title}</strong><span>${row.label}</span>`;
      root.append(caption);
    }
    root.insertAdjacentHTML('beforeend', '<div class="aura-preview-footer">Gestellte Vorschau im Spielrenderer · Standbild der geplanten Effekte · noch nicht in den Live-Build eingebaut</div>');
    document.body.append(root);
    window.__auraPreviewRows = rows;
    if (s.game.renderer.type !== window.Phaser.WEBGL) throw new Error('Preview requires WebGL for actual green/violet tinting.');
  }, metrics);
  await page.waitForTimeout(350);
  await fs.mkdir('docs/qa/enemy-auras-v1', { recursive: true });
  await page.screenshot({ path: 'docs/qa/enemy-auras-v1/all-enemies-ingame.png' });
  const rows = await page.evaluate(() => window.__auraPreviewRows);
  await fs.writeFile('docs/qa/enemy-auras-v1/preview-report.json', JSON.stringify({ rows, errors }, null, 2));
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Captured six aura variants with actual enemy sprites on Harvest Yard.');
} finally { await browser.close(); await stopTestServer(server.server); }
