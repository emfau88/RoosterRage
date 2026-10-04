import Phaser from 'phaser';
import { ENEMY_AURA_METRICS } from './assets/EnemyAuraAssets.js';

const STYLES = {
  wind: { effect: 'wind', alpha: .7, color: 0xffd55f, period: 2000 },
  shield: { effect: 'shield', alpha: .65, color: 0x9eeaff, period: 4000 },
  'regen-violet': { effect: 'regen', alpha: .65, color: 0xc18aff, tint: 0xc18aff, period: 4000 },
  'regen-green': { effect: 'regen', alpha: .65, color: 0x65ef8b, tint: 0x65ef8b, period: 4000 },
  danger: { effect: 'danger', alpha: .85, color: 0xff8638, period: 1000 },
  royal: { effect: 'royal', alpha: .8, color: 0xffd477, period: 4000 }
};

export function getEnemyAuraGround(enemy) {
  return { x: enemy.sprite.x, y: enemy.sprite.y + enemy.sprite.displayHeight * .28 };
}

export function getEnemyAuraStyle(enemy) {
  if (enemy.boss) return { style: 'royal', radius: 125 };
  if (!enemy.aura) return null;
  const style = enemy.aura.kind === 'haste' ? 'wind'
    : enemy.aura.kind === 'armor' ? 'shield'
      : enemy.type === 'support' ? 'regen-green' : 'regen-violet';
  return { style, radius: enemy.aura.radius * (enemy.elite ? .8 : 1) };
}

function auraTexture(scene, style) {
  const key = `enemy-aura-${style}`;
  const tint = STYLES[style].tint;
  if (!tint) return key;
  // Phaser Canvas ignores sprite tint. Bake each grayscale tint once so both
  // renderers show the exact same green/violet art, including alpha edges.
  const tintedKey = `${key}-tinted`;
  if (!scene.textures.exists(tintedKey)) {
    const source = scene.textures.get(key).getSourceImage();
    const texture = scene.textures.createCanvas(tintedKey, source.width, source.height);
    const ctx = texture.getContext();
    ctx.drawImage(source, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `#${tint.toString(16).padStart(6, '0')}`;
    ctx.fillRect(0, 0, source.width, source.height);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(source, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    texture.refresh();
  }
  return tintedKey;
}

/** Hollow artwork plus moving light sectors; never rotate the ground ellipse. */
export class EnemyAuraVisual extends Phaser.GameObjects.Container {
  // Floor details/borders use <=2, solid props 3 and destructible props/mobs 4.
  // A distinct depth prevents creation/pool order from painting over props.
  constructor(scene, x, y, style, radius, { follow = null, depth = 2.5 } = {}) {
    super(scene, x, y);
    this.style = style;
    this.radius = radius;
    this.follow = follow;
    this.activationId = follow?.activationId;
    this.startedAt = scene.time.now;
    const config = STYLES[style], metrics = ENEMY_AURA_METRICS[style];
    this.config = config;
    const width = radius * 2 / metrics.visibleWidthFraction;
    const height = radius * 2 * .42 / metrics.visibleHeightFraction;
    const texture = auraTexture(scene, style);
    this.ring = scene.add.image(0, 0, texture).setDisplaySize(width, height).setAlpha(config.alpha);
    this.highlight = scene.add.image(0, 0, texture).setDisplaySize(width, height).setBlendMode(Phaser.BlendModes.ADD);
    this.lightMask = scene.make.graphics({ x, y, add: false });
    this.highlight.setMask(this.lightMask.createGeometryMask());
    // Tint glow through a shared texture too, for the Canvas fallback.
    const glintKey = `enemy-aura-glint-${style}`;
    if (!scene.textures.exists(glintKey)) {
      const glow = scene.make.graphics({ add: false });
      for (const [r, alpha] of [[7, .035], [5, .075], [3, .22], [1.5, .95]]) {
        glow.fillStyle(config.color, alpha); glow.fillCircle(8, 8, r);
      }
      glow.generateTexture(glintKey, 16, 16); glow.destroy();
    }
    this.particles = Array.from({ length: config.effect === 'regen' ? 8 : 4 }, () =>
      scene.add.image(0, 0, glintKey).setBlendMode(Phaser.BlendModes.ADD));
    this.add([this.ring, this.highlight, ...this.particles]);
    scene.add.existing(this); this.setDepth(depth);
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.updateVisual, this);
    this.updateVisual();
  }

  updateVisual() {
    if (!this.active || !this.scene || this.scene.gamePause?.isPaused) return;
    if (this.follow) {
      if (!this.follow.sprite.active || this.follow.activationId !== this.activationId) {
        this.destroy(); return;
      }
      const ground = getEnemyAuraGround(this.follow);
      this.setPosition(ground.x, ground.y);
    }
    const { effect, period, alpha } = this.config;
    const elapsed = this.scene.time.now - this.startedAt;
    const phase = elapsed / period * Math.PI * 2;
    const pulse = (Math.sin(phase) + 1) / 2;
    this.ring.setAlpha(alpha * (effect === 'danger' ? .76 + .24 * pulse : .9 + .1 * pulse));
    this.highlight.setAlpha(effect === 'danger' ? .12 + .24 * pulse : .23);
    this.lightMask.setPosition(this.x, this.y).setScale(this.scaleX, this.scaleY);
    const mask = this.lightMask;
    mask.clear(); mask.fillStyle(0xffffff, 1);
    const sectors = effect === 'wind' ? 2 : 1;
    const sweep = effect === 'shield' ? .65 : 1;
    for (let sector = 0; sector < sectors; sector++) {
      const start = phase + sector * Math.PI;
      mask.beginPath(); mask.moveTo(0, 0);
      for (let j = 0; j <= 16; j++) {
        const angle = start + j / 16 * sweep;
        mask.lineTo(Math.cos(angle) * this.radius * 1.35, Math.sin(angle) * this.radius * .42 * 1.6);
      }
      mask.closePath(); mask.fillPath();
    }
    this.particles.forEach((particle, index) => {
      const offset = index / this.particles.length;
      if (effect === 'regen') {
        const life = (elapsed / 2000 + offset) % 1;
        const angle = offset * Math.PI * 2 + phase;
        particle.setPosition(Math.cos(angle) * this.radius * .95,
          Math.sin(angle) * this.radius * .42 * .95 - life * 22);
        particle.setAlpha(Math.sin(life * Math.PI) * .7).setScale(.5 + .4 * (1 - life));
      } else {
        const angle = phase + offset * Math.PI * 2;
        particle.setPosition(Math.cos(angle) * this.radius * .95, Math.sin(angle) * this.radius * .42 * .95);
        particle.setAlpha((effect === 'danger' ? .4 + .5 * pulse : .65) * (index < 2 ? 1 : .55));
        particle.setScale(effect === 'wind' ? 1 : .8);
      }
    });
  }

  destroy(fromScene) {
    if (!this.scene || this.disposing) return;
    this.disposing = true;
    this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.updateVisual, this);
    this.scene.tweens.killTweensOf(this);
    this.highlight.clearMask(true);
    this.lightMask.destroy();
    super.destroy(fromScene);
  }
}
