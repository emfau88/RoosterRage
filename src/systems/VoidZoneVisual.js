// Approved Void choreography: vortex for R1–R4, upright rift for EVO.
import Phaser from 'phaser';
import { ribbon, ease, fract, TAU } from './EnemyAuraAnimation.js';

const clamp = x => Math.max(0, Math.min(1, x));
function texture(scene, key, stops) {
  if (scene.textures.exists(key)) return;
  const t = scene.textures.createCanvas(key, 128, 128), c = t.getContext();
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [p, color] of stops) g.addColorStop(p, color);
  c.fillStyle = g; c.fillRect(0, 0, 128, 128); t.refresh();
}
function path(n, fn) { return Array.from({ length: n }, (_, i) => fn(i / (n - 1))); }
function feather(g, x, y, size, angle, color, alpha) {
  const cs = Math.cos(angle), sn = Math.sin(angle);
  const p = (u, v) => ({ x: x + u * cs - v * sn, y: y + u * sn + v * cs });
  g.fillStyle(0x301747, alpha * .65).fillPoints([p(-size, 0), p(-size * .2, -size * .5), p(size, 0), p(-size * .2, size * .42)], true);
  g.fillStyle(color, alpha).fillPoints([p(-size * .75, 0), p(-size * .13, -size * .29), p(size * .82, 0), p(-size * .13, size * .2)], true);
  g.lineStyle(.8, 0xeee2ff, alpha * .65).lineBetween(x - cs * size * .6, y - sn * size * .6, x + cs * size * .75, y + sn * size * .75);
}

export class VoidZoneVisual {
  constructor(scene, x, y, rank, evolved, { radius, maxLife }) {
    Object.assign(this, { scene, x, y, rank, kind: evolved ? 'b' : 'a', evolved, radius, maxLife });
    // Final size adjustment after in-game review: uniformly 18% below the larger draft.
    this.presentationScale = evolved || rank === 4 ? .82 : 1;
    this.visualRadius = radius * (evolved ? 1.12 : rank === 4 ? 1.08 : 1);
    this.coreWidth = evolved ? 62 : [42, 50, 58, 85][rank - 1];
    this.coreHeight = evolved ? 170 : this.coreWidth * .48;
    this.armCount = evolved ? 7 : rank + 3;
    this.frontDepth = 5.5;
    this.rearDepth = 3.5;
    texture(scene, 'void-live-ground', [[0, 'rgba(25,5,45,.68)'], [.26, 'rgba(39,12,61,.40)'], [.62, 'rgba(55,16,83,.14)'], [1, 'rgba(48,12,66,0)']]);
    texture(scene, 'void-live-light', [[0, 'rgba(194,117,255,.65)'], [.16, 'rgba(155,65,241,.35)'], [.48, 'rgba(133,51,204,.12)'], [1, 'rgba(120,45,190,0)']]);
    texture(scene, 'void-live-spark', [[0, 'rgba(255,244,255,1)'], [.08, 'rgba(237,212,255,.95)'], [.22, 'rgba(187,105,255,.65)'], [.52, 'rgba(144,66,228,.14)'], [1, 'rgba(144,66,228,0)']]);
    this.ground = scene.add.image(x, y, 'void-live-ground').setDepth(2.1);
    this.glow = scene.add.image(x, y, 'void-live-light').setDepth(2.2).setBlendMode(Phaser.BlendModes.ADD);
    this.floor = scene.add.graphics().setDepth(2.3);
    this.rear = scene.add.graphics().setDepth(this.rearDepth);
    this.body = scene.add.graphics().setDepth(evolved ? 4.5 : 3.4);
    this.front = scene.add.graphics().setDepth(this.frontDepth);
    this.sparks = Array.from({ length: evolved ? 70 : [18, 24, 30, 44][rank - 1] }, () => scene.add.image(x, y, 'void-live-spark').setBlendMode(Phaser.BlendModes.ADD));
    this.objects = [this.ground, this.glow, this.floor, this.rear, this.body, this.front, ...this.sparks];
    this.active = true;
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.draw(0);
  }

  draw(age, remaining = this.maxLife - age) {
    if (!this.scene) return;
    for (const g of [this.floor, this.rear, this.body, this.front]) g.clear();
    this.sparks.forEach(s => s.setVisible(false));
    this.active = age >= 0 && remaining > 0;
    this.ground.setVisible(this.active); this.glow.setVisible(this.active);
    if (!this.active) { this.envelope = 0; return; }
    const entry = ease(age / 480), remain = remaining;
    const collapse = ease(1 - remain / 700);
    const envelope = entry * (1 - ease(1 - remain / 260));
    const size = (.20 + .80 * entry) * (1 - collapse * .86) * this.presentationScale;
    Object.assign(this, { age, remaining, collapse, envelope, size, t: age / 1000, tick: Math.pow(1 - fract(age / (this.evolved ? 290 : 360)), 3) });
    this.ground.setDisplaySize(this.visualRadius * 1.98 * size, this.visualRadius * 1.98 * .58 * size).setAlpha(envelope);
    this.glow.setPosition(this.x, this.y - (this.kind === 'b' ? 42 : 0) * size)
      .setDisplaySize(this.visualRadius * 1.55 * size, this.visualRadius * (this.kind === 'b' ? 1.04 : .88) * size)
      .setAlpha(envelope * (.80 + this.tick * .16));
    if (this.kind === 'a') this.vortex(); else this.rift();
    this.particles();
    this.openAndClose();
  }

  projected(angle, radius, height = 0) {
    return { x: this.x + Math.cos(angle) * radius * this.size,
      y: this.y + Math.sin(angle) * radius * .58 * this.size - height * this.size };
  }

  vortex() {
    const { floor: g, body: b, t, x, y, envelope: a, size: s, evolved: evo, tick } = this;
    // Disconnected, tapered arms. The whole outer footprint never becomes an opaque disc.
    for (let i = 0; i < this.armCount; i++) {
      const phase = i * 2.399963 - t * (.21 + i % 3 * .06);
      const flow = fract(t * (.31 + i % 3 * .045) + i * .163);
      const strength = Math.pow(Math.sin(flow * Math.PI), .8);
      const sample = u => this.projected(phase + u * (2.6 + Math.sin(t * .8 + i) * .16),
        28 + Math.pow(1 - u, 1.12) * this.visualRadius * (.70 + (i % 3) * .07));
      // Short bands continuously travel inwards and dissolve; there is no persistent pinwheel.
      const lo = clamp(flow - .32), hi = clamp(flow + .16);
      const p = path(32, v => sample(lo + (hi - lo) * v));
      ribbon(g, p, (evo ? 20 : 16) * s, 0x7134b0, a * strength * .15);
      ribbon(g, p, (evo ? 7 : 5.5) * s, i % 2 ? 0xa460e4 : 0xbd7ff0, a * strength * .66);
      const tailLo = clamp(flow - .15), tailHi = clamp(flow + .07);
      const tail = path(24, v => sample(tailLo + (tailHi - tailLo) * v));
      ribbon(g, tail, 1.8 * s, i % 3 ? 0xe3bcff : 0xaddfe9, a * strength * .84);
    }
    const coreW = this.coreWidth * s, coreH = coreW * .48;
    b.fillStyle(0x2a123e, a * .5).fillEllipse(x, y + 3 * s, coreW * 1.22, coreH * 1.2);
    // Only the hole lies flat. Rising wisps retain independent vertical height.
    b.fillStyle(0x10091f, a * .96).fillEllipse(x, y, coreW, coreH);
    b.fillStyle(0x07070d, a * .8).fillEllipse(x, y - 2 * s, coreW * .65, coreH * .65);
    for (let i = 0; i < 3; i++) {
      const p = path(26, u => {
        const angle = i * TAU / 3 + u * 1.35 - t * .8;
        return { x: x + Math.cos(angle) * coreW * .51, y: y + Math.sin(angle) * coreH * .51 - Math.sin(u * Math.PI) * (5 + tick * 2) * s };
      });
      ribbon(b, p, 4.4 * s, 0x9f5fe5, a * .9);
      ribbon(b, p, 1.45 * s, 0xf0d8ff, a * (.58 + tick * .2));
    }
    for (let i = 0; i < (this.rank === 4 ? 3 : this.rank >= 3 ? 2 : 1); i++) {
      const life = fract(t * .46 + i * .237);
      const base = i * 2.39 + t * .35;
      const p = path(28, u => this.projected(base + u * 2.25, 18 + u * (34 + life * 20), Math.sin(u * Math.PI) * (this.rank === 4 ? 54 : 40) * Math.sin(life * Math.PI)));
      ribbon(this.rear, p, (evo ? 5.8 : 4.5) * s, 0xa563e9, a * Math.sin(life * Math.PI) * .58);
      ribbon(this.rear, p, 1.25 * s, 0xdfbdff, a * Math.sin(life * Math.PI) * .62);
    }
  }

  rift() {
    const { floor: g, body: b, x, y, t, size: s, envelope: a, evolved: evo, tick } = this;
    const height = this.coreHeight * s, halfWidth = this.coreWidth * .5 * s * (1 + Math.sin(t * 2.5) * .07);
    // A free-standing organic slit, with ground roots and airborne fragments, rather than a portal ring.
    for (let i = 0; i < (evo ? 7 : 5); i++) {
      const angle = i * TAU / (evo ? 7 : 5) + .23;
      const p = path(34, u => {
        const theta = angle + Math.sin(u * 7 + t * 1.4 + i) * .10 * Math.sin(u * Math.PI);
        return this.projected(theta, 10 + Math.pow(u, .9) * this.visualRadius * .9, Math.sin(u * Math.PI) * 6);
      });
      ribbon(g, p, 9 * s, 0x7134a6, a * .14);
      const f = 1 - fract(t * .48 + i * .173);
      const lo = clamp(f - .25), hi = clamp(f + .11);
      const flowing = path(24, u => {
        const v = lo + (hi - lo) * u;
        return this.projected(angle + Math.sin(v * 7 + t * 1.4 + i) * .10 * Math.sin(v * Math.PI), 10 + Math.pow(v, .9) * this.visualRadius * .9, Math.sin(v * Math.PI) * 6);
      });
      ribbon(g, flowing, 8 * s, 0xa765e5, a * Math.sin(f * Math.PI) * .45);
      ribbon(g, flowing, 2.4 * s, i % 3 ? 0xe1b8ff : 0xa8e0ee, a * Math.sin(f * Math.PI) * .90);
    }
    const edge = (u, side) => {
      const shape = Math.pow(Math.sin(u * Math.PI), .72);
      const bend = Math.sin(u * 9 + t * 1.9) * 5.5 * s * shape;
      const flicker = Math.sin(u * 24 + t * 4 + side) * 2.1 * s * shape;
      return { x: x + bend + side * halfWidth * shape + flicker, y: y + 7 * s - u * height };
    };
    const left = path(40, u => edge(u, -1)), right = path(40, u => edge(u, 1));
    b.fillStyle(0x170c29, a * .96).fillPoints([...left, ...right.slice().reverse()], true);
    const inner = path(35, u => {
      const p = edge(u, 0); return { x: p.x, y: p.y };
    });
    ribbon(b, inner, halfWidth * 1.1, 0x080914, a * .95);
    for (const p of [left, right]) {
      ribbon(b, p, 14 * s, 0x7a31b9, a * .48);
      ribbon(b, p, 6.4 * s, 0xc185f4, a * .86);
      ribbon(b, p, 1.8 * s, 0xf8d9ff, a * (.67 + tick * .12));
    }
    // Brief interior glints communicate activity without turning the crack into a bright column.
    for (let i = 0; i < 5; i++) {
      const phase = fract(t * .40 + i * .183), u = .13 + phase * .7;
      const p = edge(u, 0), w = (3 + i % 2 * 2) * s * Math.sin(phase * Math.PI);
      b.fillStyle(i % 2 ? 0xba7cf6 : 0x8065d1, a * .5).fillEllipse(p.x, p.y, w, w * .65);
    }
    for (let i = 0; i < 11; i++) {
      const q = fract(t * .27 + i * .137), angle = i * 2.399 + t * .33;
      const r = (32 + Math.sin(q * Math.PI) * 60) * s;
      const px = x + Math.cos(angle) * r, py = y - (17 + q * this.coreHeight) * s + Math.sin(angle) * 8 * s;
      const alpha = a * Math.pow(Math.sin(q * Math.PI), .7);
      feather(Math.sin(angle) > 0 ? this.front : this.rear, px, py, (4 + i % 3) * s, angle + t, i % 3 ? 0xb890ed : 0xd1d8ef, alpha * .9);
    }
    // Side curls curl into the tear; no closed hovering halo.
    for (let i = 0; i < 2; i++) {
      const side = i ? 1 : -1;
      const p = path(30, u => ({ x: x + side * (Math.sin(u * Math.PI) * 50 + 5) * s,
        y: y + 6 * s - u * height * .92 + Math.sin(u * 9 + t * 2 + i) * 3 * s * Math.sin(u * Math.PI) }));
      ribbon(this.rear, p, 4.5 * s, 0xb06ee6, a * (.32 + .12 * Math.sin(t * 2 + i)));
    }
  }

  particles() {
    const { t, visualRadius: radius, envelope: a, size: s, kind, evolved: evo } = this;
    this.sparks.forEach((sprite, i) => {
      const cycle = fract(t * (.30 + i % 4 * .025) + fract(Math.sin(i * 127.1 + 17) * 43758.5453));
      const progress = Math.pow(cycle, 1.5);
      const r = 12 + radius * .9 * (1 - progress);
      const angle = i * 2.399963 + (kind === 'a' ? progress * 3.8 - t * .35 : Math.sin(progress * 5 + i) * .24);
      const height = kind === 'b' ? Math.pow(progress, 2) * this.coreHeight * .8 : Math.sin(cycle * Math.PI) * (i % 4 === 0 ? (this.rank === 4 ? 38 : 27) : 3);
      const pos = this.projected(angle, r, height);
      const alpha = a * Math.sin(cycle * Math.PI) * (i % 3 === 0 ? .85 : .65);
      const scale = (i % 4 === 0 ? 17 : 10) * (.65 + cycle * .5) * s;
      sprite.setVisible(true).setPosition(pos.x, pos.y).setDisplaySize(scale, scale).setAlpha(alpha).setDepth(Math.sin(angle) > .1 ? this.frontDepth : this.rearDepth);
      if (i % 2 === 0) {
        const p = path(9, u => {
          const prev = clamp(cycle - .042 * (1 - u)), pp = Math.pow(prev, 1.5);
          const ar = i * 2.399963 + (kind === 'a' ? pp * 3.8 - t * .35 : Math.sin(pp * 5 + i) * .24);
          const h = kind === 'b' ? pp * pp * this.coreHeight * .8 : Math.sin(prev * Math.PI) * (i % 4 === 0 ? (this.rank === 4 ? 38 : 27) : 3);
          return this.projected(ar, 12 + radius * .9 * (1 - pp), h);
        });
        ribbon(Math.sin(angle) > .1 ? this.front : this.rear, p, 1.9 * s, i % 2 ? 0xc8a0fb : 0xc8e6f4, alpha);
      }
      if (kind === 'a' && i % 7 === 0) feather(this.front, pos.x, pos.y, 4 * s, angle + .8, 0xb5a3d0, alpha * .75);
    });
  }

  openAndClose() {
    const { age, remaining, envelope: a, visualRadius: radius, x, y, size: s } = this;
    if (age < 580) {
      const p = age / 580;
      for (let j = 0; j < 4; j++) {
        const points = path(24, u => {
          const angle = j * TAU / 4 + u * .90 + .12;
          return { x: x + Math.cos(angle) * radius * ease(p) * this.presentationScale,
            y: y + Math.sin(angle) * radius * .58 * ease(p) * this.presentationScale };
        });
        ribbon(this.floor, points, 4 * (1 - p) * this.presentationScale, 0xd5aaff, Math.sin(p * Math.PI) * .76);
      }
    }
    if (remaining < 700) {
      const c = 1 - remaining / 700;
      for (let j = 0; j < (this.evolved ? 10 : 7); j++) {
        const ang = j * 2.399 + c * 1.3;
        const p = path(14, u => this.projected(ang + u * .5, (15 + (1 - u) * radius * .7) * (1 - c)));
        ribbon(this.front, p, 2.8 * s, 0xe6c7ff, Math.sin(c * Math.PI) * a * .9);
      }
      if (c > .68) {
        const flash = Math.sin((c - .68) / .32 * Math.PI);
        this.front.fillStyle(0xf3dcff, flash * .8).fillEllipse(x, y, 10 * flash, 6 * flash);
      }
    }
  }

  describe() {
    return { kind: this.kind, evolved: this.evolved, radius: this.radius, visualRadius: this.visualRadius,
      presentationScale: this.presentationScale, age: this.age ?? -1, active: this.active,
      opacity: this.envelope ?? 0, objects: this.objects.length,
      coreWidth: this.coreWidth, coreHeight: this.coreHeight, retiring: Boolean(this.retiring),
      particles: this.sparks.filter(s => s.visible).length,
      finite: this.sparks.every(s => [s.x, s.y, s.scaleX, s.scaleY, s.alpha].every(Number.isFinite)),
      particleScalesUniform: this.sparks.every(s => Math.abs(s.scaleX - s.scaleY) < 1e-9) };
  }

  // Recasting ends the old gameplay field immediately, while its visual collapses.
  finish() {
    if (!this.scene || this.retiring) return;
    this.retiring = true;
    this.retireLife = Math.min(700, this.remaining);
    this.scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.updateRetiring, this);
  }

  updateRetiring(_time, delta) {
    if (!this.scene || this.scene.gamePause?.isPaused) return;
    this.retireLife -= delta;
    if (this.retireLife <= 0) { this.destroy(); return; }
    this.draw(this.age + delta, this.retireLife);
  }

  destroy() {
    if (!this.scene) return;
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.updateRetiring, this);
    this.objects.forEach(object => object.destroy());
    this.objects = [];
    this.active = false;
    this.scene = null;
  }
}
