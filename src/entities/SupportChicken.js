import Phaser from 'phaser';

const FORMATIONS = {
  1: [{ side: 0, back: 46 }],
  2: [{ side: -27, back: 45 }, { side: 27, back: 45 }],
  3: [{ side: -44, back: 42 }, { side: 0, back: 65 }, { side: 44, back: 42 }],
  4: [
    { side: -50, back: 42 },
    { side: -17, back: 65 },
    { side: 17, back: 65 },
    { side: 50, back: 42 }
  ]
};

const DIRECTION_VECTORS = {
  south: { x: 0, y: 1 },
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  west: { x: -1, y: 0 }
};

export function getSupportChickTexture(rank, evolved = false) {
  return evolved ? 'support-chick-evo-sheet'
    : 'support-chick-r' + Phaser.Math.Clamp(rank, 1, 5) + '-sheet';
}

export class SupportChicken {
  constructor(scene, index, count, rank, evolved = false) {
    this.scene = scene;
    this.index = index;
    this.count = count;
    this.rank = rank;
    this.evolved = evolved;
    this.textureKey = getSupportChickTexture(rank, evolved);
    this.formationSlot = FORMATIONS[count]?.[index] ?? FORMATIONS[1][0];
    this.nextShotAt = scene.time.now + 350 + index * 220;
    this.fireRate = evolved ? 540 : Math.max(720, 1450 - rank * 125);
    this.damage = (evolved ? 19 : 12) + rank * 5;
    this.salvoCount = evolved || rank >= 2 ? 2 : 1;
    this.pierce = evolved || rank >= 2 ? 1 : 0;
    this.slowRatio = evolved ? 0.68 : rank >= 5 ? 0.78 : rank >= 3 ? 0.86 : 1;
    this.slowMs = evolved ? 1200 : rank >= 5 ? 950 : rank >= 3 ? 700 : 0;
    this.ricochet = evolved || rank >= 5 ? 1 : 0;
    this.lastDirection = scene.player.lastMoveDirection ?? 'south';

    const start = this.getFormationTarget();
    this.shadow = scene.add.ellipse(start.x, start.y + 14, evolved ? 34 : 30, 11, 0x261913, 1)
      .setAlpha(0.24)
      .setDepth(4);
    this.sprite = scene.add.sprite(start.x, start.y, this.textureKey, 0)
      .setScale(evolved ? 0.248 : 0.225)
      .setDepth(5);
    this.sprite.play(this.textureKey + '-walk-' + this.lastDirection);
  }

  getFormationTarget() {
    const direction = DIRECTION_VECTORS[this.scene.player.lastMoveDirection]
      ?? DIRECTION_VECTORS.south;
    const behind = { x: -direction.x, y: -direction.y };
    const side = { x: -direction.y, y: direction.x };
    return {
      x: this.scene.player.sprite.x
        + behind.x * this.formationSlot.back
        + side.x * this.formationSlot.side,
      y: this.scene.player.sprite.y
        + behind.y * this.formationSlot.back
        + side.y * this.formationSlot.side
        + 5
    };
  }

  update(delta) {
    if (!this.sprite.active) return;

    const targetPosition = this.getFormationTarget();
    const dx = targetPosition.x - this.sprite.x;
    const dy = targetPosition.y - this.sprite.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 220) {
      this.sprite.setPosition(targetPosition.x, targetPosition.y);
    } else {
      const followStrength = 1 - Math.exp(-delta * (this.evolved ? 0.018 : 0.015));
      this.sprite.setPosition(
        Phaser.Math.Linear(this.sprite.x, targetPosition.x, followStrength),
        Phaser.Math.Linear(this.sprite.y, targetPosition.y, followStrength)
      );
    }
    this.updateWalkAnimation(dx, dy, distance);
    this.shadow.setPosition(this.sprite.x, this.sprite.y + 14);
    const inFront = this.sprite.y >= this.scene.player.sprite.y;
    this.shadow.setDepth(inFront ? 6.1 : 4.1);
    this.sprite.setDepth(inFront ? 6.2 : 5);

    if (this.scene.time.now < this.nextShotAt) return;
    const target = this.scene.findNearestEnemyFrom(this.sprite.x, this.sprite.y);
    if (!target) {
      this.nextShotAt = this.scene.time.now + 400;
      return;
    }
    this.fireAt(target);
  }

  updateWalkAnimation(dx, dy, distance) {
    if (distance > 1.35) {
      if (Math.abs(dx) > Math.abs(dy)) {
        this.lastDirection = dx < 0 ? 'west' : 'east';
      } else {
        this.lastDirection = dy < 0 ? 'north' : 'south';
      }
      this.sprite.play(this.textureKey + '-walk-' + this.lastDirection, true);
      return;
    }
    if (this.sprite.anims.isPlaying) {
      this.sprite.anims.stop();
      const rowStart = { south: 0, west: 4, east: 8, north: 12 }[this.lastDirection] ?? 0;
      this.sprite.setFrame(rowStart);
    }
  }

  fireAt(target) {
    const x = this.sprite.x;
    const y = this.sprite.y - 7;
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
        texture: this.evolved ? 'evo-chick-squadron-projectile' : 'egg',
        scale: this.evolved ? 1 : undefined,
        source: this.evolved ? 'evo-chick-squadron' : 'support-chick',
        pierce: this.pierce,
        ricochet: this.ricochet,
        slowRatio: this.slowRatio,
        slowMs: this.slowMs,
        sfx: 'egg-launch-ace',
        sfxVolume: 0.08,
        sfxCooldown: 180
      });
    }
    this.nextShotAt = this.scene.time.now + this.fireRate;
  }

  destroy() {
    if (this.sprite.active) this.sprite.destroy();
    if (this.shadow.active) this.shadow.destroy();
  }
}
