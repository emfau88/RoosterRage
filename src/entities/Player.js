import Phaser from 'phaser';
import { USE_NEXT_ROOSTER_VISUAL, ACE_VISUAL_VERSION, ARTILLERY_VISUAL_VERSION, STORM_VISUAL_VERSION } from '../config/aceVisual.js';
import { PLAYER_VISUAL_BOUNDS } from '../data/playerVisualBounds.js';

export class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.maxHp = 100;
    this.hp = this.maxHp;
    this.speed = 210;
    this.level = 1;
    this.xp = 0;
    this.xpToNext = this.getXpRequirement(this.level);
    this.fireRate = 800;
    this.projectileDamage = 20;
    this.shotCount = 1;
    this.fireEggs = false;
    this.armor = 0;
    this.regenPerSecond = 0;
    this.xpMagnetRadius = 220;
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
    this.roosterTextureKey = 'rooster-ace-walk';
    this.primaryAttack = {};
    this.primaryEvolution = null;
    this.upgradeAffinities = {};
    this.lastRegenAt = 0;
    this.aimAngle = 0;
    this.upgrades = [];
    this.upgradeRanks = new Map();
    this.invulnerableUntil = 0;
    this.baseScale = 0.25;
    this.collisionReferenceScale = this.baseScale;

    this.sprite = scene.physics.add.sprite(x, y, this.roosterTextureKey, 0);
    this.sprite.setScale(this.baseScale);
    this.sprite.setCircle(58, 70, 86);
    this.sprite.setDepth(6);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.body.setDamping(true);
    this.sprite.body.setDrag(0.88);
    this.lastMoveDirection = 'south';
    // A contact mark identifies the player without suggesting an attack radius.
    // Enemy warnings still render above it; the physics body stays unchanged.
    this.groundMarker = scene.add.ellipse(x, y, 34, 10, 0x10242a, 0.65)
      .setStrokeStyle(2, 0xd6f6ed, 0.8).setDepth(5.8);
    this.sprite.play('rooster-ace-walk-south');


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
    this.updateGroundMarker();
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
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.45,
      yoyo: true,
      duration: 70,
      repeat: 2,
      // Keep the player opaque after the hit flash, even if the visual is
      // interrupted by a future effect.
      onComplete: () => this.sprite.setAlpha(1),
      onStop: () => this.sprite.setAlpha(1)
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
    if (this.scene.effects.enabled('screenFlash')) {
      this.scene.cameras.main.flash(140, 255, 226, 115, false);
    }
    this.scene.audio?.play('second-wind');
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
  }

  addMaxHp(amount) {
    this.maxHp += amount;
    this.hp = Math.min(this.maxHp, this.hp + amount);
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

  setRoosterVisual(roosterId, textureKey = `rooster-${roosterId}-walk`) {
    this.roosterId = roosterId;
    this.roosterTextureKey = textureKey;
    this.sprite.setTexture(textureKey, 0);
    this.sprite.setFlipX(this.shouldFlipHorizontal(this.lastMoveDirection));
    this.sprite.play(`rooster-${roosterId}-walk-${this.lastMoveDirection}`, true);
  }

  setVisualScale(scale, collisionReferenceScale = scale) {
    this.baseScale = scale;
    this.collisionReferenceScale = collisionReferenceScale;
    this.sprite.setScale(scale);
    // Keep the existing gameplay footprint and its authored footward offset
    // while allowing the artwork to be a little larger on desktop.
    const radius = 58 * collisionReferenceScale / scale;
    const centerYOffset = 16 * collisionReferenceScale / scale;
    this.sprite.setCircle(radius, 128 - radius, 128 + centerYOffset - radius);
  }

  getXpRequirement(level) {
    const requirements = [45, 70, 105, 145, 190, 245, 305, 375, 455, 545, 645, 755];
    return requirements[Math.min(requirements.length - 1, Math.max(0, level - 1))]
      + Math.max(0, level - requirements.length) * 90;
  }

  shouldFlipHorizontal(direction) {
    if (direction !== 'east' && direction !== 'west') return false;
    // Storm's clean side row is authored facing east; Ace and Artillery face west.
    return this.roosterId === 'storm' ? direction === 'west' : direction === 'east';
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
      const roosterId = this.roosterId ?? 'ace';
      this.sprite.setFlipX(this.shouldFlipHorizontal(this.lastMoveDirection));
      if (USE_NEXT_ROOSTER_VISUAL[roosterId]) {
        this.sprite.play(`rooster-${roosterId}-idle-${this.lastMoveDirection}`, true);
        return;
      }
      this.sprite.anims.stop();
      const frameByDirection = {
        south: 0,
        west: 4,
        east: 4,
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
    this.sprite.setFlipX(this.shouldFlipHorizontal(this.lastMoveDirection));
    this.sprite.play(`rooster-${this.roosterId ?? 'ace'}-walk-${this.lastMoveDirection}`, true);
  }

  updateVisualPose(velocity) {
    const moving = velocity.lengthSq() >= 0.01;
    const now = this.scene.time.now;
    if (!moving) {
      if (USE_NEXT_ROOSTER_VISUAL[this.roosterId ?? 'ace']) {
        this.sprite.setScale(this.baseScale);
        this.sprite.setAngle(0);
        return;
      }
      const idle = Math.sin(now * 0.0042);
      this.sprite.setScale(
        this.baseScale * (1 + idle * 0.012),
        this.baseScale * (1 - idle * 0.008)
      );
      this.sprite.setAngle(0);
      return;
    }

    // The authored four-frame sheets carry the complete walk cycle. Keeping the
    // sprite transform stable avoids apparent jitter and preserves a true north view.
    this.sprite.setScale(this.baseScale);
    this.sprite.setAngle(0);
  }

  updateGroundMarker() {
    const versions = { ace: ACE_VISUAL_VERSION, artillery: ARTILLERY_VISUAL_VERSION, storm: STORM_VISUAL_VERSION };
    const bounds = versions[this.roosterId] === 'final' ? PLAYER_VISUAL_BOUNDS[this.roosterId] : null;
    this.groundMarker.setPosition(this.sprite.x, this.sprite.y + (bounds ? bounds.bottom - 128 : 105) * this.baseScale);
  }

  destroy() {
    this.groundMarker.destroy();
    this.sprite.destroy();
  }
}
