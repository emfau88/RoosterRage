import Phaser from 'phaser';

export class LightningBolt {
  constructor(scene, targets, rank, synergyActive = false, evolved = false) {
    this.scene = scene;
    this.rank = rank;
    this.synergyActive = synergyActive;
    this.evolved = evolved;
    this.age = 0;
    this.life = 180;
    this.active = true;
    this.segments = [];

    const points = [
      { x: scene.player.sprite.x, y: scene.player.sprite.y - 18 },
      ...targets.map((enemy) => ({ x: enemy.sprite.x, y: enemy.sprite.y }))
    ];

    for (let i = 0; i < points.length - 1; i += 1) {
      this.createSegment(points[i], points[i + 1]);
    }
    if (!evolved && rank >= 3 && points.length >= 4) {
      this.createSegment(points[1], points[points.length - 1]);
    }
    if (!evolved && rank >= 4) {
      const burst = scene.add.circle(points[0].x, points[0].y, 28, 0x5ad7ff, 0.18)
        .setStrokeStyle(4, 0xeefcff, 0.86)
        .setDepth(10);
      this.segments.push(burst);
      scene.tweens.add({ targets: burst, scale: 2.1, duration: this.life });
    }

    targets.forEach((enemy, index) => {
      const falloff = Math.max(0.55, 1 - index * 0.18);
      const synergyMultiplier = synergyActive ? 1.2 : 1;
      const evolutionMultiplier = evolved ? 1.3 : 1;
      scene.damageEnemy(
        enemy,
        Math.round((24 + rank * 10) * falloff * synergyMultiplier * evolutionMultiplier),
        enemy.sprite.x,
        enemy.sprite.y,
        { source: evolved ? 'evo-thunder-roost' : 'lightning-comb' }
      );
    });
  }

  createSegment(from, to) {
    const line = this.scene.add.graphics().setDepth(11);
    line.lineStyle(this.evolved ? 8 : 5, this.evolved ? 0xfff3b0 : 0xeefcff, 0.88);
    line.beginPath();
    line.moveTo(from.x, from.y);
    const steps = 4;
    for (let i = 1; i < steps; i += 1) {
      const t = i / steps;
      const x = Phaser.Math.Linear(from.x, to.x, t) + this.scene.rng.int(-14, 14, 'fx-lightning');
      const y = Phaser.Math.Linear(from.y, to.y, t) + this.scene.rng.int(-14, 14, 'fx-lightning');
      line.lineTo(x, y);
    }
    line.lineTo(to.x, to.y);
    line.strokePath();
    line.lineStyle(this.evolved ? 3 : 2, this.evolved ? 0x9b5cff : 0x5ad7ff, 0.96);
    line.strokePath();
    this.segments.push(line);
  }

  update(delta) {
    if (!this.active) {
      return;
    }
    this.age += delta;
    const alpha = Phaser.Math.Clamp(1 - this.age / this.life, 0, 1);
    this.segments.forEach((segment) => segment.setAlpha(alpha));
    if (this.age >= this.life) {
      this.destroy();
    }
  }

  destroy() {
    this.active = false;
    this.segments.forEach((segment) => segment.destroy());
  }
}
