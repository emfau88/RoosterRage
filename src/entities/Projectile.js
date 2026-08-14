import Phaser from 'phaser';

export class Projectile {
  constructor(scene) {
    this.scene = scene;
    this.destroyed = true;
    this.hitEnemies = new Set();
    this.sprite = scene.physics.add.sprite(0, 0, 'egg');
    this.sprite.setActive(false).setVisible(false);
    this.sprite.disableBody(true, true);
    this.sprite.entity = this;
    this.trail = scene.add.circle(0, 0, 8, 0xfffbef, 0.18).setDepth(3).setVisible(false);
  }

  reset(x, y, angle, damage, isFireEgg, target, targetOffset = 0, options = {}) {
    const { scene } = this;
    this.damage = damage;
    this.source = options.source ?? (isFireEgg ? 'fire-eggs' : 'base-egg');
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
    this.forceCritical = options.forceCritical ?? false;
    this.knockbackRank = options.knockbackRank ?? 0;
    this.slowRatio = options.slowRatio ?? 1;
    this.slowMs = options.slowMs ?? 0;
    this.splashRadius = options.splashRadius ?? 0;
    this.splashDamageRatio = options.splashDamageRatio ?? 0;
    this.secondaryBlastRatio = options.secondaryBlastRatio ?? 0;
    this.shrapnelCount = options.shrapnelCount ?? 0;
    this.shrapnelDamageRatio = options.shrapnelDamageRatio ?? 0;
    this.criticalPierceBonus = options.criticalPierceBonus ?? 0;
    this.criticalRicochetBonus = options.criticalRicochetBonus ?? 0;
    this.criticalBonusApplied = false;
    this.chainRemaining = options.chainCount ?? 0;
    this.chainRadius = options.chainRadius ?? 0;
    this.chainDamageRatio = options.chainDamageRatio ?? 0;
    this.visualRank = options.visualRank ?? 0;
    this.trailBaseAlpha = options.trailAlpha ?? 0.18;
    this.trailPulse = options.trailPulse ?? 0;
    this.trailPulseMs = options.trailPulseMs ?? 320;
    this.trailPhase = options.trailPhase ?? 0;
    this.hitEnemies.clear();
    this.hitRadius = (options.hitRadius ?? 24) + (scene.player?.projectileSizeBonus ?? 0);
    this.destroyed = false;

    this.sprite.enableBody(true, x, y, true, true);
    this.sprite.setTexture(options.texture ?? (isFireEgg ? 'fire-egg' : 'egg'));
    this.sprite.setCircle(options.bodyRadius ?? (9 + (scene.player?.projectileSizeBonus ?? 0) * 0.45));
    this.sprite.setRotation(angle);
    this.sprite.setScale((options.scale ?? (isFireEgg ? 1.18 : 1)) + (scene.player?.projectileSizeBonus ?? 0) * 0.018);
    this.sprite.setDepth(5);
    this.sprite.clearTint();
    this.trail.setPosition(x, y);
    this.trail.setRadius(options.trailRadius ?? (isFireEgg ? 10 : 8));
    this.trail.setFillStyle(options.trailColor ?? (isFireEgg ? 0xff6a28 : 0xfffbef), this.trailBaseAlpha);
    this.trail.setScale(1).setAlpha(this.trailBaseAlpha).setVisible(true).setActive(true);
    this.setVelocity(angle);
    return this;
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
    if (this.trailPulse > 0) {
      const phase = (this.scene.time.now / this.trailPulseMs) * Math.PI * 2 + this.trailPhase;
      const pulse = Math.sin(phase);
      this.trail.setScale(1 + pulse * this.trailPulse);
      this.trail.setAlpha(Math.min(1, this.trailBaseAlpha * (1 + pulse * 0.16)));
    }
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
    this.scene.objectPools.release(this);
  }

  deactivate() {
    this.target = null;
    this.hitEnemies.clear();
    this.sprite.setVelocity(0, 0);
    this.sprite.disableBody(true, true);
    this.trail.setActive(false).setVisible(false);
  }

  dispose() {
    this.trail.destroy();
    this.sprite.destroy();
  }
}
