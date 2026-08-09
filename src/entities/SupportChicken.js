import Phaser from 'phaser';

export class SupportChicken {
  constructor(scene, index, count, rank, evolved = false) {
    this.scene = scene;
    this.index = index;
    this.count = count;
    this.rank = rank;
    this.evolved = evolved;
    this.angle = (Math.PI * 2 * index) / count;
    this.nextShotAt = scene.time.now + 350 + index * 220;
    this.fireRate = evolved ? 620 : Math.max(760, 1450 - rank * 180);
    this.damage = (evolved ? 18 : 12) + rank * 5;

    this.sprite = scene.add.sprite(scene.player.sprite.x, scene.player.sprite.y, 'support-chick');
    this.sprite.setScale(0.14);
    this.sprite.setDepth(8);
    if (evolved) this.sprite.setTint(0xfff3b0);
  }

  update(delta) {
    if (!this.sprite.active) {
      return;
    }
    this.angle += delta * 0.0018;
    const radius = 52 + this.rank * 4;
    const x = this.scene.player.sprite.x + Math.cos(this.angle) * radius;
    const y = this.scene.player.sprite.y + Math.sin(this.angle) * radius + 24;
    this.sprite.setPosition(x, y);
    this.sprite.setRotation(Math.sin(this.angle * 1.4) * 0.08);

    if (this.scene.time.now < this.nextShotAt) {
      return;
    }
    const target = this.scene.findNearestEnemyFrom(x, y);
    if (!target) {
      this.nextShotAt = this.scene.time.now + 400;
      return;
    }
    const angle = Phaser.Math.Angle.Between(x, y, target.sprite.x, target.sprite.y);
    this.scene.spawnSpecialProjectileFrom(x, y, angle, target, {
      damage: this.damage,
      speed: 470,
      life: 1350,
      homing: true,
      maxTurnRate: 0.065,
      hitRadius: 22,
      trailRadius: 7,
      trailAlpha: 0.16,
      source: this.evolved ? 'evo-chick-squadron' : 'support-chick',
      slowRatio: this.evolved ? 0.72 : 1,
      slowMs: this.evolved ? 900 : 0
    });
    this.nextShotAt = this.scene.time.now + this.fireRate;
  }

  destroy() {
    if (this.sprite.active) {
      this.sprite.destroy();
    }
  }
}
