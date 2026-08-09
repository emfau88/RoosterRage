import Phaser from 'phaser';

export class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.maxHp = 100;
    this.hp = this.maxHp;
    this.speed = 210;
    this.level = 1;
    this.xp = 0;
    this.xpToNext = 60;
    this.fireRate = 800;
    this.projectileDamage = 20;
    this.shotCount = 1;
    this.fireEggs = false;
    this.armor = 0;
    this.regenPerSecond = 0;
    this.xpMagnetRadius = 118;
    this.projectilePierce = 0;
    this.projectileSizeBonus = 0;
    this.projectileSpeedBonus = 0;
    this.projectileRicochets = 0;
    this.projectileKnockback = 0;
    this.critChance = 0;
    this.critMultiplier = 2;
    this.secondWindCharges = 0;
    this.roosterId = null;
    this.roosterName = '';
    this.primaryAttack = {};
    this.upgradeAffinities = {};
    this.lastRegenAt = 0;
    this.aimAngle = 0;
    this.upgrades = [];
    this.upgradeRanks = new Map();
    this.invulnerableUntil = 0;
    this.baseScale = 0.25;

    this.sprite = scene.physics.add.sprite(x, y, 'rooster-walk', 0);
    this.sprite.setScale(this.baseScale);
    this.sprite.setCircle(58, 70, 86);
    this.sprite.setDepth(6);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.body.setDamping(true);
    this.sprite.body.setDrag(0.88);
    this.lastMoveDirection = 'south';
    this.sprite.play('rooster-walk-south');

    this.hpBarWidth = 54;
    this.hpBarBack = scene.add.rectangle(x - 27, y - 46, this.hpBarWidth, 6, 0x1c0f12, 0.92).setOrigin(0, 0.5).setDepth(20);
    this.hpBarFill = scene.add.rectangle(x - 27, y - 46, this.hpBarWidth, 6, 0x5cff74, 1).setOrigin(0, 0.5).setDepth(21);
    this.hpBarBorder = scene.add.rectangle(x, y - 46, this.hpBarWidth + 2, 8).setStrokeStyle(1, 0xffffff, 0.7).setDepth(22);
  }

  update(inputVector) {
    const velocity = inputVector.clone();
    if (velocity.lengthSq() > 1) {
      velocity.normalize();
    }
    this.sprite.setVelocity(velocity.x * this.speed, velocity.y * this.speed);
    this.regenerate();
    this.updateAnimation(velocity);
    this.updateVisualPose(velocity);
    this.updateHealthBar();
  }

  aimAt(angle) {
    this.aimAngle = angle;
  }

  getMuzzlePosition(distance = 38) {
    return {
      x: this.sprite.x + Math.cos(this.aimAngle) * distance,
      y: this.sprite.y + Math.sin(this.aimAngle) * distance
    };
  }

  damage(amount, time) {
    if (time < this.invulnerableUntil) {
      return false;
    }
    const finalDamage = Math.max(1, amount - this.armor);
    this.hp = Math.max(0, this.hp - finalDamage);
    if (this.hp <= 0 && this.secondWindCharges > 0) {
      this.secondWindCharges -= 1;
      this.hp = Math.max(1, Math.round(this.maxHp * 0.4));
      this.invulnerableUntil = time + 1500;
      this.showSecondWind();
    } else {
      this.invulnerableUntil = time + 500;
    }
    this.updateHealthBar();
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.45,
      yoyo: true,
      duration: 70,
      repeat: 2
    });
    return true;
  }

  showSecondWind() {
    const ring = this.scene.add.circle(this.sprite.x, this.sprite.y, 36, 0x5ad7ff, 0.2)
      .setStrokeStyle(5, 0xfff3b0, 0.95)
      .setDepth(18);
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 2.6,
      duration: 480,
      onComplete: () => ring.destroy()
    });
    this.scene.cameras.main.flash(140, 255, 226, 115, false);
    this.scene.audio?.play('level-up', { volume: 0.26, cooldown: 250 });
  }

  regenerate() {
    if (this.regenPerSecond <= 0) {
      return;
    }
    const now = this.scene.time.now;
    const deltaSeconds = this.lastRegenAt ? (now - this.lastRegenAt) / 1000 : 0;
    this.lastRegenAt = now;
    if (deltaSeconds > 0) {
      this.hp = Math.min(this.maxHp, this.hp + this.regenPerSecond * deltaSeconds);
    }
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.updateHealthBar();
  }

  addMaxHp(amount) {
    this.maxHp += amount;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.updateHealthBar();
  }

  addXp(amount) {
    this.xp += amount;
    let levelsGained = 0;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level += 1;
      levelsGained += 1;
      this.xpToNext = this.getXpRequirement(this.level);
    }
    return levelsGained;
  }

  getXpRequirement(level) {
    const requirements = [35, 70, 105, 145, 190, 245, 305, 375, 455, 545, 645, 755];
    return requirements[Math.min(requirements.length - 1, Math.max(0, level - 1))]
      + Math.max(0, level - requirements.length) * 90;
  }

  getUpgradeRank(id) {
    return this.upgradeRanks.get(id) ?? 0;
  }

  applyUpgrade(upgrade, scene) {
    const nextRank = this.getUpgradeRank(upgrade.id) + 1;
    if (!upgrade.consumable) {
      this.upgradeRanks.set(upgrade.id, nextRank);
    }
    const label = upgrade.maxRank && upgrade.maxRank > 1
      ? `${upgrade.name} ${nextRank}`
      : upgrade.name;
    this.upgrades.push(label);
    upgrade.apply(this, scene, nextRank);
    scene.loadout?.onUpgradeApplied(upgrade, this);
  }

  updateAnimation(velocity) {
    if (velocity.lengthSq() < 0.01) {
      this.sprite.anims.stop();
      const frameByDirection = {
        south: 0,
        west: 4,
        east: 8,
        north: 12
      };
      this.sprite.setFrame(frameByDirection[this.lastMoveDirection]);
      return;
    }

    if (Math.abs(velocity.x) > Math.abs(velocity.y)) {
      this.lastMoveDirection = velocity.x < 0 ? 'west' : 'east';
    } else {
      this.lastMoveDirection = velocity.y < 0 ? 'north' : 'south';
    }
    this.sprite.play(`rooster-walk-${this.lastMoveDirection}`, true);
  }

  updateVisualPose(velocity) {
    const moving = velocity.lengthSq() >= 0.01;
    const now = this.scene.time.now;
    if (!moving) {
      const idle = Math.sin(now * 0.0042);
      this.sprite.setScale(
        this.baseScale * (1 + idle * 0.018),
        this.baseScale * (1 - idle * 0.014)
      );
      this.sprite.setAngle(Math.sin(now * 0.0026) * 1.4);
      return;
    }

    const step = Math.sin(now * 0.018);
    const lift = Math.abs(step);
    if (this.lastMoveDirection === 'east' || this.lastMoveDirection === 'west') {
      const directionSign = this.lastMoveDirection === 'east' ? 1 : -1;
      this.sprite.setScale(
        this.baseScale * (1 + lift * 0.045),
        this.baseScale * (1 - lift * 0.035)
      );
      this.sprite.setAngle(directionSign * step * 4.5);
      return;
    }

    this.sprite.setScale(
      this.baseScale * (1 + lift * 0.025),
      this.baseScale * (1 - lift * 0.025)
    );
    this.sprite.setAngle(step * 2);
  }

  updateHealthBar() {
    const ratio = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    const barX = this.sprite.x - this.hpBarWidth / 2;
    const barY = this.sprite.y - 48;
    this.hpBarBack.setPosition(barX, barY);
    this.hpBarFill.setPosition(barX, barY);
    this.hpBarBorder.setPosition(this.sprite.x, barY);
    this.hpBarFill.scaleX = ratio;
    if (ratio > 0.55) {
      this.hpBarFill.fillColor = 0x5cff74;
    } else if (ratio > 0.25) {
      this.hpBarFill.fillColor = 0xffd35c;
    } else {
      this.hpBarFill.fillColor = 0xff4f5f;
    }
  }

  destroy() {
    this.hpBarBack.destroy();
    this.hpBarFill.destroy();
    this.hpBarBorder.destroy();
    this.sprite.destroy();
  }
}
