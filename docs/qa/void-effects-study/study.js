import Phaser from 'phaser';
import groundUrl from '../../../src/assets/map/arena-ground-farm.webp';
import aceUrl from '../../../src/assets/characters/ace-mascot/rooster-ace-mascot-idle.webp';
import supportUrl from '../../../src/assets/enemies/animations/enemy-support-run.webp';
import slimeUrl from '../../../src/assets/enemies/animations/enemy-slime-hop-v2.webp';
import { VoidZone } from './current-void-zone.js';
import { VoidConcept } from './effects.js';

const q = new URLSearchParams(location.search);
const view = ['a', 'b', 'compare', 'current'].includes(q.get('view')) ? q.get('view') : 'a';
const cycle = 8400, controls = { elapsed: 0, paused: false, speed: 1, manual: null };
const clamp = x => Math.max(0, Math.min(1, x));
const titles = { a: 'A · Sogwirbel', b: 'B · Void-Spalt', compare: 'Zwei Richtungen · gleicher EVO-Maßstab', current: 'Bisheriger Void-Effekt · zum Vergleich' };
document.getElementById('title').textContent = titles[view];
document.querySelector(`[data-view="${view}"]`).setAttribute('aria-current', 'page');
if (q.has('capture')) document.body.classList.add('capture');

class Study extends Phaser.Scene {
  preload() {
    this.load.image('ground', groundUrl);
    this.load.spritesheet('ace', aceUrl, { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('support', supportUrl, { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('slime', slimeUrl, { frameWidth: 256, frameHeight: 256 });
  }
  create() {
    this.panels = []; this.enemies = []; this.molotovEgg = { rank: 0 }; this.damageEnemy = () => {};
    const text = (x, y, value, size = 14, color = '#e9e5d9') => this.add.text(x, y, value, {
      fontFamily: 'Arial', fontSize: `${size}px`, color, fontStyle: size > 18 ? 'bold' : 'normal'
    }).setDepth(50);
    for (let i = 0; i < 2; i++) {
      const x = i * 640, evolved = view === 'compare' || i === 1;
      const kind = view === 'compare' ? (i ? 'b' : 'a') : view;
      const cx = x + 336, cy = 315;
      this.add.rectangle(x + 320, 282, 638, 564, 0x17211c).setDepth(0);
      this.add.tileSprite(x + 1, 70, 638, 438, 'ground').setOrigin(0).setTilePosition(65, 130).setDepth(1);
      const name = view === 'compare' ? `${i ? 'B · VOID-SPALT' : 'A · SOGWIRBEL'} · EVO` : evolved ? 'EVO · SINGULARITY NEST' : 'R4 · VOID NEST';
      text(x + 24, 16, name, 21, evolved ? '#e2c4ff' : '#f2ecdc');
      text(x + 24, 45, kind === 'a' ? evolved ? 'Mehr Strömungen · schwebende Funken · Implosion' : 'Spiralfäden · wanderndes Licht · kompakter Kern'
        : kind === 'b' ? evolved ? 'Höherer Spalt · aufsteigende Fragmente · Kollaps' : 'Lebendige Risskanten · Sogfäden · schwebende Splitter'
          : 'Darstellung vor der Überarbeitung · Stand 02.11.2026', 13, '#b8c4b4');
      text(x + 24, 523, `Originaler Figurenmaßstab · ${evolved ? '225' : '190'} px Feldradius`, 12, '#bac7b1');
      const state = text(x + 614, 523, 'Bereit', 12, '#dac2f2').setOrigin(1, 0);
      const player = this.add.sprite(x + 70, 272, 'ace', 16).setScale(.25).setDepth(14);
      this.add.ellipse(x + 70, 298, 34, 12, 0x312919, .22).setDepth(2);
      const support = this.add.sprite(x + 113, 387, 'support', 0).setScale(.28).setDepth(14);
      this.add.ellipse(x + 113, 411, 32, 12, 0x312919, .2).setDepth(2);
      const slimes = Array.from({ length: 3 }, () => ({
        shadow: this.add.ellipse(0, 0, 28, 10, 0x312919, .22).setDepth(2),
        sprite: this.add.sprite(0, 0, 'slime', 0).setScale(.2).setDepth(12)
      }));
      const effect = kind === 'current' ? new VoidZone(this, cx, cy, 4, evolved) : new VoidConcept(this, cx, cy, kind, evolved);
      if (kind === 'current') effect.previewObjects = [effect.outer, effect.core, effect.portal, ...effect.accentRings.map(r => r.sprite), ...effect.motes.map(m => m.sprite)];
      this.panels.push({ x, cx, cy, kind, evolved, effect, player, support, slimes, state });
    }
    window.voidStudy = {
      ready: true,
      setTime: ms => { controls.manual = ms; this.draw(ms); },
      play: () => { controls.manual = null; controls.elapsed = 0; controls.paused = false; },
      describe: () => ({ view, renderer: this.game.renderer.type === Phaser.WEBGL ? 'WEBGL' : 'CANVAS', cycleMs: cycle,
        elapsed: controls.manual ?? controls.elapsed, paused: controls.paused, speed: controls.speed, objects: this.children.list.length,
        gameplayModified: false, effects: this.panels.map(p => p.kind === 'current' ? {
          kind: 'current', evolved: p.evolved, radius: p.effect.radius, active: p.effect.previewObjects.some(s => s.visible),
          finite: p.effect.previewObjects.every(s => [s.x, s.y, s.scaleX, s.scaleY, s.alpha].every(Number.isFinite))
        } : p.effect.describe()) })
    };
    this.draw(0);
  }
  draw(ms) {
    const at = ((ms % cycle) + cycle) % cycle, age = at - 300;
    for (const p of this.panels) {
      const life = p.evolved ? 7200 : 6000;
      p.state.setText(age < 0 ? 'Bereit' : age < 480 ? 'Öffnung' : age < life - 700 ? 'Sog aktiv' : age < life ? 'Kollaps' : 'Abgeklungen');
      if (p.kind === 'current') {
        const visible = age >= 0 && age < life;
        p.effect.previewObjects.forEach(s => s.setVisible(visible));
        if (visible) {
          Object.assign(p.effect, { age, life: life - age, collapsing: age >= life - 420,
            tickFlash: Math.max(0, 1 - (age % p.effect.tickMs) / 180), nextTickAt: Infinity });
          p.effect.update(0);
        }
      } else p.effect.draw(age);
      // Deterministic illustrative traffic, identical across both concepts. No combat or balance simulation.
      p.player.setFrame(16 + Math.floor(at / 350) % 8);
      p.support.setFrame(Math.floor(at / 110) % 8);
      p.slimes.forEach(({ sprite, shadow }, i) => {
        const elapsed = age - (800 + i * 1300), duration = 2600;
        const visible = elapsed >= 0 && elapsed < duration;
        sprite.setVisible(visible); shadow.setVisible(visible);
        if (!visible) return;
        const progress = clamp(elapsed / duration), r = p.effect.radius * (1.11 - Math.pow(progress, 1.3) * 1.08);
        const angle = [-.32, 2.55, 4.35][i] + progress * .30;
        const px = p.cx + Math.cos(angle) * r, py = p.cy + Math.sin(angle) * r * .73;
        const alpha = clamp(elapsed / 180) * clamp((duration - elapsed) / 180);
        sprite.setPosition(px, py - 17).setFrame(Math.floor(at / 100) % 8).setAlpha(alpha).setDepth(py < p.cy - 8 ? 6 : 12);
        shadow.setPosition(px, py + 3).setAlpha(alpha);
      });
    }
    document.getElementById('phase').textContent = `${(at / 1000).toFixed(1)} s · Öffnung → Sog → Kollaps`;
    document.getElementById('scrub').value = at;
  }
  update(_time, delta) {
    if (!this.panels) return;
    if (!controls.paused && controls.manual === null) controls.elapsed += Math.min(delta, 100) * controls.speed;
    this.draw(controls.manual ?? controls.elapsed);
  }
}

new Phaser.Game({ type: q.get('renderer') === 'canvas' ? Phaser.CANVAS : Phaser.WEBGL,
  parent: 'stage', width: 1280, height: 564, backgroundColor: '#131d1a', antialias: true,
  pixelArt: false, roundPixels: false, audio: { noAudio: true }, banner: false, scene: Study });
document.getElementById('pause').addEventListener('click', e => {
  if (controls.manual !== null) { controls.elapsed = controls.manual; controls.manual = null; }
  controls.paused = !controls.paused; e.currentTarget.textContent = controls.paused ? 'Abspielen' : 'Pause';
});
document.getElementById('speed').addEventListener('change', e => { controls.speed = Number(e.target.value); });
document.getElementById('scrub').addEventListener('input', e => {
  controls.elapsed = Number(e.target.value); controls.manual = controls.elapsed; controls.paused = true;
  document.getElementById('pause').textContent = 'Abspielen'; window.voidStudy?.setTime(controls.elapsed);
});
