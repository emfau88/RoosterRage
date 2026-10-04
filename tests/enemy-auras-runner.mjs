import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { ensureTestServer, loadPlaywright, stopTestServer } from './helpers/test-runtime.mjs';

const { server, url } = await ensureTestServer();
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const results = [];
await fs.mkdir('test-results', { recursive: true });
try {
  for (const renderer of ['WEBGL', 'CANVAS']) {
    const page = await browser.newPage({ viewport: { width: 1740, height: 1040 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.addInitScript(renderer => {
      let phaser;
      Object.defineProperty(window, 'Phaser', { configurable: true, get: () => phaser, set(value) {
        phaser = value;
        const boot = value.Game.prototype.boot;
        value.Game.prototype.boot = function(...args) {
          this.config.renderType = value[renderer]; window.__auraGame = this;
          return boot.apply(this, args);
        };
      } });
    }, renderer);
    await page.goto(`${url}?arena=open-yard&seed=enemy-aura-integration`);
    await page.waitForFunction(() => window.__auraGame?.scene.getScene('GameScene')?.player);
    const rows = await page.evaluate(() => {
      const s = window.__auraGame.scene.getScene('GameScene');
      s.chooseRooster('ace'); s.waveSystem.active = false; s.bot.enabled = false;
      s.lastShotAt = Infinity; s.player.maxHp = s.player.hp = 99999;
      for (const e of s.enemies) e.destroy(); s.enemies = [];
      const center = { x: s.player.sprite.x, y: s.player.sprite.y };
      s.cameras.main.stopFollow(); s.cameras.main.removeBounds();
      s.cameras.main.setZoom(s.game.roosterDisplay?.renderScale ?? 1);
      s.cameras.main.centerOn(center.x, center.y);
      for (const o of s.arena.obstacles) o.sprite.setVisible(false);
      for (const r of s.arena.chunkRecords) { r.landmark?.setVisible?.(false); r.decorations?.forEach?.(o => o.setVisible(false)); }
      s.player.sprite.setVisible(false); s.player.groundMarker.setVisible(false);
      const makers = ['makeEliteRunner', 'makeEliteBrute', 'makeEliteSpitter', 'makeSupport', 'makeBomber', 'makeBoss'];
      window.__auraEnemies = makers.map((make, index) => {
        const config = s.waveSystem[make]();
        const x = center.x + 320 + index % 3 * 550 - 870;
        const y = center.y + (index < 3 ? 365 : 750) - 520;
        const e = s.entities.spawnEnemyAt({ ...config, ability: null, heavyProjectile: null,
          speed: 0, showHpBar: false, entryProtectionMs: 0 }, x, y);
        e.sprite.setY(y - e.sprite.displayHeight * .28); e.sprite.stop(); e.sprite.setFrame(0);
        return e;
      });
      const style = document.createElement('style');
      style.textContent = 'body > :not(#game-root){display:none!important}'; document.head.append(style);
      return window.__auraEnemies.map(e => {
        const a = e.auraVisual ?? e.warning;
        return { type: e.type, style: a.style, radius: a.radius, physicsAuraRadius: e.aura?.radius,
          explosionRadius: e.explosionRadius, ellipseRotation: a.rotation };
      });
    });
    assert.deepEqual(rows.map(r => r.style), ['wind', 'shield', 'regen-violet', 'regen-green', 'danger', 'royal']);
    assert.deepEqual(rows.map(r => r.radius), [148, 164, 168, 185, 86, 125]);
    assert.deepEqual(rows.slice(0, 4).map(r => r.physicsAuraRadius), [185, 205, 210, 185]);
    assert.equal(rows[4].explosionRadius, 86);
    const sample = () => page.evaluate(() => window.__auraEnemies.map(e => {
      const a = e.auraVisual ?? e.warning;
      return { x: a.x, y: a.y, alpha: a.ring.alpha,
        particles: a.particles.map(p => [p.x, p.y, p.alpha]), rotation: a.rotation };
    }));
    await page.waitForTimeout(150);
    const first = await sample();
    await page.waitForTimeout(260);
    const second = await sample();
    second.forEach((value, i) => { assert.notDeepEqual(value.particles, first[i].particles); assert.equal(value.rotation, 0); });
    await page.screenshot({ path: `test-results/enemy-auras-${renderer.toLowerCase()}.png` });
    await page.evaluate(() => window.__auraGame.scene.getScene('GameScene').gamePause.request('aura-pause-test'));
    const paused = await sample();
    await page.waitForTimeout(250); assert.deepEqual(await sample(), paused, 'Aura advanced while paused');
    await page.evaluate(() => window.__auraGame.scene.getScene('GameScene').gamePause.release('aura-pause-test'));
    const moved = await page.evaluate(() => {
      const e = window.__auraEnemies[0]; e.sprite.setPosition(e.sprite.x + 70, e.sprite.y + 35);
      e.auraVisual.updateVisual();
      return { x: e.sprite.x, y: e.sprite.y + e.sprite.displayHeight * .28, auraX: e.auraVisual.x, auraY: e.auraVisual.y };
    });
    assert.equal(moved.x, moved.auraX); assert.equal(moved.y, moved.auraY);
    const lifecycle = await page.evaluate(() => {
      const s = window.__auraGame.scene.getScene('GameScene');
      const bomber = window.__auraEnemies[4];
      s.enemyAttacks.explodeEnemy(bomber);
      const deathWarning = s.children.list.filter(o => o.style === 'danger' && !o.follow).at(-1);
      const warningPosition = { x: deathWarning.x, y: deathWarning.y };
      const old = bomber.warning;
      bomber.destroy();
      const reused = s.entities.spawnEnemyAt({ ...s.waveSystem.makeSlime(), speed: 0 }, s.player.sprite.x + 600, s.player.sprite.y);
      window.__auraDeathWarning = deathWarning;
      const listenerBaseline = s.events.listenerCount('postupdate');
      for (let i = 0; i < 50; i++) {
        const e = s.entities.spawnEnemyAt({ ...s.waveSystem.makeEliteRunner(), ability: null }, reused.sprite.x, reused.sprite.y);
        e.destroy();
      }
      return { oldDestroyed: !old.scene, reusedSameEnemy: bomber === reused, ordinaryHasNoAura: !reused.warning && !reused.auraVisual,
        warningStayedAtDeath: deathWarning.x === warningPosition.x && deathWarning.y === warningPosition.y,
        listenerBaseline, listenersAfter: s.events.listenerCount('postupdate') };
    });
    assert(lifecycle.oldDestroyed && lifecycle.reusedSameEnemy && lifecycle.ordinaryHasNoAura && lifecycle.warningStayedAtDeath);
    assert.equal(lifecycle.listenersAfter, lifecycle.listenerBaseline, 'Pooled aura leaked postupdate listeners');
    await page.waitForTimeout(700);
    assert(await page.evaluate(() => !window.__auraDeathWarning.scene), 'Death warning did not expire');
    // Run buff calculations with targets on both sides of the original radius.
    const buffs = await page.evaluate(() => {
      const s = window.__auraGame.scene.getScene('GameScene');
      for (const e of s.enemies) e.destroy(); s.enemies = [];
      const x = s.player.sprite.x + 700, y = s.player.sprite.y;
      const source = s.entities.spawnEnemyAt({ ...s.waveSystem.makeEliteRunner(), speed: 0 }, x, y);
      const inside = s.entities.spawnEnemyAt({ ...s.waveSystem.makeSlime(), speed: 0 }, x + 180, y);
      const outside = s.entities.spawnEnemyAt({ ...s.waveSystem.makeSlime(), speed: 0 }, x + 190, y);
      s.enemyAttacks.updateAuras(16);
      return { visualRadius: source.auraVisual.radius, inside: inside.auraSpeedMultiplier, outside: outside.auraSpeedMultiplier };
    });
    assert.equal(buffs.visualRadius, 148); assert.equal(buffs.inside, 1.2); assert.equal(buffs.outside, 1);
    const killedCharge = await page.evaluate(() => {
      const s = window.__auraGame.scene.getScene('GameScene');
      for (const e of s.enemies) e.destroy(); s.enemies = [];
      s.events.emit('postupdate');
      const source = s.entities.spawnEnemyAt({ ...s.waveSystem.makeEliteBrute(), ability: null, speed: 0 },
        s.player.sprite.x + 700, s.player.sprite.y);
      const baseline = s.combatFeedback.activeTelegraphs;
      s.combatFeedback.showEnemyTelegraph(source, s.player, source.ability ?? {}, { duration: 500, radial: true, radius: 165 });
      const graphics = s.children.list.filter(o => o.type === 'Graphics' && o.depth === 12).at(-1);
      source.destroy();
      // Followed charge notices deactivation even if the pool immediately
      // reuses the same Enemy object for an unrelated type.
      s.entities.spawnEnemyAt({ ...s.waveSystem.makeSlime(), speed: 0 }, s.player.sprite.x + 800, s.player.sprite.y);
      s.events.emit('postupdate');
      return { baseline, after: s.combatFeedback.activeTelegraphs, graphicsDestroyed: !graphics.scene,
        radialRemoved: !s.children.list.some(o => o.style === 'danger' && !o.follow) };
    });
    assert.equal(killedCharge.after, killedCharge.baseline);
    assert(killedCharge.graphicsDestroyed && killedCharge.radialRemoved, 'Killed attack leaked its telegraph');
    // Scene restarts must remove every aura's update hook and remain playable.
    await page.evaluate(() => {
      window.__oldAuraScene = window.__auraGame.scene.getScene('GameScene');
      window.__oldAuraScene.scene.restart();
    });
    await page.waitForFunction(() => window.__auraGame.scene.getScene('GameScene')?.isChoosingRooster);
    await page.waitForTimeout(80);
    assert.deepEqual(errors, []);
    results.push({ renderer, rows, lifecycle, buffs, killedCharge, errors });
    console.log(`Enemy auras passed in ${renderer}: six styles, fixed ellipses, animation/pause/follow, 50 pool reuses, fixed death warning and unchanged buff range.`);
    await page.close();
  }
  await fs.writeFile('test-results/enemy-auras.json', JSON.stringify(results, null, 2));
} finally { await browser.close(); await stopTestServer(server); }
