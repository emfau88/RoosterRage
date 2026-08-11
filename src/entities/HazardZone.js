import Phaser from 'phaser';

const EXTINGUISH_MS = 440;
const RANK_CONFIG = {
  1: { radius: 90, damage: 10, life: 3000 },
  2: { radius: 108, damage: 12, life: 3400 },
  3: { radius: 124, damage: 14, life: 3800 },
  4: { radius: 112, damage: 16, life: 4000 }
};
const EVOLVED_CONFIG = { radius: 136, damage: 22, life: 4500 };

export class HazardZone {
  constructor(scene, x, y, rank, evolved = false) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.rank = rank;
    this.evolved = evolved;
    const config = evolved ? EVOLVED_CONFIG : RANK_CONFIG[rank] ?? RANK_CONFIG[1];
    this.radius = config.radius;
    this.damage = config.damage;
    this.tickMs = evolved ? 320 : 420;
    this.life = config.life;
    this.maxLife = this.life;
    this.nextTickAt = 0;
    this.nextPulseFxAt = 0;
    this.age = 0;
    this.active = true;
    this.extinguishing = false;

    this.visual = scene.add.circle(x, y, this.radius, 0xff6a28, 0.1)
      .setStrokeStyle(3, 0xffd35c, 0.58)
      .setDepth(3);
    this.core = scene.add.circle(x, y, this.radius * 0.36, 0xffd35c, 0.1).setDepth(4);
    this.fireSprite = scene.add.sprite(x, y, 'molotov-v2-sheet', 4)
      .setScale((this.radius * 2) / 256)
      .setAlpha(0.9)
      .setDepth(4);
    this.fireSprite.play('molotov-v2-loop');
  }

  update(delta) {
    if (!this.active) {
      return;
    }
    this.age += delta;
    this.life -= delta;
    if (!this.extinguishing && this.life <= EXTINGUISH_MS) {
      this.extinguishing = true;
      this.fireSprite.play('molotov-v2-extinguish');
    }
    if (!this.extinguishing && this.scene.time.now >= this.nextTickAt) {
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
          if (enemy.sprite.active) {
            enemy.applyBurn(3000, Math.max(2, Math.round(this.damage * 0.25)));
          }
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
    this.visual.setAlpha(this.extinguishing ? lifeRatio * 0.18 : 0.12);
    this.core.setAlpha(this.extinguishing ? lifeRatio * 0.16 : 0.12);
    this.fireSprite.setScale((this.radius * 2) / 256);
    this.fireSprite.setAlpha(this.extinguishing ? Math.max(0.16, lifeRatio) : 0.9);
    if (this.life <= 0) {
      this.destroy();
    }
  }

  destroy() {
    this.active = false;
    this.visual.destroy();
    this.core.destroy();
    this.fireSprite.destroy();
  }
}
