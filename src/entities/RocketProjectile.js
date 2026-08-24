import Phaser from 'phaser';

const RANK_CONFIG = {
  1: { damage: 48, radius: 82, speed: 280, turnRate: 0.064, width: 48, height: 30, trailWidth: 40 },
  2: { damage: 64, radius: 100, speed: 305, turnRate: 0.074, width: 56, height: 34, trailWidth: 46 },
  3: { damage: 80, radius: 118, speed: 330, turnRate: 0.084, width: 66, height: 42, trailWidth: 52 },
  4: { damage: 96, radius: 132, speed: 355, turnRate: 0.094, width: 72, height: 44, trailWidth: 58 }
};
const EVOLVED_CONFIG = {
  damage: 112,
  radius: 158,
  speed: 380,
  turnRate: 0.11,
  width: 84,
  height: 52,
  trailWidth: 70
};

export class RocketProjectile {
  constructor(scene, x, y, target, rank, evolved = false) {
    this.scene = scene;
    this.target = target;
    this.rank = rank;
    this.evolved = evolved;
    this.synergyActive = scene.player.fireEggs;
    const config = evolved ? EVOLVED_CONFIG : RANK_CONFIG[rank] ?? RANK_CONFIG[1];
    this.damage = Math.round(config.damage * (this.synergyActive ? 1.25 : 1));
    this.radius = config.radius;
    this.speed = config.speed;
    this.turnRate = config.turnRate;
    this.life = 3000;
    this.active = true;
    this.angle = Phaser.Math.Angle.Between(x, y, target.sprite.x, target.sprite.y);
    this.textureKey = evolved ? 'rocket-egg-evo' : `rocket-egg-r${rank}`;

    this.shadow = scene.add.ellipse(x, y + 9, config.width * 0.54, config.height * 0.3, 0x160d08, 0.16)
      .setDepth(3.8);
    this.trail = scene.add.image(x, y, 'rocket-exhaust')
      .setDisplaySize(config.trailWidth, config.height * 0.58)
      .setOrigin(0.88, 0.5)
      .setFlipX(true)
      .setAlpha(evolved ? 0.58 : 0.38 + rank * 0.035)
      .setDepth(4.2);
    this.sprite = scene.physics.add.sprite(x, y, this.textureKey)
      .setDisplaySize(config.width, config.height)
      .setCircle(42, 86, 38)
      .setRotation(this.angle)
      .setDepth(7);
    this.updateVisualPositions();
  }

  update(delta) {
    if (!this.active || !this.sprite.active) return;

    this.life -= delta;
    if (this.target?.sprite?.active) {
      const desired = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, this.target.sprite.x, this.target.sprite.y);
      this.angle = Phaser.Math.Angle.RotateTo(this.angle, desired, this.turnRate);
    }
    this.sprite.rotation = this.angle;
    this.scene.physics.velocityFromRotation(this.angle, this.speed, this.sprite.body.velocity);
    this.updateVisualPositions();

    const hit = this.scene.enemies.find((enemy) => enemy.sprite.active && Phaser.Math.Distance.Between(
      this.sprite.x,
      this.sprite.y,
      enemy.sprite.x,
      enemy.sprite.y
    ) < 34);
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

    if (this.life <= 0) this.destroy();
  }

  updateVisualPositions() {
    const nozzleOffset = this.sprite.displayWidth * 0.32;
    const trailX = this.sprite.x - Math.cos(this.angle) * nozzleOffset;
    const trailY = this.sprite.y - Math.sin(this.angle) * nozzleOffset;
    this.trail.setPosition(trailX, trailY).setRotation(this.angle);
    this.shadow.setPosition(this.sprite.x, this.sprite.y + 10);
  }

  destroy() {
    if (!this.active) return;
    this.active = false;
    this.shadow.destroy();
    this.trail.destroy();
    this.sprite.destroy();
  }
}
