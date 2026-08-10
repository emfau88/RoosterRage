import Phaser from 'phaser';

export class MolotovEggProjectile {
  constructor(scene, startX, startY, targetX, targetY, rank, evolved = false) {
    this.scene = scene;
    this.start = new Phaser.Math.Vector2(startX, startY);
    this.target = new Phaser.Math.Vector2(targetX, targetY);
    this.rank = rank;
    this.duration = Math.max(620, 920 - rank * 70);
    this.age = 0;
    this.active = true;

    this.sprite = scene.add.sprite(
      startX,
      startY,
      evolved ? 'evo-phoenix-pan-projectile' : 'molotov-egg'
    )
      .setDepth(12)
      .setScale(1.05 + rank * 0.08);
    this.trail = scene.add.graphics().setDepth(11);
    this.shadow = scene.add.ellipse(startX, startY + 8, 28, 10, 0x24130c, 0.24).setDepth(2);
  }

  update(delta) {
    if (!this.active) {
      return;
    }
    this.age += delta;
    const progress = Phaser.Math.Clamp(this.age / this.duration, 0, 1);
    const eased = Phaser.Math.Easing.Sine.InOut(progress);
    const x = Phaser.Math.Linear(this.start.x, this.target.x, eased);
    const y = Phaser.Math.Linear(this.start.y, this.target.y, eased);
    const arc = Math.sin(progress * Math.PI) * (84 + this.rank * 14);
    this.sprite.setPosition(x, y - arc);
    this.sprite.rotation += delta * 0.012;
    this.shadow.setPosition(x, y + 10);
    this.shadow.setScale(0.7 + progress * 0.35);

    this.trail.clear();
    this.trail.lineStyle(5, 0xff6a28, 0.28);
    this.trail.lineBetween(this.start.x, this.start.y, x, y - arc);
    this.trail.lineStyle(2, 0xffd35c, 0.34);
    this.trail.lineBetween((this.start.x + x) / 2, (this.start.y + y - arc) / 2, x, y - arc);

    if (progress >= 1) {
      this.destroy();
      this.scene.createMolotovImpact(this.target.x, this.target.y);
    }
  }

  destroy() {
    if (!this.active) {
      return;
    }
    this.active = false;
    this.sprite.destroy();
    this.trail.destroy();
    this.shadow.destroy();
  }
}
