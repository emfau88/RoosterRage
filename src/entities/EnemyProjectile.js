export class EnemyProjectile {
  constructor(scene, x, y, angle, config = {}) {
    this.scene = scene;
    this.damage = config.damage ?? 8;
    this.life = config.life ?? 2600;
    this.color = config.color ?? 0xa7ff64;
    this.trailColor = config.trailColor ?? this.color;
    this.trailAlpha = config.trailAlpha ?? 0.28;
    this.pulse = config.pulse ?? false;
    this.baseScale = config.scale ?? 1;
    this.angle = angle;
    this.speed = config.speed ?? 220;
    this.age = 0;
    this.destroyed = false;

    this.sprite = scene.physics.add.sprite(x, y, config.texture ?? 'enemy-shot');
    this.sprite.setCircle(config.radius ?? 7);
    this.sprite.setRotation(angle);
    if (config.tint !== false) {
      this.sprite.setTint(this.color);
    }
    this.sprite.setScale(this.baseScale);
    this.sprite.setDepth(config.depth ?? 5);
    this.sprite.entity = this;
    this.trail = scene.add.circle(x, y, ((config.radius ?? 7) + 6) * this.baseScale, this.trailColor, this.trailAlpha).setDepth((config.depth ?? 5) - 1);
    this.setVelocity();
  }

  update(delta) {
    if (this.destroyed || !this.sprite.active) {
      return;
    }
    this.age += delta;
    this.life -= delta;
    if (this.pulse) {
      const pulseScale = this.baseScale + Math.sin(this.age * 0.012) * 0.12;
      this.sprite.setScale(pulseScale);
      this.trail.setScale(1 + Math.sin(this.age * 0.01) * 0.18);
    }
    this.setVelocity();
    this.trail.setPosition(this.sprite.x, this.sprite.y);
    this.trail.setAlpha(Math.max(0.08, this.life / 2600) * this.trailAlpha);
    if (this.life <= 0) {
      this.destroy();
    }
  }

  setVelocity() {
    if (!this.sprite.body) {
      return;
    }
    this.sprite.setVelocity(Math.cos(this.angle) * this.speed, Math.sin(this.angle) * this.speed);
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
