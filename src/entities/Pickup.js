export class Pickup {
  constructor(scene, kind, x, y) {
    this.scene = scene;
    this.kind = kind;
    this.baseY = y;
    this.spawnedAt = scene.time.now;
    this.sprite = scene.physics.add.sprite(x, y, `pickup-${kind}`)
      .setDepth(9)
      .setScale(kind === 'elite-chest' ? 1.08 : 1);
    this.sprite.setCircle(kind === 'elite-chest' ? 18 : 14);
    this.sprite.entity = this;
    this.glow = scene.add.circle(x, y, kind === 'elite-chest' ? 28 : 22, 0xffe588, 0.09)
      .setStrokeStyle(2, kind === 'elite-chest' ? 0xffd35c : 0xffffff, 0.55)
      .setDepth(3);
  }

  update(time) {
    if (!this.sprite.active) return;
    const bob = Math.sin((time - this.spawnedAt) * 0.005) * 4;
    this.sprite.y = this.baseY + bob;
    this.glow.setPosition(this.sprite.x, this.sprite.y).setScale(1 + Math.sin(time * 0.006) * 0.08);
  }

  destroy() {
    this.glow.destroy();
    this.sprite.destroy();
  }
}
