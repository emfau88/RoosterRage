export class EnemyProjectile {
  constructor(scene) {
    this.scene = scene;
    this.destroyed = true;
    this.sprite = scene.physics.add.sprite(0, 0, 'enemy-shot');
    this.sprite.setActive(false).setVisible(false);
    this.sprite.disableBody(true, true);
    this.sprite.entity = this;
    this.trail = scene.add.circle(0, 0, 13, 0xa7ff64, 0.28).setDepth(4).setVisible(false);
    this.dangerRing = scene.add.circle(0, 0, 12, 0x000000, 0).setDepth(6).setVisible(false);
  }

  reset(x, y, angle, config = {}) {
    this.damage = config.damage ?? 8;
    this.life = config.life ?? 2600;
    this.color = config.color ?? 0xa7ff64;
    this.trailColor = config.trailColor ?? this.color;
    this.trailAlpha = config.trailAlpha ?? 0.28;
    this.pulse = config.pulse ?? false;
    this.heavy = config.heavy ?? false;
    this.warningColor = config.warningColor ?? 0xff4058;
    this.baseScale = config.scale ?? 1;
    this.angle = angle;
    this.speed = config.speed ?? 220;
    this.source = config.source ?? 'enemy-projectile';
    this.age = 0;
    this.destroyed = false;

    this.sprite.enableBody(true, x, y, true, true);
    this.sprite.setTexture(config.texture ?? 'enemy-shot');
    this.sprite.setCircle(config.radius ?? 7);
    this.sprite.setRotation(angle);
    if (config.tint !== false) {
      this.sprite.setTint(this.color);
    }
    this.sprite.setScale(this.baseScale);
    this.sprite.setDepth(config.depth ?? 5);
    if (config.tint === false) {
      this.sprite.clearTint();
    }
    this.trail.setPosition(x, y)
      .setRadius(((config.radius ?? 7) + 6) * this.baseScale)
      .setFillStyle(this.trailColor, this.trailAlpha)
      .setDepth((config.depth ?? 5) - 1)
      .setScale(1)
      .setAlpha(this.trailAlpha)
      .setActive(true)
      .setVisible(true);
    this.dangerRing.setPosition(x, y)
      .setRadius(((config.radius ?? 7) + (this.heavy ? 9 : 5)) * this.baseScale)
      .setStrokeStyle(this.heavy ? 4 : 2, this.warningColor, 0.96)
      .setDepth((config.depth ?? 5) + 1)
      .setScale(1)
      .setActive(true)
      .setVisible(true);
    this.setVelocity();
    return this;
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
    this.dangerRing.setPosition(this.sprite.x, this.sprite.y);
    this.dangerRing.setScale(1 + Math.sin(this.age * 0.014) * (this.heavy ? 0.13 : 0.08));
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
    this.scene.objectPools.release(this);
  }

  deactivate() {
    this.sprite.setVelocity(0, 0);
    this.sprite.disableBody(true, true);
    this.trail.setActive(false).setVisible(false);
    this.dangerRing.setActive(false).setVisible(false);
  }

  dispose() {
    this.trail.destroy();
    this.dangerRing.destroy();
    this.sprite.destroy();
  }
}
