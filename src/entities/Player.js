import Phaser from 'phaser';

export class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.maxHp = 100;
    this.hp = this.maxHp;
    this.speed = 210;
    this.level = 1;
    this.xp = 0;
    this.xpToNext = 52;
    this.fireRate = 800;
    this.projectileDamage = 20;
    this.shotCount = 1;
    this.fireEggs = false;
    this.armor = 0;
    this.regenPerSecond = 0;
    this.xpMagnetRadius = 118;
    this.projectilePierce = 0;
    this.projectileSizeBonus = 0;
    this.lastRegenAt = 0;
    this.aimAngle = 0;
    this.upgrades = [];
    this.invulnerableUntil = 0;

    this.sprite = scene.physics.add.sprite(x, y, 'rooster-walk', 0);
    this.sprite.setScale(0.28);
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
    this.updateHealthBar();
    this.invulnerableUntil = time + 500;
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.45,
      yoyo: true,
      duration: 70,
      repeat: 2
    });
    return true;
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
    if (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level += 1;
      this.xpToNext = Math.round(this.xpToNext * 1.42 + 18);
      return true;
    }
    return false;
  }

  applyUpgrade(upgrade) {
    this.upgrades.push(upgrade.name);
    upgrade.apply(this);
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
