import Phaser from 'phaser';

export class VoidZone {
  constructor(scene, x, y, rank) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.rank = rank;
    this.synergyActive = scene.molotovEgg.rank > 0;
    this.radius = 92 + rank * 18;
    this.damage = 7 + rank * 4;
    this.pull = (34 + rank * 14) * (this.synergyActive ? 1.25 : 1);
    this.tickMs = 360;
    this.nextTickAt = 0;
    this.life = 2300 + rank * 420;
    this.maxLife = this.life;
    this.age = 0;
    this.active = true;

    this.outer = scene.add.circle(x, y, this.radius, 0x25124b, 0.24)
      .setStrokeStyle(3, 0x9b5cff, 0.78)
      .setDepth(3);
    this.core = scene.add.circle(x, y, this.radius * 0.3, 0x05030d, 0.62).setDepth(4);
    this.portal = scene.add.sprite(x, y, 'fx-atlas-v1', 12)
      .setScale((this.radius * 2) / 256)
      .setAlpha(0.58)
      .setDepth(4);
    this.portal.play('fx-void-portal');
    this.runes = [];
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8;
      const rune = scene.add.rectangle(
        x + Math.cos(angle) * this.radius * 0.68,
        y + Math.sin(angle) * this.radius * 0.68,
        7,
        18,
        0xc9a8ff,
        0.58
      ).setRotation(angle).setDepth(5);
      this.runes.push(rune);
    }
  }

  update(delta) {
    if (!this.active) {
      return;
    }

    this.age += delta;
    this.life -= delta;
    this.scene.enemies.forEach((enemy) => {
      if (!enemy.sprite.active) {
        return;
      }
      const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.sprite.x, enemy.sprite.y);
      if (distance <= this.radius && distance > 6) {
        const pullVector = new Phaser.Math.Vector2(this.x - enemy.sprite.x, this.y - enemy.sprite.y)
          .normalize()
          .scale(this.pull * (delta / 1000));
        enemy.sprite.x += pullVector.x;
        enemy.sprite.y += pullVector.y;
      }
    });

    if (this.scene.time.now >= this.nextTickAt) {
      this.nextTickAt = this.scene.time.now + this.tickMs;
      this.scene.enemies.forEach((enemy) => {
        if (enemy.sprite.active && Phaser.Math.Distance.Between(this.x, this.y, enemy.sprite.x, enemy.sprite.y) <= this.radius) {
          this.scene.damageEnemy(enemy, this.damage);
        }
      });
    }

    const lifeRatio = Phaser.Math.Clamp(this.life / this.maxLife, 0, 1);
    const pulse = 0.92 + Math.sin(this.age * 0.007) * 0.1;
    this.outer.setScale(pulse);
    this.outer.setAlpha(lifeRatio * 0.24);
    this.core.setScale(0.85 + Math.sin(this.age * 0.012) * 0.16);
    this.core.setAlpha(lifeRatio * 0.62);
    this.portal.setScale(((this.radius * 2) / 256) * (0.9 + Math.sin(this.age * 0.006) * 0.08));
    this.portal.setAlpha(lifeRatio * 0.58);
    this.portal.rotation -= delta * 0.00035;
    this.runes.forEach((rune, index) => {
      const angle = (Math.PI * 2 * index) / this.runes.length + this.age * 0.0015;
      rune.setPosition(
        this.x + Math.cos(angle) * this.radius * 0.68,
        this.y + Math.sin(angle) * this.radius * 0.68
      );
      rune.setRotation(angle + Math.PI / 2);
      rune.setAlpha(lifeRatio * 0.58);
    });

    if (this.life <= 0) {
      this.destroy();
    }
  }

  destroy() {
    this.active = false;
    this.outer.destroy();
    this.core.destroy();
    this.portal.destroy();
    this.runes.forEach((rune) => rune.destroy());
  }
}
