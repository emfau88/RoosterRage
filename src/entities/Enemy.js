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
    this.abilityCharging = false;
    this.heavyCharging = false;
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
    this.scene.enemyAttacks.updateEnemy(this, player);
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
