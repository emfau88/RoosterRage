import Phaser from 'phaser';

export class SupportChicken {
  constructor(scene, index, count, rank) {
    this.scene = scene;
    this.index = index;
    this.count = count;
    this.rank = rank;
    this.angle = (Math.PI * 2 * index) / count;
    this.nextShotAt = scene.time.now + 350 + index * 220;
    this.fireRate = Math.max(760, 1450 - rank * 180);
    this.damage = 12 + rank * 5;

    this.sprite = scene.add.sprite(scene.player.sprite.x, scene.player.sprite.y, 'support-chick');
    this.sprite.setScale(0.14);
    this.sprite.setDepth(8);
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
      source: 'support-chick'
    });
    this.nextShotAt = this.scene.time.now + this.fireRate;
  }

  destroy() {
    if (this.sprite.active) {
      this.sprite.destroy();
    }
  }
}
