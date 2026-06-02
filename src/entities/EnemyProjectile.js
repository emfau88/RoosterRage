export class EnemyProjectile {
  constructor(scene, x, y, angle, config = {}) {
    this.scene = scene;
    this.damage = config.damage ?? 8;
    this.life = config.life ?? 2600;
    this.color = config.color ?? 0xa7ff64;
    this.trailColor = config.trailColor ?? this.color;
    this.destroyed = false;

    this.sprite = scene.physics.add.sprite(x, y, config.texture ?? 'enemy-shot');
    this.sprite.setCircle(config.radius ?? 7);
    this.sprite.setRotation(angle);
    this.sprite.setTint(this.color);
    this.sprite.setDepth(5);
    this.sprite.entity = this;
    this.trail = scene.add.circle(x, y, (config.radius ?? 7) + 5, this.trailColor, 0.18).setDepth(4);
    scene.physics.velocityFromRotation(angle, config.speed ?? 220, this.sprite.body.velocity);
  }

  update(delta) {
    if (this.destroyed || !this.sprite.active) {
      return;
    }
    this.life -= delta;
    this.trail.setPosition(this.sprite.x, this.sprite.y);
    this.trail.setAlpha(Math.max(0.04, this.life / 2600) * 0.18);
    if (this.life <= 0) {
      this.destroy();
    }
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
