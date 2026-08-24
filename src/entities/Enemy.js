import Phaser from 'phaser';

export class Enemy {
  constructor(scene) {
    this.scene = scene;
    this.activationId = 0;
    this.warning = null;
    this.auraVisual = null;
    this.championVisual = null;
    this.burnOverlay = null;
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
    this.baseSpeed = config.speed;
    this.damage = config.damage;
    this.xpValue = config.xp;
    this.microFodder = config.microFodder ?? false;
    this.directionalAnimationPrefix = config.directionalAnimationPrefix ?? null;
    this.animationSet = config.animationSet ? { ...config.animationSet } : null;
    this.animationState = 'move';
    this.resolveAnimationUntil = 0;
    this.recoveryAnimationUntil = 0;
    this.nextPassiveAnimationAt = scene.time.now + 850 + (this.id % 5) * 170;
    this.type = config.type ?? 'unknown';
    this.role = config.role ?? this.type;
    this.ability = config.ability ?? null;
    this.heavyProjectile = config.heavyProjectile ?? null;
    this.elite = config.elite ?? false;
    this.champion = config.champion ?? false;
    this.boss = config.boss ?? false;
    this.displayName = config.displayName ?? this.type;
    this.aura = config.aura ? { ...config.aura } : null;
    this.explodeOnDeath = config.explodeOnDeath ?? false;
    this.explosionRadius = config.explosionRadius ?? 0;
    this.explosionDamage = config.explosionDamage ?? 0;
    this.nextAbilityAt = 0;
    this.abilityCharging = false;
    this.heavyCharging = false;
    this.nextHeavyAttackAt = scene.time.now + (config.heavyAttackDelay ?? 1700);
    this.bossPhases = config.bossPhases ?? [];
    this.bossSequences = config.bossSequences ?? [];
    this.bossPhaseIndex = 0;
    this.bossSequenceStep = 0;
    this.bossSequenceReadyAt = scene.time.now + (config.entryProtectionMs ?? 0);
    this.bossSequenceToken = 0;
    this.warning?.destroy();
    this.warning = null;
    this.warningPulse = 0;
    this.knockbackUntil = 0;
    this.dashUntil = 0;
    this.dashVelocity = new Phaser.Math.Vector2();
    this.auraSpeedMultiplier = 1;
    this.damageReduction = 0;
    this.invulnerableUntil = config.entryProtectionMs
      ? scene.time.now + config.entryProtectionMs
      : 0;
    this.contactReadyAt = 0;
    this.clearBurn();
    this.knockbackVelocity.set(0, 0);
    this.hpBarWidth = config.hpBarWidth ?? 42;
    this.hpBarYOffset = config.hpBarYOffset ?? 30;
    this.showHpBar = config.showHpBar ?? true;
    this.baseTint = config.tint ?? null;
    this.statusBaseTint = this.elite && config.eliteTint !== false ? 0xfff2a6 : this.baseTint;
    this.baseRenderScale = config.scale ?? 0.24;
    this.hitReactionToken = 0;
    this.slowUntil = 0;

    this.sprite.enableBody(true, x, y, true, true);
    this.sprite.setTexture(config.texture ?? 'enemy-slime');
    this.sprite.setScale(this.baseRenderScale);
    this.sprite.setCircle(config.radius ?? 28, config.bodyOffsetX ?? 100, config.bodyOffsetY ?? 118);
    this.sprite.setDepth(4);
    this.sprite.clearTint();
    if (config.tint) {
      this.sprite.setTint(config.tint);
    }
    if (this.elite && config.eliteTint !== false) {
      this.sprite.setTint(0xfff2a6);
    }
    this.sprite.setAlpha(1);
    this.sprite.stop();
    if (this.directionalAnimationPrefix && config.animation) {
      this.sprite.play(config.animation);
    } else if (this.animationSet?.move) {
      this.sprite.play(this.animationSet.move);
    } else if (config.animation) {
      this.sprite.play(config.animation);
    }
    if (this.explodeOnDeath) {
      this.warning = scene.add.circle(x, y, this.explosionRadius || 42, 0xff7a33, 0.08)
        .setStrokeStyle(3, 0xffb347, 0.7)
        .setDepth(3);
    }
    this.auraVisual?.destroy();
    this.auraVisual = null;
    if (this.aura) {
      this.auraVisual = scene.add.circle(x, y, this.aura.radius, this.aura.color ?? 0x7cff67, 0.035)
        .setStrokeStyle(3, this.aura.color ?? 0x7cff67, 0.48)
        .setDepth(3);
    }
    this.championVisual?.destroy();
    this.championVisual = null;
    if (this.champion) {
      this.championVisual = scene.add.star(x, y - this.hpBarYOffset - 12, 4, 4, 9, 0xffd35c, 0.95)
        .setStrokeStyle(2, 0xfff4b0, 0.95)
        .setDepth(9);
    }

    this.hpBarBack.setPosition(x - this.hpBarWidth / 2, y - this.hpBarYOffset)
      .setSize(this.hpBarWidth, 4)
      .setDisplaySize(this.hpBarWidth, 4)
      .setAlpha(0.9)
      .setVisible(this.showHpBar)
      .setActive(this.showHpBar);
    this.hpBarFill.setPosition(x - this.hpBarWidth / 2, y - this.hpBarYOffset)
      .setSize(this.hpBarWidth, 4)
      .setDisplaySize(this.hpBarWidth, 4)
      .setScale(1, 1)
      .setAlpha(1)
      .setVisible(this.showHpBar)
      .setActive(this.showHpBar);
    return this;
  }

  update(player) {
    if (this.scene.time.now < this.dashUntil) {
      this.sprite.setVelocity(this.dashVelocity.x, this.dashVelocity.y);
    } else if (this.scene.time.now < this.knockbackUntil) {
      this.sprite.setVelocity(this.knockbackVelocity.x, this.knockbackVelocity.y);
    } else {
      const direction = new Phaser.Math.Vector2(
        player.sprite.x - this.sprite.x,
        player.sprite.y - this.sprite.y
      );
      if (direction.lengthSq() > 0) {
        direction.normalize();
      }
      this.updateDirectionalAnimation(direction);
      const movementSpeed = this.speed * this.auraSpeedMultiplier;
      this.sprite.setVelocity(direction.x * movementSpeed, direction.y * movementSpeed);
    }
    this.updateAbility(player);
    this.updateStateAnimation();
    this.updateBurn();
    this.updateWarningVisual();
    if (this.auraVisual) {
      this.auraVisual.setPosition(this.sprite.x, this.sprite.y);
      const resolving = this.animationState === 'resolve';
      this.auraVisual
        .setAlpha((resolving ? 0.27 : 0.16) + Math.sin(this.scene.time.now * 0.005) * 0.05)
        .setScale(resolving ? 1.08 : 1);
    }
    if (this.championVisual) {
      this.championVisual
        .setPosition(this.sprite.x, this.sprite.y - this.hpBarYOffset - 12)
        .setRotation(this.scene.time.now * 0.0017)
        .setScale(0.92 + Math.sin(this.scene.time.now * 0.007) * 0.1);
    }
    this.hpBarBack.setPosition(this.sprite.x - this.hpBarWidth / 2, this.sprite.y - this.hpBarYOffset);
    this.hpBarFill.setPosition(this.sprite.x - this.hpBarWidth / 2, this.sprite.y - this.hpBarYOffset);
    this.hpBarFill.scaleX = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
  }

  updateDirectionalAnimation(direction) {
    if (!this.directionalAnimationPrefix
      || (this.animationSet && this.animationState !== 'move')) {
      return;
    }
    const horizontal = Math.abs(direction.x) >= Math.abs(direction.y);
    const facing = horizontal
      ? (direction.x < 0 ? 'left' : 'right')
      : (direction.y < 0 ? 'up' : 'down');
    const key = `${this.directionalAnimationPrefix}-${facing}`;
    if (this.sprite.anims.currentAnim?.key !== key) {
      this.sprite.play(key);
    }
  }

  markAbilityResolved(resolveMs = 150, recoveryMs = 230) {
    const now = this.scene.time.now;
    this.resolveAnimationUntil = Math.max(this.resolveAnimationUntil, now + resolveMs);
    this.recoveryAnimationUntil = Math.max(this.recoveryAnimationUntil, now + resolveMs + recoveryMs);
  }

  updateStateAnimation() {
    if (!this.animationSet) return;
    const now = this.scene.time.now;
    if (this.aura && !this.ability && now >= this.nextPassiveAnimationAt) {
      this.markAbilityResolved(260, 260);
      this.nextPassiveAnimationAt = now + 2500 + (this.id % 4) * 180;
    }
    const nextState = this.abilityCharging || this.heavyCharging
      ? 'windup'
      : now < this.resolveAnimationUntil
        ? 'resolve'
        : now < this.recoveryAnimationUntil
          ? 'recovery'
          : 'move';
    const key = this.animationSet[nextState] ?? this.animationSet.move;
    if (nextState === 'move' && this.directionalAnimationPrefix) {
      this.animationState = 'move';
      return;
    }
    if (this.animationState !== nextState || this.sprite.anims.currentAnim?.key !== key) {
      this.animationState = nextState;
      this.sprite.play(key);
    }
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

  takeDamage(amount, feedback = {}) {
    this.hp -= amount;
    const healthRatio = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    this.hpBarFill.scaleX = healthRatio;
    this.sprite.setAlpha(1);
    this.sprite.setTintFill(feedback.flashColor ?? 0xffffff);
    this.hitReactionToken += 1;
    const reactionToken = this.hitReactionToken;
    const strong = feedback.strong ?? false;
    this.sprite.setScale(
      this.baseRenderScale * (strong ? 1.08 : 1.035),
      this.baseRenderScale * (strong ? 0.86 : 0.94)
    );
    const activationId = this.activationId;
    this.scene.time.delayedCall(strong ? 92 : 68, () => {
      if (
        this.sprite.active
        && this.activationId === activationId
        && this.hitReactionToken === reactionToken
      ) {
        this.sprite.setScale(this.baseRenderScale);
        this.restoreStatusTint();
        this.sprite.setAlpha(1);
      }
    });
    return this.hp <= 0;
  }

  applyKnockback(angle, force, duration = 130) {
    this.knockbackVelocity.setToPolar(angle, force);
    this.knockbackUntil = Math.max(this.knockbackUntil, this.scene.time.now + duration);
  }

  beginDash(angle, speed = 420, duration = 480) {
    this.dashVelocity.setToPolar(angle, speed);
    this.dashUntil = this.scene.time.now + duration;
  }

  mitigateDamage(amount) {
    return Math.max(1, Math.round(amount * (1 - Phaser.Math.Clamp(this.damageReduction, 0, 0.75))));
  }

  applySlow(ratio, duration) {
    const activationId = this.activationId;
    this.slowUntil = Math.max(this.slowUntil, this.scene.time.now + duration);
    this.speed = Math.min(this.speed, this.baseSpeed * ratio);
    this.sprite.setTint(0x8deaff);
    this.scene.time.delayedCall(duration, () => {
      if (
        this.sprite.active
        && this.activationId === activationId
        && this.scene.time.now >= this.slowUntil
      ) {
        this.speed = this.baseSpeed;
        this.restoreStatusTint();
      }
    });
  }

  restoreStatusTint() {
    this.sprite.clearTint();
    if (this.scene.time.now < this.slowUntil) {
      this.sprite.setTint(0x8deaff);
    } else if (this.statusBaseTint) {
      this.sprite.setTint(this.statusBaseTint);
    }
  }

  applyBurn(duration = 3000, damage = 3) {
    const now = this.scene.time.now;
    this.burnUntil = Math.max(this.burnUntil ?? 0, now + duration);
    this.burnDamage = Math.max(this.burnDamage ?? 0, damage);
    this.nextBurnTickAt = Math.max(this.nextBurnTickAt ?? 0, now + 650);
    if (!this.burnOverlay?.active) {
      this.burnOverlay = this.scene.add.sprite(
        this.sprite.x,
        this.sprite.y,
        'enemy-burn-overlay-sheet',
        0
      )
        .setAlpha(0.78)
        .setDepth(6)
        .play('enemy-burn-overlay-loop');
    }
    this.updateBurnOverlay();
  }

  updateBurn() {
    if (!this.burnUntil) return;
    const now = this.scene.time.now;
    if (now >= this.burnUntil) {
      this.clearBurn();
      return;
    }
    this.updateBurnOverlay();
    if (now < this.nextBurnTickAt) return;
    this.nextBurnTickAt = now + 600;
    const killed = this.scene.damageEnemy(
      this,
      this.burnDamage,
      this.sprite.x,
      this.sprite.y,
      { source: 'molotov-burn', quiet: true }
    );
    if (killed) this.clearBurn();
  }

  updateBurnOverlay() {
    if (!this.burnOverlay?.active) return;
    const size = Math.max(54, Math.min(150, this.sprite.displayWidth * 1.22));
    this.burnOverlay
      .setPosition(this.sprite.x, this.sprite.y + 2)
      .setDisplaySize(size, size)
      .setAlpha(0.72 + Math.sin(this.scene.time.now * 0.012) * 0.08);
  }

  clearBurn() {
    this.burnUntil = 0;
    this.burnDamage = 0;
    this.nextBurnTickAt = 0;
    this.burnOverlay?.destroy();
    this.burnOverlay = null;
  }

  destroy() {
    this.warning?.destroy();
    this.warning = null;
    this.auraVisual?.destroy();
    this.auraVisual = null;
    this.championVisual?.destroy();
    this.championVisual = null;
    this.scene.objectPools.release(this);
  }

  deactivate() {
    this.clearBurn();
    this.slowUntil = 0;
    this.hitReactionToken += 1;
    this.sprite.stop();
    this.sprite.clearTint();
    this.sprite.setAlpha(1).setScale(this.baseRenderScale).setVelocity(0, 0);
    this.sprite.disableBody(true, true);
    this.hpBarBack.setActive(false).setVisible(false);
    this.hpBarFill.setActive(false).setVisible(false);
    this.auraVisual?.setActive(false).setVisible(false);
    this.championVisual?.setActive(false).setVisible(false);
  }

  dispose() {
    this.clearBurn();
    this.warning?.destroy();
    this.auraVisual?.destroy();
    this.championVisual?.destroy();
    this.hpBarBack.destroy();
    this.hpBarFill.destroy();
    this.sprite.destroy();
  }
}
