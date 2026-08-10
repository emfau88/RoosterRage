const CHEST_SCALE = 1.22;

export class Pickup {
  constructor(scene, kind, x, y) {
    this.scene = scene;
    this.kind = kind;
    this.baseY = y;
    this.spawnedAt = scene.time.now;
    this.opening = false;
    this.destroyed = false;
    this.timers = [];
    this.transientFx = [];
    this.sprite = scene.physics.add.sprite(x, y, `pickup-${kind}`)
      .setDepth(9)
      .setScale(kind === 'elite-chest' ? CHEST_SCALE : 1);
    this.sprite.setCircle(kind === 'elite-chest' ? 18 : 14);
    this.sprite.entity = this;
    this.glow = scene.add.circle(x, y, kind === 'elite-chest' ? 28 : 22, 0xffe588, 0.09)
      .setStrokeStyle(2, kind === 'elite-chest' ? 0xffd35c : 0xffffff, 0.55)
      .setDepth(3);
    if (kind === 'elite-chest') {
      this.playChestSpawnFx();
    }
  }

  update(time) {
    if (!this.sprite.active || this.opening) return;
    const bob = Math.sin((time - this.spawnedAt) * 0.005) * 4;
    this.sprite.y = this.baseY + bob;
    this.glow.setPosition(this.sprite.x, this.sprite.y).setScale(1 + Math.sin(time * 0.006) * 0.08);
  }

  schedule(delay, callback) {
    const timer = this.scene.time.delayedCall(delay, () => {
      if (!this.destroyed) callback();
    });
    this.timers.push(timer);
    return timer;
  }

  trackFx(target) {
    this.transientFx.push(target);
    return target;
  }

  playChestSpawnFx() {
    const ring = this.trackFx(this.scene.add.circle(this.sprite.x, this.sprite.y, 27)
      .setStrokeStyle(3, 0xffd35c, 0.75)
      .setDepth(8)
      .setScale(0.45));
    this.scene.tweens.add({
      targets: ring,
      scale: 1.55,
      alpha: 0,
      duration: 520,
      ease: 'Cubic.Out',
      onComplete: () => {
        ring.destroy();
        this.transientFx = this.transientFx.filter((fx) => fx !== ring);
      }
    });
  }

  playChestOpening(onComplete) {
    if (this.opening || this.destroyed) return false;
    this.opening = true;
    this.baseY = this.sprite.y;
    this.sprite.body?.stop();
    if (this.sprite.body) this.sprite.body.enable = false;
    this.scene.tweens.killTweensOf([this.sprite, this.glow]);
    this.glow.setPosition(this.sprite.x, this.sprite.y)
      .setFillStyle(0xffc940, 0.16)
      .setStrokeStyle(3, 0xffe588, 0.88);

    this.scene.tweens.add({
      targets: this.sprite,
      y: this.baseY + 3,
      scaleX: CHEST_SCALE * 1.07,
      scaleY: CHEST_SCALE * 0.88,
      duration: 105,
      yoyo: true,
      ease: 'Sine.InOut'
    });

    this.schedule(120, () => {
      this.sprite.setTexture('pickup-elite-chest-ajar');
      this.scene.tweens.add({
        targets: this.sprite,
        y: this.baseY - 4,
        scaleX: CHEST_SCALE * 1.05,
        scaleY: CHEST_SCALE * 1.08,
        duration: 150,
        ease: 'Back.Out'
      });
    });

    this.schedule(285, () => {
      this.sprite.setTexture('pickup-elite-chest-open');
      this.sprite.y = this.baseY - 6;
      this.playChestRewardBurst();
      this.scene.audio?.play('level-up', { volume: 0.24, cooldown: 0, tier: 'reward' });
      if (this.scene.effects?.enabled('screenShake')) {
        this.scene.cameras.main.shake(95, 0.0032);
      }
      if (this.scene.effects?.enabled('screenFlash')) {
        this.scene.cameras.main.flash(90, 255, 222, 118, false);
      }
      this.scene.tweens.add({
        targets: this.sprite,
        scaleX: CHEST_SCALE * 1.13,
        scaleY: CHEST_SCALE * 1.13,
        duration: 115,
        yoyo: true,
        ease: 'Sine.Out'
      });
    });

    this.schedule(760, onComplete);
    return true;
  }

  playChestRewardBurst() {
    const { scene, sprite } = this;
    const centerY = sprite.y - 4;
    const halo = this.trackFx(scene.add.circle(sprite.x, centerY, 14, 0xffd35c, 0.32).setDepth(8));
    const ring = this.trackFx(scene.add.circle(sprite.x, centerY, 25)
      .setStrokeStyle(3, 0xfff0a3, 0.92)
      .setDepth(10)
      .setScale(0.45));
    scene.tweens.add({
      targets: halo,
      scale: 3.4,
      alpha: 0,
      duration: 480,
      ease: 'Cubic.Out',
      onComplete: () => halo.destroy()
    });
    scene.tweens.add({
      targets: ring,
      scale: 1.65,
      alpha: 0,
      duration: 430,
      ease: 'Cubic.Out',
      onComplete: () => ring.destroy()
    });

    const angles = [-2.65, -2.15, -1.7, -1.25, -0.75, -0.3, 0.25, 0.75];
    angles.forEach((angle, index) => {
      const spark = this.trackFx(scene.add.circle(sprite.x, centerY, index % 3 === 0 ? 3 : 2, 0xffe588, 0.95)
        .setDepth(11));
      const distance = 34 + (index % 2) * 12;
      scene.tweens.add({
        targets: spark,
        x: sprite.x + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
        scale: 0.15,
        alpha: 0,
        duration: 390 + index * 18,
        ease: 'Quad.Out',
        onComplete: () => spark.destroy()
      });
    });
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.timers.forEach((timer) => timer.remove(false));
    this.timers = [];
    this.scene.tweens.killTweensOf([this.sprite, this.glow, ...this.transientFx]);
    this.transientFx.forEach((fx) => {
      if (fx?.active) fx.destroy();
    });
    this.transientFx = [];
    if (this.glow?.active) this.glow.destroy();
    if (this.sprite?.active) this.sprite.destroy();
  }
}
