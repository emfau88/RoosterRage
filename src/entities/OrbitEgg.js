import Phaser from 'phaser';

export class OrbitEgg {
  constructor(scene, index, count, rank) {
    this.scene = scene;
    this.index = index;
    this.count = count;
    this.rank = rank;
    this.angle = (Math.PI * 2 * index) / count;
    this.radius = 66 + rank * 8;
    this.speed = 0.0028 + rank * 0.00045;
    this.damage = 14 + rank * 5;
    this.hitCooldownMs = 420;
    this.lastHits = new Map();

    this.sprite = scene.physics.add.sprite(scene.player.sprite.x, scene.player.sprite.y, 'egg');
    this.sprite.setScale(1.15 + rank * 0.08);
    this.sprite.setCircle(10);
    this.sprite.setDepth(7);
  }

  update(delta) {
    if (!this.sprite.active) {
      return;
    }
    this.angle += delta * this.speed;
    const x = this.scene.player.sprite.x + Math.cos(this.angle) * this.radius;
    const y = this.scene.player.sprite.y + Math.sin(this.angle) * this.radius;
    this.sprite.setPosition(x, y);
    this.sprite.rotation = this.angle;

    this.scene.enemies.forEach((enemy) => {
      if (!enemy.sprite.active) {
        return;
      }
      const now = this.scene.time.now;
      const lastHitAt = this.lastHits.get(enemy.id) ?? -Infinity;
      const distance = Phaser.Math.Distance.Between(x, y, enemy.sprite.x, enemy.sprite.y);
      if (distance <= 32 && now - lastHitAt >= this.hitCooldownMs) {
        this.lastHits.set(enemy.id, now);
        this.scene.damageEnemy(enemy, this.damage, enemy.sprite.x, enemy.sprite.y, { source: 'orbit-eggs' });
      }
    });
  }

  destroy() {
    if (this.sprite.active) {
      this.sprite.destroy();
    }
  }
}
