import Phaser from 'phaser';
import { EnemyAuraVisual, getEnemyAuraGround, getEnemyAuraStyle } from '../systems/EnemyAuraVisual.js';

const CLASSIC_FEEDBACK = import.meta.env?.DEV
  && new URLSearchParams(globalThis.location?.search ?? '').get('feedbackCompare') === 'before';

export class Enemy {
  constructor(scene) {
    this.scene = scene;
    this.activationId = 0;
    this.warning = null;
    this.auraVisual = null;
    this.championVisual = null;
    this.burnOverlay = null;
    this.burnFlames = [];
    this.burnSources = new Map();
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
    if (this.animationPausedByGame) this.sprite.anims.resume();
    this.animationPausedByGame = false;
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
    this.directionalStateAnimations = config.directionalStateAnimations ?? false;
    this.facing = 'left';
    this.attackMovement = config.attackMovement ?? null;
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
    this.hpBarVisibleUntil = 0;
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
    this.sprite.setFlipX(false);
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
    if (config.animationPhaseFrames > 1 && this.sprite.anims.isPlaying) {
      const phaseFrame = this.id % config.animationPhaseFrames;
      this.sprite.anims.setProgress(phaseFrame / (config.animationPhaseFrames - 1));
    }
    if (this.explodeOnDeath) {
      const ground = getEnemyAuraGround(this);
      this.warning = new EnemyAuraVisual(scene, ground.x, ground.y, 'danger', this.explosionRadius || 42, { follow: this });
    }
    this.auraVisual?.destroy();
    this.auraVisual = null;
    const auraStyle = getEnemyAuraStyle(this);
    if (auraStyle) {
      const ground = getEnemyAuraGround(this);
      this.auraVisual = new EnemyAuraVisual(scene, ground.x, ground.y, auraStyle.style, auraStyle.radius, { follow: this });
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
    this.updateHpBarVisibility();
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
      const movementState = this.getAnimationState();
      const movementSpeed = this.speed * this.auraSpeedMultiplier * (this.attackMovement?.[movementState] ?? 1);
      this.sprite.setVelocity(direction.x * movementSpeed, direction.y * movementSpeed);
    }
    this.updateAbility(player);
    this.updateStateAnimation();
    this.updateBurn();
    this.updateWarningVisual();
    if (this.championVisual) {
      this.championVisual
        .setPosition(this.sprite.x, this.sprite.y - this.hpBarYOffset - 12)
        .setRotation(this.scene.time.now * 0.0017)
        .setScale(0.92 + Math.sin(this.scene.time.now * 0.007) * 0.1);
    }
    this.hpBarBack.setPosition(this.sprite.x - this.hpBarWidth / 2, this.sprite.y - this.hpBarYOffset);
    this.hpBarFill.setPosition(this.sprite.x - this.hpBarWidth / 2, this.sprite.y - this.hpBarYOffset);
    this.hpBarFill.scaleX = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    this.updateHpBarVisibility();
  }

  updateHpBarVisibility() {
    // Full ordinary bars compete with warnings in crowded late waves. Damage
    // briefly reveals them; priority enemies retain their permanent identity.
    const visible = this.showHpBar && (this.elite || this.boss || this.champion
      || this.scene.effects.enabled('enemyHealthBarsAlways')
      || this.scene.time.now < this.hpBarVisibleUntil);
    this.hpBarBack.setVisible(visible);
    this.hpBarFill.setVisible(visible);
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
    this.facing = facing;
    if (this.directionalStateAnimations) this.sprite.setFlipX(facing === 'right');
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
    const nextState = this.getAnimationState();
    const baseKey = this.animationSet[nextState] ?? this.animationSet.move;
    const key = this.directionalStateAnimations && nextState !== 'move'
      ? `${baseKey}-${this.facing}` : baseKey;
    if (nextState === 'move' && this.directionalAnimationPrefix) {
      const wasAction = this.animationState !== 'move';
      this.animationState = 'move';
      if (wasAction) this.sprite.play(`${this.directionalAnimationPrefix}-${this.facing}`);
      return;
    }
    if (this.animationState !== nextState || this.sprite.anims.currentAnim?.key !== key) {
      this.animationState = nextState;
      this.sprite.play(key);
    }
  }

  getAnimationState() {
    const now = this.scene.time.now;
    return this.abilityCharging || this.heavyCharging
      ? 'windup'
      : now < this.resolveAnimationUntil
        ? 'resolve'
        : now < this.recoveryAnimationUntil
          ? 'recovery'
          : 'move';
  }

  updateWarningVisual() {
    if (!this.warning) {
      return;
    }
    this.sprite.setAlpha(1);
  }

  updateAbility(player) {
    this.scene.enemyAttacks.updateEnemy(this, player);
  }

  takeDamage(amount, feedback = {}) {
    this.hp -= amount;
    this.hpBarVisibleUntil = this.scene.time.now + 1600;
    this.updateHpBarVisibility();
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
    this.scene.audio.play('enemy-dash');
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

  applyBurn(duration = 3000, damage = 3, source = 'molotov-burn') {
    const now = this.scene.time.now;
    const current = this.burnSources.get(source);
    this.burnSources.set(source, {
      until: Math.max(current?.until ?? 0, now + duration),
      damage: Math.max(current?.damage ?? 0, damage)
    });
    this.refreshBurnStrength(now);
    if (!this.nextBurnTickAt) this.nextBurnTickAt = now + 650;
    // Preserve the existing Molotov contact behavior: its repeated zone ticks
    // defer afterburn while the victim remains in the fire field. Fire Egg
    // contacts extend duration without postponing an already planned tick.
    else if (source === 'molotov-burn') this.nextBurnTickAt = Math.max(this.nextBurnTickAt, now + 650);
    if (!this.burnOverlay?.active) {
      if (CLASSIC_FEEDBACK) {
        this.burnOverlay = this.scene.add.ellipse(this.sprite.x, this.sprite.y + 2,
          32, 12, 0xff6b28, 0.12)
          .setStrokeStyle(1, 0xffc45a, 0.38).setDepth(5.8);
        this.burnOverlayKind = 'ground-glow';
      } else {
        const count = this.boss || this.elite ? 3 : 2;
        this.burnFlames = Array.from({ length: count }, (_, index) => {
          const flame = this.scene.add.sprite(this.sprite.x, this.sprite.y,
            'molotov-ground-flame-orange').setDepth(this.sprite.depth + 1.35);
          flame.play('molotov-ground-flame-orange-loop');
          flame.anims.setProgress((index * 0.37) % 1);
          return flame;
        });
        this.burnOverlay = this.burnFlames[0];
        this.burnOverlayKind = 'body-flames';
      }
    }
    this.updateBurnOverlay();
  }

  updateBurn() {
    if (!this.burnUntil) return;
    const now = this.scene.time.now;
    this.refreshBurnStrength(now);
    if (!this.burnUntil) {
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
      { source: this.burnSource, quiet: true }
    );
    if (killed) this.clearBurn();
  }

  refreshBurnStrength(now) {
    let strongest = null;
    let until = 0;
    for (const [source, entry] of this.burnSources) {
      if (entry.until <= now) {
        this.burnSources.delete(source);
        continue;
      }
      until = Math.max(until, entry.until);
      if (!strongest || entry.damage > strongest.damage) strongest = { source, damage: entry.damage };
    }
    this.burnUntil = until;
    this.burnDamage = strongest?.damage ?? 0;
    this.burnSource = strongest?.source ?? null;
  }

  updateBurnOverlay() {
    if (!this.burnOverlay?.active) return;
    if (CLASSIC_FEEDBACK) {
      const size = Math.max(28, Math.min(82, this.sprite.displayWidth * 0.72));
      this.burnOverlay
        .setPosition(this.sprite.x, this.sprite.y + this.sprite.displayHeight * 0.18)
        .setDisplaySize(size, size * 0.34)
        .setAlpha(0.1 + Math.sin(this.scene.time.now * 0.006) * 0.025);
      return;
    }
    const width = this.sprite.displayWidth;
    const height = this.sprite.displayHeight;
    const size = Math.max(15, Math.min(32, height * (this.boss ? 0.31 : 0.29)));
    const positions = [
      [-0.25, 0.24],
      [0.23, 0.25],
      [0.02, 0.34]
    ];
    this.burnFlames.forEach((flame, index) => {
      const [offsetX, offsetY] = positions[index];
      flame
        .setPosition(this.sprite.x + width * offsetX, this.sprite.y + height * offsetY)
        .setDisplaySize(size * (index === 2 ? 0.77 : 0.9), size)
        .setAlpha(0.72 + Math.sin(this.scene.time.now * 0.011 + index * 2.1) * 0.08);
    });
  }

  clearBurn() {
    this.burnUntil = 0;
    this.burnDamage = 0;
    this.nextBurnTickAt = 0;
    this.burnSource = null;
    this.burnSources?.clear();
    if (this.burnOverlay && !this.burnFlames?.includes(this.burnOverlay)) this.burnOverlay.destroy();
    this.burnFlames?.forEach((flame) => flame.destroy());
    this.burnFlames = [];
    this.burnOverlay = null;
    this.burnOverlayKind = null;
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
    this.warning?.destroy(); this.warning = null;
    this.auraVisual?.destroy(); this.auraVisual = null;
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
