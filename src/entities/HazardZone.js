import Phaser from 'phaser';

export class HazardZone {
  constructor(scene, x, y, rank, evolved = false) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.rank = rank;
    this.evolved = evolved;
    this.radius = (evolved ? 112 : 74) + rank * 16;
    this.damage = (evolved ? 13 : 8) + rank * 4;
    this.tickMs = evolved ? 320 : 420;
    this.life = evolved ? 3800 : 2050;
    this.maxLife = this.life;
    this.nextTickAt = 0;
    this.nextPulseFxAt = 0;
    this.age = 0;
    this.active = true;

    this.visual = scene.add.circle(x, y, this.radius, 0xff6a28, 0.22)
      .setStrokeStyle(3, 0xffd35c, 0.72)
      .setDepth(3);
    this.core = scene.add.circle(x, y, this.radius * 0.36, 0xffd35c, 0.26).setDepth(4);
    this.fireSprite = scene.add.sprite(x, y, 'fx-atlas-v1', 0)
      .setScale((this.radius * 2) / 256)
      .setAlpha(0.7)
      .setDepth(4);
    this.fireSprite.play({ key: 'fx-molotov-fire', repeat: -1 });
    this.flames = [];
    const flameCount = 7 + rank * 3;
    for (let i = 0; i < flameCount; i += 1) {
      const angle = (Math.PI * 2 * i) / flameCount + scene.rng.float(-0.25, 0.25, 'fx-hazard');
      const distance = scene.rng.float(this.radius * 0.15, this.radius * 0.78, 'fx-hazard');
      const flame = scene.add.ellipse(
        x + Math.cos(angle) * distance,
        y + Math.sin(angle) * distance,
        scene.rng.int(10, 18, 'fx-hazard'),
        scene.rng.int(18, 30, 'fx-hazard'),
        i % 2 === 0 ? 0xffd35c : 0xff6a28,
        0.52
      ).setDepth(5);
      flame.baseScale = scene.rng.float(0.8, 1.25, 'fx-hazard');
      flame.phase = scene.rng.float(0, Math.PI * 2, 'fx-hazard');
      this.flames.push(flame);
    }
  }

  update(delta) {
    if (!this.active) {
      return;
    }
    this.age += delta;
    this.life -= delta;
    if (this.scene.time.now >= this.nextTickAt) {
      this.nextTickAt = this.scene.time.now + this.tickMs;
      this.scene.enemies.forEach((enemy) => {
        if (!enemy.sprite.active) {
          return;
        }
        const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.sprite.x, enemy.sprite.y);
        if (distance <= this.radius) {
          this.scene.damageEnemy(enemy, this.damage, enemy.sprite.x, enemy.sprite.y, {
            source: this.evolved ? 'evo-phoenix-pan' : 'molotov-egg'
          });
        }
      });
      if (this.rank >= 3 && this.scene.time.now >= this.nextPulseFxAt) {
        this.nextPulseFxAt = this.scene.time.now + this.tickMs * 2;
        const pulseRing = this.scene.add.circle(this.x, this.y, this.radius * 0.42, 0xff6a28, 0.06)
          .setStrokeStyle(3, 0xffd35c, 0.68)
          .setDepth(5);
        this.scene.tweens.add({
          targets: pulseRing,
          alpha: 0,
          scale: 2.15,
          duration: 260,
          onComplete: () => pulseRing.destroy()
        });
      }
    }
    const lifeRatio = Phaser.Math.Clamp(this.life / this.maxLife, 0, 1);
    const pulse = 0.85 + Math.sin(this.age * 0.008) * 0.12;
    this.visual.setScale(pulse);
    this.core.setScale(0.92 + Math.sin(this.age * 0.011) * 0.12);
    this.visual.setAlpha(0.24);
    this.core.setAlpha(0.28);
    this.fireSprite.setScale(((this.radius * 2) / 256) * (0.95 + Math.sin(this.age * 0.006) * 0.06));
    this.fireSprite.setAlpha(0.62);
    this.flames.forEach((flame) => {
      const flicker = flame.baseScale + Math.sin(this.age * 0.014 + flame.phase) * 0.18;
      flame.setScale(flicker, flicker * 1.2);
      flame.setAlpha(0.36 + Math.sin(this.age * 0.017 + flame.phase) * 0.12);
      flame.rotation = Math.sin(this.age * 0.006 + flame.phase) * 0.18;
    });
    if (this.life <= 0) {
      this.destroy();
    }
  }

  destroy() {
    this.active = false;
    this.visual.destroy();
    this.core.destroy();
    this.fireSprite.destroy();
    this.flames.forEach((flame) => flame.destroy());
  }
}
