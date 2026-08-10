import Phaser from 'phaser';

export class RocketProjectile {
  constructor(scene, x, y, target, rank, evolved = false) {
    this.scene = scene;
    this.target = target;
    this.rank = rank;
    this.evolved = evolved;
    this.synergyActive = scene.player.fireEggs;
    this.damage = Math.round(((evolved ? 28 : 34) + rank * 14) * (this.synergyActive ? 1.25 : 1));
    this.radius = (evolved ? 78 : 62) + rank * 12;
    this.speed = 250 + rank * 28;
    this.turnRate = 0.055 + rank * 0.008;
    this.life = 2800;
    this.active = true;
    this.angle = Phaser.Math.Angle.Between(x, y, target.sprite.x, target.sprite.y);

    this.sprite = scene.physics.add.sprite(x, y, 'rocket-egg');
    this.sprite.setScale(1.05 + rank * 0.08);
    this.sprite.setCircle(11);
    this.sprite.setRotation(this.angle);
    this.sprite.setDepth(7);
    if (evolved) this.sprite.setTint(0xffd35c);
    this.trail = scene.add.circle(x, y, 13, 0xff7a24, 0.28).setDepth(4);
  }

  update(delta) {
    if (!this.active || !this.sprite.active) {
      return;
    }

    this.life -= delta;
    if (this.target?.sprite?.active) {
      const desired = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, this.target.sprite.x, this.target.sprite.y);
      this.angle = Phaser.Math.Angle.RotateTo(this.angle, desired, this.turnRate);
    }
    this.sprite.rotation = this.angle;
    this.scene.physics.velocityFromRotation(this.angle, this.speed, this.sprite.body.velocity);
    this.trail.setPosition(this.sprite.x - Math.cos(this.angle) * 12, this.sprite.y - Math.sin(this.angle) * 12);

    const hit = this.scene.enemies.find((enemy) => enemy.sprite.active && Phaser.Math.Distance.Between(
      this.sprite.x,
      this.sprite.y,
      enemy.sprite.x,
      enemy.sprite.y
    ) < 32);
    if (hit) {
      this.scene.createRocketExplosion(
        this.sprite.x,
        this.sprite.y,
        this.damage,
        this.radius,
        this.evolved,
        this.rank
      );
      this.destroy();
      return;
    }

    if (this.life <= 0) {
      this.destroy();
    }
  }

  destroy() {
    this.active = false;
    if (this.trail.active) {
      this.trail.destroy();
    }
    if (this.sprite.active) {
      this.sprite.destroy();
    }
  }
}
