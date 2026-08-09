import Phaser from 'phaser';

export class OrbitEgg {
  constructor(scene, index, count, rank, evolved = false) {
    this.scene = scene;
    this.index = index;
    this.count = count;
    this.rank = rank;
    this.evolved = evolved;
    this.angle = (Math.PI * 2 * index) / count;
    this.radius = (evolved ? 90 : 66) + rank * 8;
    this.speed = (evolved ? 0.0038 : 0.0028) + rank * 0.00045;
    this.damage = (evolved ? 28 : 14) + rank * 5;
    this.hitCooldownMs = evolved ? 300 : 420;
    this.lastHits = new Map();

    this.sprite = scene.physics.add.sprite(scene.player.sprite.x, scene.player.sprite.y, 'egg');
    this.sprite.setScale(1.15 + rank * 0.08);
    this.sprite.setCircle(10);
    this.sprite.setDepth(7);
    if (evolved) this.sprite.setTint(0x8deaff);
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
        const source = this.evolved ? 'evo-shell-halo' : 'orbit-eggs';
        this.scene.damageEnemy(enemy, this.damage, enemy.sprite.x, enemy.sprite.y, { source });
        if (this.evolved) {
          const chained = this.scene.enemies.find((candidate) => (
            candidate !== enemy
            && candidate.sprite.active
            && Phaser.Math.Distance.Between(
              enemy.sprite.x,
              enemy.sprite.y,
              candidate.sprite.x,
              candidate.sprite.y
            ) <= 130
          ));
          if (chained) {
            this.scene.damageEnemy(chained, Math.round(this.damage * 0.6), chained.sprite.x, chained.sprite.y, { source });
          }
        }
      }
    });
  }

  destroy() {
    if (this.sprite.active) {
      this.sprite.destroy();
    }
  }
}
