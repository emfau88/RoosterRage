import Phaser from 'phaser';

export class Projectile {
  constructor(scene, x, y, angle, damage, isFireEgg, target, targetOffset = 0, options = {}) {
    this.scene = scene;
    this.damage = damage;
    this.target = target;
    this.targetOffset = targetOffset;
    this.laneOffset = options.laneOffset ?? targetOffset;
    this.baseAngle = angle;
    this.currentAngle = angle;
    this.homing = options.homing ?? true;
    this.maxTurnRate = options.maxTurnRate ?? 0.045;
    this.life = options.life ?? 1600;
    this.speed = options.speed ?? 520;
    this.pierceRemaining = options.pierce ?? (scene.player?.projectilePierce ?? 0);
    this.ricochetRemaining = options.ricochet ?? 0;
    this.canCrit = options.canCrit ?? false;
    this.knockbackRank = options.knockbackRank ?? 0;
    this.splashRadius = options.splashRadius ?? 0;
    this.splashDamageRatio = options.splashDamageRatio ?? 0;
    this.chainRemaining = options.chainCount ?? 0;
    this.chainRadius = options.chainRadius ?? 0;
    this.chainDamageRatio = options.chainDamageRatio ?? 0;
    this.hitEnemies = new Set();
    this.hitRadius = (options.hitRadius ?? 24) + (scene.player?.projectileSizeBonus ?? 0);
    this.destroyed = false;

    this.sprite = scene.physics.add.sprite(x, y, options.texture ?? (isFireEgg ? 'fire-egg' : 'egg'));
    this.sprite.setCircle(options.bodyRadius ?? (9 + (scene.player?.projectileSizeBonus ?? 0) * 0.45));
    this.sprite.setRotation(angle);
    this.sprite.setScale((options.scale ?? (isFireEgg ? 1.18 : 1)) + (scene.player?.projectileSizeBonus ?? 0) * 0.018);
    this.sprite.setDepth(5);
    this.sprite.entity = this;
    this.trail = scene.add.circle(x, y, options.trailRadius ?? (isFireEgg ? 10 : 8), options.trailColor ?? (isFireEgg ? 0xff6a28 : 0xfffbef), options.trailAlpha ?? 0.18);
    this.trail.setDepth(3);
    this.setVelocity(angle);
  }

  update(delta) {
    if (this.destroyed || !this.sprite.active || !this.sprite.body) {
      return;
    }

    this.life -= delta;
    if (this.homing && this.target?.sprite?.active) {
      const offsetX = -Math.sin(this.baseAngle) * this.targetOffset;
      const offsetY = Math.cos(this.baseAngle) * this.targetOffset;
      const desiredAngle = Phaser.Math.Angle.Between(
        this.sprite.x,
        this.sprite.y,
        this.target.sprite.x + offsetX,
        this.target.sprite.y + offsetY
      );
      this.currentAngle = Phaser.Math.Angle.RotateTo(this.currentAngle, desiredAngle, this.maxTurnRate);
      this.sprite.rotation = this.currentAngle;
      this.setVelocity(this.currentAngle);
    }
    this.trail.setPosition(this.sprite.x, this.sprite.y);
    if (this.life <= 0) {
      this.destroy();
    }
  }

  setVelocity(angle) {
    if (!this.sprite.body) {
      return;
    }
    this.scene.physics.velocityFromRotation(angle, this.speed, this.sprite.body.velocity);
  }

  destroy() {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    if (this.trail.active) {
      this.trail.destroy();
    }
    if (this.sprite.active) {
      this.sprite.destroy();
    }
  }
}
