import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { ensureTestServer, loadPlaywright, stopTestServer } from './helpers/test-runtime.mjs';

const { server, url } = await ensureTestServer();
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
await fs.mkdir('test-results', { recursive: true });
const reports = [];
try {
  for (const renderer of ['WEBGL', 'CANVAS']) {
    const page = await browser.newPage({ viewport: { width: 1740, height: 1040 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(renderer => {
      let phaser;
      Object.defineProperty(window, 'Phaser', { configurable: true, get: () => phaser, set(value) {
        phaser = value; const boot = value.Game.prototype.boot;
        value.Game.prototype.boot = function(...args) { this.config.renderType = value[renderer]; window.__layerGame = this; return boot.apply(this, args); };
      } });
    }, renderer);
    await page.goto(`${url}?arena=square-coop&seed=aura-layer-check`);
    await page.waitForFunction(() => window.__layerGame?.scene.getScene('GameScene')?.player);
    const rows = await page.evaluate(() => {
      const s = window.__layerGame.scene.getScene('GameScene');
      s.chooseRooster('ace'); s.waveSystem.active = false; s.bot.enabled = false; s.lastShotAt = Infinity;
      for (const e of s.enemies) e.destroy(); s.enemies = [];
      s.player.sprite.setVisible(false); s.player.groundMarker.setVisible(false);
      const center = { x: s.player.sprite.x, y: s.player.sprite.y };
      s.cameras.main.stopFollow(); s.cameras.main.removeBounds(); s.cameras.main.setZoom(s.game.roosterDisplay?.renderScale ?? 1);
      s.cameras.main.centerOn(center.x, center.y);
      const originals = [...s.arena.obstacles]; originals.forEach(o => o.sprite.setVisible(false));
      const propConfigs = ['square-tractor', 'square-hay-nw', 'square-crate-north'].map(id => originals.find(o => o.id === id));
      const makers = ['makeEliteRunner', 'makeEliteBrute', 'makeEliteSpitter', 'makeSupport', 'makeBomber', 'makeBoss'];
      const rows = []; window.__layerAuras = [];
      makers.forEach((make, index) => {
        const screen = { x: 320 + index % 3 * 550, y: index < 3 ? 310 : 730 };
        const point = { x: center.x + screen.x - 870, y: center.y + screen.y - 520 };
        const config = s.waveSystem[make]();
        const source = s.entities.spawnEnemyAt({ ...config, ability: null, heavyProjectile: null, bossSequences: [],
          entryProtectionMs: 0, speed: 0, showHpBar: false }, point.x, point.y);
        const aura = source.auraVisual ?? source.warning;
        // Back rim passes through the foreground object's opaque center.
        const groundY = point.y + aura.radius * .42;
        source.sprite.setY(groundY - source.sprite.displayHeight * .28); source.sprite.stop(); source.sprite.setFrame(0);
        aura.updateVisual(); window.__layerAuras.push(aura);
        let foreground;
        if (index < 3) {
          const original = propConfigs[index];
          // Reuse a prop created before the enemy, like normal arena props.
          // Recreating it after the aura would hide equal-depth ordering bugs.
          foreground = original.sprite.setPosition(point.x, point.y).setVisible(true);
          foreground.refreshBody();
        } else {
          foreground = s.entities.spawnEnemyAt({ ...s.waveSystem.makeEliteBrute(), aura: null, ability: null,
            speed: 0, showHpBar: false }, point.x, point.y).sprite;
          foreground.stop(); foreground.setFrame(0);
        }
        const label = index < 3 ? ['Traktor (fest)', 'Heuballen', 'Kiste'][index] : 'Anderer Mob';
        s.add.text(point.x, point.y + 165, `${source.displayName} · ${label}`, {
          fontFamily: 'Arial', fontSize: '18px', color: '#fff8de', backgroundColor: '#182018', padding: {x:12,y:8}
        }).setOrigin(.5).setDepth(30);
        rows.push({ style: aura.style, foreground: label, auraDepth: aura.depth, foregroundDepth: foreground.depth,
          roi: [screen.x - 10, screen.y - 8, screen.x + 10, screen.y + 8] });
      });
      s.children.depthSort(); s.gamePause.request('layer-capture');
      const css = document.createElement('style'); css.textContent = 'body > :not(#game-root){display:none!important}'; document.head.append(css);
      return rows;
    });
    await page.screenshot({ path: `test-results/aura-layers-${renderer.toLowerCase()}.png` });
    await page.evaluate(() => window.__layerAuras.forEach(a => a.setVisible(false)));
    await page.screenshot({ path: `test-results/aura-layers-${renderer.toLowerCase()}-baseline.png` });
    reports.push({ renderer, rows, errors });
    await page.close();
  }
  await fs.writeFile('test-results/aura-layers.json', JSON.stringify(reports, null, 2));
  for (const report of reports) {
    assert.deepEqual(report.errors, []);
    for (const row of report.rows) assert(row.auraDepth < row.foregroundDepth,
      `${report.renderer}: ${row.style} aura shares/overlays ${row.foreground} layer (${row.auraDepth} >= ${row.foregroundDepth})`);
  }
  console.log('Aura layers passed: all six styles beneath solid props, hay, crates and other mobs in WebGL + Canvas.');
} finally { await browser.close(); await stopTestServer(server); }
