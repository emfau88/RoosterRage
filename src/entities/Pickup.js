const CHEST_CONFIGS = Object.freeze({
  'elite-chest': {
    scale: 1.22,
    rewardKind: 'elite',
    tint: null,
    glow: 0xffd35c,
    burst: 0xffe588
  },
  'golden-chest': {
    scale: 1.36,
    rewardKind: 'golden',
    tint: 0xffdc72,
    glow: 0xffa92f,
    burst: 0xfff2a3
  },
  'royal-chest': {
    scale: 1.5,
    rewardKind: 'boss',
    tint: 0xd9b7ff,
    glow: 0xa85cff,
    burst: 0xf4ddff
  }
});

export class Pickup {
  constructor(scene, kind, x, y) {
    this.scene = scene;
    this.kind = kind;
    this.chest = CHEST_CONFIGS[kind] ?? null;
    this.baseY = y;
    this.spawnedAt = scene.time.now;
    this.opening = false;
    this.destroyed = false;
    this.timers = [];
    this.transientFx = [];
    const texture = this.chest ? 'pickup-elite-chest' : `pickup-${kind}`;
    this.sprite = scene.physics.add.sprite(x, y, texture)
      .setDepth(9)
      .setScale(this.chest?.scale ?? 1);
    if (this.chest?.tint) this.sprite.setTint(this.chest.tint);
    this.sprite.setCircle(this.chest ? 18 : 14);
    this.sprite.entity = this;
    this.tierMarker = null;
    if (kind === 'golden-chest' || kind === 'royal-chest') {
      const royal = kind === 'royal-chest';
      this.tierMarker = scene.add.star(
        x,
        y - (royal ? 40 : 35),
        royal ? 6 : 4,
        royal ? 4 : 3,
        royal ? 10 : 8,
        royal ? 0xc18aff : 0xffd35c,
        0.96
      ).setStrokeStyle(2, royal ? 0xf4ddff : 0xfff2a3, 0.95).setDepth(11);
    }
    if (this.chest) {
      this.playChestSpawnFx();
    }
  }

  update(time) {
    if (!this.sprite.active || this.opening) return;
    const bob = Math.sin((time - this.spawnedAt) * 0.005) * 4;
    this.sprite.y = this.baseY + bob;
    if (this.tierMarker) {
      this.tierMarker
        .setPosition(this.sprite.x, this.sprite.y - (this.kind === 'royal-chest' ? 40 : 35))
        .setRotation(time * (this.kind === 'royal-chest' ? -0.0012 : 0.0015))
        .setScale(0.94 + Math.sin(time * 0.007) * 0.08);
    }
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
    this.scene.audio?.play('chest-spawn');
    const ring = this.trackFx(this.scene.add.circle(this.sprite.x, this.sprite.y, 27)
      .setStrokeStyle(this.kind === 'royal-chest' ? 4 : 3, this.chest.glow, 0.78)
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
    this.scene.tweens.killTweensOf(this.sprite);

    const chestScale = this.chest.scale;

    this.scene.tweens.add({
      targets: this.sprite,
      y: this.baseY + 3,
      scaleX: chestScale * 1.07,
      scaleY: chestScale * 0.88,
      duration: 105,
      yoyo: true,
      ease: 'Sine.InOut'
    });

    this.schedule(120, () => {
      this.scene.audio?.play('chest-latch', { cooldown: 0 });
      this.sprite.setTexture('pickup-elite-chest-ajar');
      if (this.chest.tint) this.sprite.setTint(this.chest.tint);
      this.scene.tweens.add({
        targets: this.sprite,
        y: this.baseY - 4,
        scaleX: chestScale * 1.05,
        scaleY: chestScale * 1.08,
        duration: 150,
        ease: 'Back.Out'
      });
    });

    this.schedule(285, () => {
      this.sprite.setTexture('pickup-elite-chest-open');
      if (this.chest.tint) this.sprite.setTint(this.chest.tint);
      this.sprite.y = this.baseY - 6;
      this.playChestRewardBurst();
      this.scene.audio?.play('chest-open', { cooldown: 0 });
      if (this.scene.effects?.enabled('screenShake')) {
        this.scene.cameras.main.shake(95, 0.0032);
      }
      if (this.scene.effects?.enabled('screenFlash')) {
        this.scene.cameras.main.flash(90, 255, 222, 118, false);
      }
      this.scene.tweens.add({
        targets: this.sprite,
        scaleX: chestScale * 1.13,
        scaleY: chestScale * 1.13,
        duration: 115,
        yoyo: true,
        ease: 'Sine.Out'
      });
    });

    this.schedule(500, () => {
      this.scene.audio?.play('chest-reward', { cooldown: 0 });
    });

    this.schedule(760, onComplete);
    return true;
  }

  playChestRewardBurst() {
    const { scene, sprite } = this;
    const centerY = sprite.y - 4;
    const halo = this.trackFx(scene.add.circle(sprite.x, centerY, 14, this.chest.glow, 0.32).setDepth(8));
    const ring = this.trackFx(scene.add.circle(sprite.x, centerY, 25)
      .setStrokeStyle(this.kind === 'royal-chest' ? 4 : 3, this.chest.burst, 0.92)
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
      const spark = this.trackFx(scene.add.circle(sprite.x, centerY, index % 3 === 0 ? 3 : 2, this.chest.burst, 0.95)
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
    this.scene.tweens.killTweensOf([this.sprite, ...this.transientFx]);
    this.transientFx.forEach((fx) => {
      if (fx?.active) fx.destroy();
    });
    this.transientFx = [];
    if (this.tierMarker?.active) this.tierMarker.destroy();
    if (this.sprite?.active) this.sprite.destroy();
  }
}
