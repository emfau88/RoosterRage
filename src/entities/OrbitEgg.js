import Phaser from 'phaser';

export class OrbitEgg {
  constructor(scene, index, count, rank, evolved = false) {
    this.scene = scene;
    this.index = index;
    this.count = count;
    this.rank = rank;
    this.evolved = evolved;
    this.angle = (Math.PI * 2 * index) / count;
    this.radius = evolved
      ? 94 + (index % 2) * 24
      : rank >= 4 ? 76 + (index % 2) * 24 : 66 + rank * 8;
    this.speed = (evolved ? 0.0038 : 0.0028) + rank * 0.00045;
    this.damage = evolved ? 14 + rank * 3 : 14 + rank * 5;
    this.hitCooldownMs = evolved ? 450 : 420;
    this.lastHits = new Map();
    this.nextBossPulseAt = scene.time.now + 650 + index * 180;

    this.sprite = scene.physics.add.sprite(scene.player.sprite.x, scene.player.sprite.y, 'egg');
    this.sprite.setScale(1.15 + rank * 0.08);
    this.sprite.setCircle(10);
    this.sprite.setDepth(7);
    if (evolved) this.sprite.setTint(0x8deaff);
    this.trail = rank >= 3
      ? scene.add.circle(
        scene.player.sprite.x,
        scene.player.sprite.y,
        evolved ? 10 : 7,
        evolved ? 0x9ff7ff : 0xffd35c,
        evolved ? 0.34 : 0.22
      ).setDepth(5)
      : null;
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
    this.trail?.setPosition(x, y);

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
    this.pulseBossAtRange(x, y);
  }

  pulseBossAtRange(x, y) {
    const now = this.scene.time.now;
    if (now < this.nextBossPulseAt) {
      return;
    }
    const boss = this.scene.enemies.find((enemy) => enemy.boss && enemy.sprite.active);
    if (!boss || Phaser.Math.Distance.Between(
      this.scene.player.sprite.x,
      this.scene.player.sprite.y,
      boss.sprite.x,
      boss.sprite.y
    ) > 460) {
      return;
    }
    this.nextBossPulseAt = now + (this.evolved ? 1350 : 1650);
    const source = this.evolved ? 'evo-shell-halo:boss-pulse' : 'orbit-eggs:boss-pulse';
    const damage = Math.max(1, Math.round(this.damage * (this.evolved ? 0.6 : 0.5)));
    this.scene.damageEnemy(boss, damage, boss.sprite.x, boss.sprite.y, { source });
    const bolt = this.scene.add.graphics().setDepth(8);
    bolt.lineStyle(this.evolved ? 3 : 2, this.evolved ? 0x9ff7ff : 0xffd35c, 0.85);
    bolt.lineBetween(x, y, boss.sprite.x, boss.sprite.y);
    this.scene.tweens.add({
      targets: bolt,
      alpha: 0,
      duration: 130,
      onComplete: () => bolt.destroy()
    });
  }

  destroy() {
    this.trail?.destroy();
    if (this.sprite.active) {
      this.sprite.destroy();
    }
  }
}
