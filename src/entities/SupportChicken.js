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
    this.fireRate = evolved ? 540 : Math.max(720, 1450 - rank * 125);
    this.damage = (evolved ? 19 : 12) + rank * 5;
    this.salvoCount = evolved || rank >= 2 ? 2 : 1;
    this.pierce = evolved || rank >= 2 ? 1 : 0;
    this.slowRatio = evolved ? 0.68 : rank >= 5 ? 0.78 : rank >= 3 ? 0.86 : 1;
    this.slowMs = evolved ? 1200 : rank >= 5 ? 950 : rank >= 3 ? 700 : 0;
    this.ricochet = evolved || rank >= 5 ? 1 : 0;

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
    const baseAngle = Phaser.Math.Angle.Between(x, y, target.sprite.x, target.sprite.y);
    for (let shot = 0; shot < this.salvoCount; shot += 1) {
      const offset = this.salvoCount === 1 ? 0 : (shot === 0 ? -0.065 : 0.065);
      this.scene.spawnSpecialProjectileFrom(x, y, baseAngle + offset, target, {
        damage: this.damage,
        speed: this.evolved ? 560 : 470 + this.rank * 12,
        life: 1450,
        homing: true,
        maxTurnRate: this.evolved ? 0.09 : 0.065,
        hitRadius: this.evolved ? 25 : 22,
        trailRadius: this.evolved ? 9 : 7,
        trailColor: this.evolved ? 0xffe16a : 0xfffbef,
        trailAlpha: this.evolved ? 0.3 : 0.16,
        source: this.evolved ? 'evo-chick-squadron' : 'support-chick',
        pierce: this.pierce,
        ricochet: this.ricochet,
        slowRatio: this.slowRatio,
        slowMs: this.slowMs
      });
    }
    this.nextShotAt = this.scene.time.now + this.fireRate;
  }

  destroy() {
    if (this.sprite.active) {
      this.sprite.destroy();
    }
  }
}
