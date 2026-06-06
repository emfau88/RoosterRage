import Phaser from 'phaser';

export class Enemy {
  constructor(scene, x, y, config) {
    this.scene = scene;
    this.id = scene.nextEnemyId = (scene.nextEnemyId ?? 0) + 1;
    this.maxHp = config.hp;
    this.hp = config.hp;
    this.speed = config.speed;
    this.damage = config.damage;
    this.xpValue = config.xp;
    this.type = config.type ?? 'unknown';
    this.ability = config.ability ?? null;
    this.heavyProjectile = config.heavyProjectile ?? null;
    this.elite = config.elite ?? false;
    this.boss = config.boss ?? false;
    this.explodeOnDeath = config.explodeOnDeath ?? false;
    this.explosionRadius = config.explosionRadius ?? 0;
    this.explosionDamage = config.explosionDamage ?? 0;
    this.nextAbilityAt = 0;
    this.nextHeavyAttackAt = scene.time.now + (config.heavyAttackDelay ?? 1700);
    this.warning = null;
    this.warningPulse = 0;
    this.phaseTwoTriggered = false;
    this.phaseThreeTriggered = false;
    this.hpBarWidth = config.hpBarWidth ?? 42;
    this.hpBarYOffset = config.hpBarYOffset ?? 30;

    this.sprite = scene.physics.add.sprite(x, y, config.texture ?? 'enemy-slime');
    this.sprite.setScale(config.scale ?? 0.24);
    this.sprite.setCircle(config.radius ?? 28, config.bodyOffsetX ?? 100, config.bodyOffsetY ?? 118);
    this.sprite.setDepth(4);
    if (this.elite && config.eliteTint !== false) {
      this.sprite.setTint(0xfff2a6);
    }
    this.sprite.entity = this;
    if (config.animation) {
      this.sprite.play(config.animation);
    }
    if (this.explodeOnDeath) {
      this.warning = scene.add.circle(x, y, this.explosionRadius || 42, 0xff7a33, 0.08)
        .setStrokeStyle(3, 0xffb347, 0.7)
        .setDepth(3);
    }

    this.hpBarBack = scene.add.rectangle(x - this.hpBarWidth / 2, y - this.hpBarYOffset, this.hpBarWidth, 4, 0x220f13, 0.9).setOrigin(0, 0.5).setDepth(7);
    this.hpBarFill = scene.add.rectangle(x - this.hpBarWidth / 2, y - this.hpBarYOffset, this.hpBarWidth, 4, 0xff4f5f, 1).setOrigin(0, 0.5).setDepth(8);
  }

  update(player) {
    const direction = new Phaser.Math.Vector2(
      player.sprite.x - this.sprite.x,
      player.sprite.y - this.sprite.y
    );
    if (direction.lengthSq() > 0) {
      direction.normalize();
    }
    this.sprite.setVelocity(direction.x * this.speed, direction.y * this.speed);
    this.updateAbility(player);
    this.updateWarningVisual();
    this.hpBarBack.setPosition(this.sprite.x - this.hpBarWidth / 2, this.sprite.y - this.hpBarYOffset);
    this.hpBarFill.setPosition(this.sprite.x - this.hpBarWidth / 2, this.sprite.y - this.hpBarYOffset);
  }

  updateWarningVisual() {
    if (!this.warning) {
      return;
    }
    this.warningPulse += 0.08;
    const pulse = 0.5 + Math.sin(this.warningPulse) * 0.5;
    this.sprite.setAlpha(1);
    this.warning.setPosition(this.sprite.x, this.sprite.y);
    this.warning.setScale(0.92 + pulse * 0.12);
    this.warning.setAlpha(0.3 + pulse * 0.45);
  }

  updateAbility(player) {
    if (this.boss) {
      const hpRatio = this.hp / this.maxHp;
      if (!this.phaseTwoTriggered && hpRatio <= 0.6) {
        this.phaseTwoTriggered = true;
        this.scene.spawnAddsNear(this.sprite.x, this.sprite.y, 4);
      }
      if (!this.phaseThreeTriggered && hpRatio <= 0.3) {
        this.phaseThreeTriggered = true;
        if (this.ability?.kind === 'fan') {
          this.ability = { ...this.ability, count: 7, spread: 1.45, cooldown: 2100 };
        }
      }
      if (this.heavyProjectile && this.scene.time.now >= this.nextHeavyAttackAt) {
        const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, player.sprite.x, player.sprite.y);
        this.scene.spawnBossFireball(this.sprite.x, this.sprite.y, angle, this.heavyProjectile);
        this.nextHeavyAttackAt = this.scene.time.now + (this.heavyProjectile.cooldown ?? 4300);
      }
    }
    if (!this.ability || this.scene.time.now < this.nextAbilityAt) {
      return;
    }
    const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, player.sprite.x, player.sprite.y);
    if (this.ability.kind === 'shoot') {
      this.scene.showEnemyMuzzleFlash(this.sprite.x, this.sprite.y, angle, this.ability);
      this.scene.spawnEnemyProjectile(this.sprite.x, this.sprite.y, angle, this.ability);
      this.nextAbilityAt = this.scene.time.now + this.ability.cooldown;
    }
    if (this.ability.kind === 'fan') {
      const spread = this.ability.spread ?? 0.55;
      const count = this.ability.count ?? 3;
      this.scene.showEnemyMuzzleFlash(this.sprite.x, this.sprite.y, angle, this.ability, count);
      for (let i = 0; i < count; i += 1) {
        const t = count === 1 ? 0 : i / (count - 1);
        this.scene.spawnEnemyProjectile(this.sprite.x, this.sprite.y, angle - spread / 2 + spread * t, this.ability);
      }
      this.nextAbilityAt = this.scene.time.now + this.ability.cooldown;
    }
    if (this.ability.kind === 'summon') {
      this.scene.spawnAddsNear(this.sprite.x, this.sprite.y, this.ability.count ?? 2);
      this.nextAbilityAt = this.scene.time.now + this.ability.cooldown;
    }
  }

  takeDamage(amount) {
    this.hp -= amount;
    const healthRatio = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    this.hpBarFill.scaleX = healthRatio;
    this.sprite.setAlpha(1);
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(65, () => {
      if (this.sprite.active) {
        this.sprite.clearTint();
        this.sprite.setAlpha(1);
      }
    });
    return this.hp <= 0;
  }

  destroy() {
    this.warning?.destroy();
    this.hpBarBack.destroy();
    this.hpBarFill.destroy();
    this.sprite.destroy();
  }
}
