import Phaser from 'phaser';
import { EnemyAuraAnimation } from './EnemyAuraAnimation.js';

const STYLES = {
  wind: { kind: 'wind', radius: 148 },
  shield: { kind: 'shield', radius: 164 },
  'regen-violet': { kind: 'violet', radius: 168 },
  'regen-green': { kind: 'green', radius: 185 },
  danger: { kind: 'danger', radius: 86 },
  royal: { kind: 'royal', radius: 125 }
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

/** Animated volume around the enemy, with the ground light below solid props.
 * The controller remains tweenable for attack warnings and boss transitions.
 * Radius is a visual input only; damage and buff calculations remain separate.
 */
export class EnemyAuraVisual extends Phaser.GameObjects.Container {
  constructor(scene, x, y, style, radius, { follow = null, depth = 2.5 } = {}) {
    super(scene, x, y);
    Object.assign(this, { style, radius, follow, activationId: follow?.activationId,
      startedAt: scene.time.now, previousAt: scene.time.now, previousX: x, previousY: y });
    const config = STYLES[style];
    this.visualScale = radius / config.radius;
    this.animation = new EnemyAuraAnimation(scene, config.kind);
    const a = this.animation;
    this.floorLayer = scene.add.container(0, 0, [a.ground, a.floor]).setScale(this.visualScale);
    this.add(this.floorLayer);
    this.rearLayer = scene.add.container(x, y, [a.halo, a.rear]).setDepth(depth + .9);
    this.frontLayer = scene.add.container(x, y, [a.front, ...a.motes]).setDepth(depth + 2);
    scene.add.existing(this);
    this.setDepth(depth);
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
    const now = this.scene.time.now;
    const dt = Math.max(1, now - this.previousAt);
    const vx = (this.x - this.previousX) / dt * 1000;
    const vy = (this.y - this.previousY) / dt * 1000;
    this.previousAt = now; this.previousX = this.x; this.previousY = this.y;
    this.animation.draw(now - this.startedAt, 0, 0, { vx, vy });
    for (const mote of this.animation.motes) {
      const layer = mote.depth < 4 ? this.rearLayer : this.frontLayer;
      if (mote.parentContainer !== layer) layer.add(mote);
    }
    for (const layer of [this.rearLayer, this.frontLayer]) {
      layer.setPosition(this.x, this.y).setScale(this.scaleX * this.visualScale, this.scaleY * this.visualScale)
        .setAlpha(this.alpha).setVisible(this.visible);
    }
  }

  setVisible(value) {
    super.setVisible(value);
    this.rearLayer?.setVisible(value);
    this.frontLayer?.setVisible(value);
    return this;
  }

  destroy(fromScene) {
    if (!this.scene || this.disposing) return;
    this.disposing = true;
    this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.updateVisual, this);
    this.scene.tweens.killTweensOf(this);
    this.rearLayer.destroy(fromScene);
    this.frontLayer.destroy(fromScene);
    super.destroy(fromScene);
  }
}
