import Phaser from 'phaser';

export class Enemy {
  constructor(scene) {
    this.scene = scene;
    this.activationId = 0;
    this.warning = null;
    this.knockbackVelocity = new Phaser.Math.Vector2();
    this.sprite = scene.physics.add.sprite(0, 0, 'enemy-slime');
    this.sprite.setActive(false).setVisible(false);
    this.sprite.disableBody(true, true);
    this.sprite.entity = this;
    this.hpBarBack = scene.add.rectangle(0, 0, 42, 4, 0x220f13, 0.9)
      .setOrigin(0, 0.5)
      .setDepth(7)
      .setVisible(false);
    this.hpBarFill = scene.add.rectangle(0, 0, 42, 4, 0xff4f5f, 1)
      .setOrigin(0, 0.5)
      .setDepth(8)
      .setVisible(false);
  }

  reset(x, y, config) {
    const { scene } = this;
    this.activationId += 1;
    this.id = scene.nextEnemyId = (scene.nextEnemyId ?? 0) + 1;
    this.maxHp = config.hp;
    this.hp = config.hp;
    this.speed = config.speed;
    this.damage = config.damage;
    this.xpValue = config.xp;
    this.type = config.type ?? 'unknown';
    this.role = config.role ?? this.type;
    this.ability = config.ability ?? null;
    this.heavyProjectile = config.heavyProjectile ?? null;
    this.elite = config.elite ?? false;
    this.boss = config.boss ?? false;
    this.explodeOnDeath = config.explodeOnDeath ?? false;
    this.explosionRadius = config.explosionRadius ?? 0;
    this.explosionDamage = config.explosionDamage ?? 0;
    this.nextAbilityAt = 0;
    this.abilityCharging = false;
    this.heavyCharging = false;
    this.nextHeavyAttackAt = scene.time.now + (config.heavyAttackDelay ?? 1700);
    this.bossPhases = config.bossPhases ?? [];
    this.bossPhaseIndex = 0;
    this.warning?.destroy();
    this.warning = null;
    this.warningPulse = 0;
    this.knockbackUntil = 0;
    this.contactReadyAt = 0;
    this.knockbackVelocity.set(0, 0);
    this.hpBarWidth = config.hpBarWidth ?? 42;
    this.hpBarYOffset = config.hpBarYOffset ?? 30;

    this.sprite.enableBody(true, x, y, true, true);
    this.sprite.setTexture(config.texture ?? 'enemy-slime');
    this.sprite.setScale(config.scale ?? 0.24);
    this.sprite.setCircle(config.radius ?? 28, config.bodyOffsetX ?? 100, config.bodyOffsetY ?? 118);
    this.sprite.setDepth(4);
    this.sprite.clearTint();
    if (this.elite && config.eliteTint !== false) {
      this.sprite.setTint(0xfff2a6);
    }
    this.sprite.setAlpha(1);
    this.sprite.stop();
    if (config.animation) {
      this.sprite.play(config.animation);
    }
    if (this.explodeOnDeath) {
      this.warning = scene.add.circle(x, y, this.explosionRadius || 42, 0xff7a33, 0.08)
        .setStrokeStyle(3, 0xffb347, 0.7)
        .setDepth(3);
    }

    this.hpBarBack.setPosition(x - this.hpBarWidth / 2, y - this.hpBarYOffset)
      .setSize(this.hpBarWidth, 4)
      .setDisplaySize(this.hpBarWidth, 4)
      .setAlpha(0.9)
      .setVisible(true)
      .setActive(true);
    this.hpBarFill.setPosition(x - this.hpBarWidth / 2, y - this.hpBarYOffset)
      .setSize(this.hpBarWidth, 4)
      .setDisplaySize(this.hpBarWidth, 4)
      .setScale(1, 1)
      .setAlpha(1)
      .setVisible(true)
      .setActive(true);
    return this;
  }

  update(player) {
    if (this.scene.time.now < this.knockbackUntil) {
      this.sprite.setVelocity(this.knockbackVelocity.x, this.knockbackVelocity.y);
    } else {
      const direction = new Phaser.Math.Vector2(
        player.sprite.x - this.sprite.x,
        player.sprite.y - this.sprite.y
      );
      if (direction.lengthSq() > 0) {
        direction.normalize();
      }
      this.sprite.setVelocity(direction.x * this.speed, direction.y * this.speed);
    }
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
    this.scene.enemyAttacks.updateEnemy(this, player);
  }

  takeDamage(amount) {
    this.hp -= amount;
    const healthRatio = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    this.hpBarFill.scaleX = healthRatio;
    this.sprite.setAlpha(1);
    this.sprite.setTintFill(0xffffff);
    const activationId = this.activationId;
    this.scene.time.delayedCall(65, () => {
      if (this.sprite.active && this.activationId === activationId) {
        this.sprite.clearTint();
        this.sprite.setAlpha(1);
      }
    });
    return this.hp <= 0;
  }

  applyKnockback(angle, force, duration = 130) {
    this.knockbackVelocity.setToPolar(angle, force);
    this.knockbackUntil = Math.max(this.knockbackUntil, this.scene.time.now + duration);
  }

  destroy() {
    this.warning?.destroy();
    this.warning = null;
    this.scene.objectPools.release(this);
  }

  deactivate() {
    this.sprite.stop();
    this.sprite.clearTint();
    this.sprite.setAlpha(1).setVelocity(0, 0);
    this.sprite.disableBody(true, true);
    this.hpBarBack.setActive(false).setVisible(false);
    this.hpBarFill.setActive(false).setVisible(false);
  }

  dispose() {
    this.warning?.destroy();
    this.hpBarBack.destroy();
    this.hpBarFill.destroy();
    this.sprite.destroy();
  }
}
