import Phaser from 'phaser';
import { Projectile } from '../entities/Projectile.js';
import { getFireEggVisual } from '../data/fireEggVisuals.js';
import { playEvolutionImpact } from './EvolutionVisuals.js';

const TARGET_ACQUISITION_MARGIN = 0.5;

function getBossDamageMultiplier(enemy, source) {
  if (!enemy.boss) {
    return 1;
  }
  if (source.startsWith('void-nest') || source.startsWith('evo-singularity-nest')) {
    return 0.45;
  }
  if (source.startsWith('support-chick') || source.startsWith('evo-chick-squadron')) {
    return 0.55;
  }
  return 1;
}

export class CombatSystem {
  constructor(scene) {
    this.scene = scene;
    this.primaryAttackSequence = 0;
    this.modifierVisuals = new Set();
    this.recentModifierImpacts = [];
  }

  autoShoot(time) {
    const { scene } = this;
    if (time - scene.lastShotAt < scene.player.fireRate || scene.enemies.length === 0) {
      return;
    }

    const target = this.findNearestEnemy();
    if (!target) {
      return;
    }

    const baseAngle = Phaser.Math.Angle.Between(
      scene.player.sprite.x,
      scene.player.sprite.y,
      target.sprite.x,
      target.sprite.y
    );
    scene.player.aimAt(baseAngle);
    const primary = scene.player.primaryAttack ?? {};
    const evolution = scene.player.primaryEvolution;
    const fireEggVisual = !evolution && scene.player.fireEggs
      ? getFireEggVisual(scene.player.getUpgradeRank('fire-eggs'))
      : null;
    const source = evolution?.id ?? (scene.player.fireEggs ? 'fire-eggs' : 'base-egg');
    this.primaryAttackSequence += 1;
    const pattern = this.getShotPattern();
    const targets = this.getShotTargets(pattern.length, target);
    pattern.forEach((shot, index) => {
      const shotTarget = targets[index] ?? target;
      const angle = Phaser.Math.Angle.Between(
        scene.player.sprite.x,
        scene.player.sprite.y,
        shotTarget.sprite.x,
        shotTarget.sprite.y
      );
      const forceCritical = Boolean(
        primary.deadeyeCadence
        && this.primaryAttackSequence % primary.deadeyeCadence === 0
      );
      const isAce = scene.player.roosterId === 'ace';
      const visualScale = evolution?.projectileScale
        ?? (primary.scale ?? 1)
          * (evolution?.scaleMultiplier ?? 1)
          * (fireEggVisual?.scaleMultiplier ?? 1);
      const lineTrailLength = evolution?.lineTrailLength ?? primary.lineTrailLength ?? 0;
      this.spawnProjectile(angle, shotTarget, shot.laneOffset, {
        damage: Math.round(scene.player.projectileDamage * (evolution?.damageMultiplier ?? 1)),
        source,
        homing: true,
        maxTurnRate: primary.homingTurnRate ?? shot.maxTurnRate ?? 0.08,
        targetOffset: 0,
        laneOffset: shot.laneOffset,
        texture: evolution?.texture ?? fireEggVisual?.texture ?? primary.texture,
        speed: (primary.speed ?? 520) + scene.player.projectileSpeedBonus + (evolution?.speedBonus ?? 0),
        scale: visualScale * (isAce && forceCritical ? 1.1 : 1),
        tint: isAce && forceCritical
          ? 0xffffff
          : evolution?.tint ?? (fireEggVisual ? null : primary.tint),
        hitRadius: (primary.hitRadius ?? 24) + (evolution?.hitRadiusBonus ?? 0),
        bodyRadius: primary.bodyRadius,
        trailRadius: evolution?.trailRadius ?? primary.trailRadius,
        trailColor: evolution?.trailColor ?? (scene.player.fireEggs ? 0xff6a28 : primary.trailColor),
        trailAlpha: evolution?.trailAlpha ?? primary.trailAlpha,
        trailPulse: evolution?.trailPulse ?? primary.trailPulse,
        trailPulseMs: evolution?.trailPulseMs ?? primary.trailPulseMs,
        trailVisible: evolution?.trailVisible ?? primary.trailVisible,
        lineTrailLength: lineTrailLength + (isAce && forceCritical && lineTrailLength > 0 ? 6 : 0),
        lineTrailWidth: (evolution?.lineTrailWidth ?? primary.lineTrailWidth ?? 1)
          + (isAce && forceCritical && lineTrailLength > 0 ? 0.5 : 0),
        lineTrailColor: fireEggVisual
          ? fireEggVisual.lineTrailColor
          : forceCritical ? 0xfff2a0 : evolution?.lineTrailColor ?? primary.lineTrailColor,
        lineTrailAlpha: Math.min(
          0.2,
          (evolution?.lineTrailAlpha ?? primary.lineTrailAlpha ?? 0)
            + (isAce && forceCritical && lineTrailLength > 0 ? 0.08 : 0)
        ),
        visualRank: evolution?.visualRank ?? primary.visualRank ?? primary.rank,
        fireVisualRank: fireEggVisual?.fireVisualRank ?? 0,
        spritePulseX: evolution?.spritePulseX
          ?? fireEggVisual?.spritePulseX ?? primary.spritePulseX ?? 0,
        spritePulseY: evolution?.spritePulseY
          ?? fireEggVisual?.spritePulseY ?? primary.spritePulseY ?? 0,
        spritePulseMs: evolution?.spritePulseMs
          ?? fireEggVisual?.spritePulseMs ?? primary.spritePulseMs ?? 260,
        spriteFlickerAlpha: evolution?.spriteFlickerAlpha
          ?? fireEggVisual?.spriteFlickerAlpha ?? primary.spriteFlickerAlpha ?? 0,
        criticalVisual: isAce && forceCritical,
        pierce: evolution ? Math.max(scene.player.projectilePierce, evolution.pierce ?? 0) : undefined,
        ricochet: evolution ? Math.max(scene.player.projectileRicochets, evolution.ricochet ?? 0) : undefined,
        splashRadius: (primary.splashRadius ?? 0) * (evolution?.splashRadiusMultiplier ?? 1),
        splashDamageRatio: evolution?.splashDamageRatio ?? primary.splashDamageRatio,
        secondaryBlastRatio: evolution?.secondaryBlastRatio ?? primary.secondaryBlastRatio ?? 0,
        shrapnelCount: primary.shrapnelCount ?? 0,
        shrapnelDamageRatio: primary.shrapnelDamageRatio ?? 0,
        criticalPierceBonus: primary.criticalPierceBonus ?? 0,
        criticalRicochetBonus: primary.criticalRicochetBonus ?? 0,
        forceCritical,
        chainCount: (primary.chainCount ?? 0) + (evolution?.chainCountBonus ?? 0),
        chainRadius: (primary.chainRadius ?? 0) + (evolution?.chainRadiusBonus ?? 0),
        chainDamageRatio: evolution?.chainDamageRatio ?? primary.chainDamageRatio,
        chainOuterWidth: evolution?.chainOuterWidth ?? primary.chainOuterWidth,
        chainInnerWidth: evolution?.chainInnerWidth ?? primary.chainInnerWidth,
        chainOuterColor: evolution?.chainOuterColor ?? primary.chainOuterColor,
        chainInnerColor: evolution?.chainInnerColor ?? primary.chainInnerColor,
        chainLife: evolution?.chainLife ?? primary.chainLife,
        impactStyle: evolution?.impactStyle ?? primary.impactStyle
      });
      if (evolution?.muzzleFlash ?? primary.muzzleFlash ?? true) {
        scene.showShotFeedback(angle, shot.laneOffset);
      }
    });
    scene.lastShotAt = time;
    scene.audio.play(`egg-launch-${scene.player.roosterId}`);
    scene.debugStats.shots += pattern.length;
    scene.debugStats.lastShotAt = time;
    scene.telemetry.addShot(pattern.length, time, scene.waveSystem.currentWave, source);
  }

  getShotPattern() {
    const primary = this.scene.player.primaryAttack ?? {};
    const cadenceShots = primary.twinCadence
      && this.primaryAttackSequence % primary.twinCadence === 0
      ? 2
      : 1;
    const minimumShots = Math.max(
      this.scene.player.primaryEvolution?.minimumShots ?? 1,
      primary.minimumShots ?? 1,
      cadenceShots
    );
    const shotCount = Math.max(this.scene.player.shotCount, minimumShots);
    if (shotCount >= 3) {
      return [
        { laneOffset: -24, maxTurnRate: 0.095 },
        { laneOffset: 0, maxTurnRate: 0.09 },
        { laneOffset: 24, maxTurnRate: 0.095 }
      ];
    }
    if (shotCount === 2) {
      return [
        { laneOffset: -18, maxTurnRate: 0.095 },
        { laneOffset: 18, maxTurnRate: 0.095 }
      ];
    }
    return [{ angleOffset: 0, laneOffset: 0 }];
  }

  getShotTargets(count, fallbackTarget) {
    const { scene } = this;
    const sorted = this.getTargetableEnemies()
      .sort((a, b) => Phaser.Math.Distance.Squared(scene.player.sprite.x, scene.player.sprite.y, a.sprite.x, a.sprite.y)
        - Phaser.Math.Distance.Squared(scene.player.sprite.x, scene.player.sprite.y, b.sprite.x, b.sprite.y));
    if (!sorted.length) {
      return Array(count).fill(fallbackTarget);
    }
    const targets = [];
    for (let index = 0; index < count; index += 1) {
      targets.push(sorted[index] ?? fallbackTarget);
    }
    return targets;
  }

  findNearestEnemy() {
    return this.findNearestEnemyFrom(this.scene.player.sprite.x, this.scene.player.sprite.y);
  }

  findNearestEnemyFrom(x, y) {
    let nearest = null;
    let nearestDistance = Infinity;
    this.getTargetableEnemies().forEach((enemy) => {
      const distance = Phaser.Math.Distance.Squared(x, y, enemy.sprite.x, enemy.sprite.y);
      if (distance < nearestDistance) {
        nearest = enemy;
        nearestDistance = distance;
      }
    });
    return nearest;
  }

  getTargetAcquisitionBounds() {
    const view = this.scene.cameras.main.worldView;
    const marginX = view.width * TARGET_ACQUISITION_MARGIN;
    const marginY = view.height * TARGET_ACQUISITION_MARGIN;
    return {
      x: view.x - marginX,
      y: view.y - marginY,
      width: view.width + marginX * 2,
      height: view.height + marginY * 2,
      visibleX: view.x,
      visibleY: view.y,
      visibleWidth: view.width,
      visibleHeight: view.height,
      marginScreens: TARGET_ACQUISITION_MARGIN
    };
  }

  isEnemyTargetable(enemy, bounds = this.getTargetAcquisitionBounds()) {
    if (!enemy?.sprite?.active) return false;
    return enemy.sprite.x >= bounds.x
      && enemy.sprite.x <= bounds.x + bounds.width
      && enemy.sprite.y >= bounds.y
      && enemy.sprite.y <= bounds.y + bounds.height;
  }

  getTargetableEnemies() {
    const bounds = this.getTargetAcquisitionBounds();
    return this.scene.enemies.filter((enemy) => this.isEnemyTargetable(enemy, bounds));
  }

  spawnProjectile(angle, target, laneOffset = 0, options = {}) {
    const { scene } = this;
    const muzzle = scene.player.getMuzzlePosition(42);
    const sideX = -Math.sin(scene.player.aimAngle) * laneOffset;
    const sideY = Math.cos(scene.player.aimAngle) * laneOffset;
    const projectile = scene.objectPools.acquire(
      'projectile',
      () => new Projectile(scene),
      (item) => item.reset(
        muzzle.x + sideX,
        muzzle.y + sideY,
        angle,
        options.damage ?? scene.player.projectileDamage,
        scene.player.fireEggs,
        target,
        options.targetOffset ?? laneOffset,
        {
        ...options,
        speed: options.speed ?? 520 + scene.player.projectileSpeedBonus,
        ricochet: options.ricochet ?? scene.player.projectileRicochets,
        pierceVisualRank: options.pierceVisualRank
          ?? scene.player.getUpgradeRank('piercing-eggs'),
        ricochetVisualRank: options.ricochetVisualRank
          ?? scene.player.getUpgradeRank('ricochet-eggs'),
        canCrit: options.canCrit ?? true,
        knockbackRank: options.knockbackRank ?? scene.player.projectileKnockback
        }
      )
    );
    if (!projectile) {
      return null;
    }
    scene.projectiles.push(projectile);
    scene.projectileGroup.add(projectile.sprite);
    projectile.setVelocity(angle);
    return projectile;
  }

  spawnSpecialProjectile(angle, target, options = {}) {
    const muzzle = this.scene.player.getMuzzlePosition(options.muzzleDistance ?? 48);
    return this.spawnSpecialProjectileFrom(muzzle.x, muzzle.y, angle, target, options);
  }

  spawnSpecialProjectileFrom(x, y, angle, target, options = {}) {
    const { scene } = this;
    const projectile = scene.objectPools.acquire(
      'projectile',
      () => new Projectile(scene),
      (item) => item.reset(
        x,
        y,
        angle,
        options.damage ?? scene.player.projectileDamage,
        options.isFireEgg ?? false,
        target,
        0,
        options
      )
    );
    if (!projectile) {
      return null;
    }
    scene.projectiles.push(projectile);
    scene.projectileGroup.add(projectile.sprite);
    projectile.setVelocity(angle);
    scene.showShotFeedback(angle, 0);
    scene.audio.play(options.sfx ?? 'egg-launch-ace', {
      volume: options.sfxVolume,
      cooldown: options.sfxCooldown
    });
    scene.debugStats.specialShots += 1;
    scene.telemetry.addShot(1, scene.time.now, scene.waveSystem.currentWave, options.source ?? 'special-projectile');
    return projectile;
  }

  checkProjectileHits() {
    this.scene.projectiles.forEach((projectile) => {
      if (!projectile.sprite.active) {
        return;
      }
      const enemy = this.scene.enemies.find((candidate) => (
        candidate.sprite.active
        && !projectile.hitEnemies.has(candidate.id)
        && Phaser.Math.Distance.Between(
          projectile.sprite.x,
          projectile.sprite.y,
          candidate.sprite.x,
          candidate.sprite.y
        ) <= projectile.hitRadius
      ));
      if (enemy) {
        this.hitEnemy(projectile, enemy);
      }
    });
  }

  hitEnemy(projectile, enemy) {
    if (
      !projectile.sprite.active
      || !enemy.sprite.active
      || projectile.hitEnemies.has(enemy.id)
    ) {
      return;
    }
    const hitX = enemy.sprite.x;
    const hitY = enemy.sprite.y;
    projectile.hitEnemies.add(enemy.id);
    const critical = projectile.forceCritical
      || (projectile.canCrit && this.scene.rng.chance(this.scene.player.critChance, 'combat-crit'));
    const damage = critical
      ? Math.round(projectile.damage * this.scene.player.critMultiplier)
      : projectile.damage;
    if (critical && !projectile.criticalBonusApplied) {
      projectile.pierceRemaining += projectile.criticalPierceBonus;
      projectile.ricochetRemaining += projectile.criticalRicochetBonus;
      projectile.criticalBonusApplied = true;
    }
    this.damageEnemy(enemy, damage, hitX, hitY, { critical, source: projectile.source });
    this.applyPrimaryImpact(projectile, enemy, damage, hitX, hitY);
    if (projectile.knockbackRank > 0 && enemy.sprite.active) {
      enemy.applyKnockback(projectile.currentAngle, 80 + projectile.knockbackRank * 30);
      this.showModifierImpact(
        'shell-shock',
        hitX,
        hitY,
        projectile.currentAngle,
        projectile.knockbackRank
      );
    }
    if (projectile.slowMs > 0 && enemy.sprite.active) {
      enemy.applySlow(projectile.slowRatio, projectile.slowMs);
    }
    if (projectile.pierceRemaining > 0) {
      this.showModifierImpact(
        'pierce',
        hitX,
        hitY,
        projectile.currentAngle,
        Math.max(1, projectile.pierceVisualRank)
      );
      projectile.pierceRemaining -= 1;
    } else if (projectile.ricochetRemaining > 0 && this.redirectRicochet(projectile, enemy)) {
      projectile.ricochetRemaining -= 1;
    } else {
      projectile.destroy();
    }
  }

  applyPrimaryImpact(projectile, hitEnemy, damage, x, y) {
    this.showGoldenEggImpact(projectile, x, y);
    if (projectile.splashRadius > 0 && projectile.splashDamageRatio > 0) {
      const splashDamage = Math.max(1, Math.round(damage * projectile.splashDamageRatio));
      if (projectile.impactStyle?.startsWith('blast-shell')) {
        this.showBlastShellImpact(projectile, x, y, projectile.splashRadius);
      } else {
        const ring = this.scene.add.circle(x, y, projectile.splashRadius, 0xff6a28, 0.12)
          .setStrokeStyle(3, 0xffd35c, 0.78)
          .setDepth(8);
        this.scene.tweens.add({
          targets: ring,
          alpha: 0,
          scale: 1.3,
          duration: 190,
          onComplete: () => ring.destroy()
        });
      }
      [...this.scene.enemies].forEach((candidate) => {
        if (
          candidate !== hitEnemy
          && candidate.sprite.active
          && Phaser.Math.Distance.Between(x, y, candidate.sprite.x, candidate.sprite.y) <= projectile.splashRadius
        ) {
          this.damageEnemy(candidate, splashDamage, candidate.sprite.x, candidate.sprite.y, {
            source: `${projectile.source}:splash`
          });
        }
      });
    }

    if (projectile.secondaryBlastRatio > 0) {
      const radius = Math.max(80, projectile.splashRadius * 1.28);
      const secondaryDamage = Math.max(1, Math.round(damage * projectile.secondaryBlastRatio));
      if (projectile.impactStyle?.startsWith('blast-shell')) {
        this.showBlastShellImpact(projectile, x, y, radius, { secondary: true });
      } else {
        const wave = this.scene.add.circle(x, y, radius * 0.48, 0xffd35c, 0.08)
          .setStrokeStyle(4, 0xfff3b0, 0.82)
          .setDepth(9);
        this.scene.tweens.add({
          targets: wave,
          alpha: 0,
          scale: 2.05,
          duration: 260,
          onComplete: () => wave.destroy()
        });
      }
      [...this.scene.enemies].forEach((candidate) => {
        if (
          candidate.sprite.active
          && Phaser.Math.Distance.Between(x, y, candidate.sprite.x, candidate.sprite.y) <= radius
        ) {
          this.damageEnemy(candidate, secondaryDamage, candidate.sprite.x, candidate.sprite.y, {
            source: `${projectile.source}:shockwave`
          });
        }
      });
    }

    if (projectile.shrapnelCount > 0 && projectile.shrapnelDamageRatio > 0) {
      const shrapnelDamage = Math.max(1, Math.round(damage * projectile.shrapnelDamageRatio));
      const radius = Math.max(58, projectile.splashRadius * 0.85);
      for (let index = 0; index < projectile.shrapnelCount; index += 1) {
        const angle = (Math.PI * 2 * index) / projectile.shrapnelCount;
        const burstX = x + Math.cos(angle) * radius * 0.48;
        const burstY = y + Math.sin(angle) * radius * 0.48;
        if (projectile.impactStyle?.startsWith('blast-shell')) {
          const fragment = this.scene.add.graphics({ x, y }).setDepth(11);
          fragment.lineStyle(4, 0xffcf6a, 0.72);
          fragment.lineBetween(0, 0, burstX - x, burstY - y);
          fragment.lineStyle(1.5, 0xffffdf, 0.95);
          fragment.lineBetween(0, 0, burstX - x, burstY - y);
          this.scene.tweens.add({
            targets: fragment,
            alpha: 0,
            scaleX: 1.12,
            scaleY: 1.12,
            duration: 145,
            ease: 'Quad.Out',
            onComplete: () => fragment.destroy()
          });
          this.scene.playFx('fx-rocket-explosion', burstX, burstY, {
            scale: 0.19,
            alpha: 0.72,
            depth: 10
          });
        } else {
          const burst = this.scene.add.circle(burstX, burstY, 12, 0xffd35c, 0.34)
            .setStrokeStyle(2, 0xfff3b0, 0.86)
            .setDepth(9);
          this.scene.tweens.add({
            targets: burst,
            alpha: 0,
            scale: 1.8,
            duration: 180,
            onComplete: () => burst.destroy()
          });
        }
        const candidate = this.scene.enemies
          .filter((enemy) => enemy.sprite.active && enemy !== hitEnemy)
          .sort((a, b) => Phaser.Math.Distance.Squared(burstX, burstY, a.sprite.x, a.sprite.y)
            - Phaser.Math.Distance.Squared(burstX, burstY, b.sprite.x, b.sprite.y))[0];
        if (
          candidate
          && Phaser.Math.Distance.Between(
            burstX,
            burstY,
            candidate.sprite.x,
            candidate.sprite.y
          ) <= radius
        ) {
          this.damageEnemy(candidate, shrapnelDamage, candidate.sprite.x, candidate.sprite.y, {
            source: `${projectile.source}:shrapnel`
          });
        }
      }
    }

    if (projectile.chainRemaining <= 0 || projectile.chainDamageRatio <= 0) {
      return;
    }
    let originX = x;
    let originY = y;
    let remaining = projectile.chainRemaining;
    let chainDamage = Math.max(1, Math.round(damage * projectile.chainDamageRatio));
    while (remaining > 0) {
      const nextTarget = this.scene.enemies
        .filter((candidate) => (
          candidate !== hitEnemy
          && candidate.sprite.active
          && !projectile.hitEnemies.has(candidate.id)
          && Phaser.Math.Distance.Between(
            originX,
            originY,
            candidate.sprite.x,
            candidate.sprite.y
          ) <= projectile.chainRadius
        ))
        .sort((a, b) => Phaser.Math.Distance.Squared(originX, originY, a.sprite.x, a.sprite.y)
          - Phaser.Math.Distance.Squared(originX, originY, b.sprite.x, b.sprite.y))[0];
      if (!nextTarget) {
        break;
      }
      const targetX = nextTarget.sprite.x;
      const targetY = nextTarget.sprite.y;
      projectile.hitEnemies.add(nextTarget.id);
      const solarChain = projectile.source === 'golden-egg';
      const bolt = this.scene.add.graphics().setDepth(12);
      bolt.lineStyle(
        solarChain ? 6 : projectile.chainOuterWidth,
        solarChain ? 0xfff3b0 : projectile.chainOuterColor,
        0.78
      );
      bolt.lineBetween(originX, originY, targetX, targetY);
      bolt.lineStyle(
        solarChain ? 3 : projectile.chainInnerWidth,
        solarChain ? 0xffa62b : projectile.chainInnerColor,
        1
      );
      bolt.lineBetween(originX, originY, targetX, targetY);
      this.scene.tweens.add({
        targets: bolt,
        alpha: 0,
        duration: solarChain ? 150 : projectile.chainLife,
        onComplete: () => bolt.destroy()
      });
      this.scene.audio.play('lightning-chain', { cooldown: 90 });
      this.damageEnemy(nextTarget, chainDamage, targetX, targetY, {
        source: `${projectile.source}:chain`
      });
      if (solarChain) {
        this.showGoldenEggImpact(projectile, targetX, targetY, 0.72);
      } else {
        const rank = projectile.visualRank === 'EVO'
          ? 5
          : Math.max(1, Math.min(4, Number(projectile.visualRank) || 1));
        this.scene.playFx('fx-lightning-impact', targetX, targetY + 6, {
          scale: 0.13 + rank * 0.025,
          alpha: 0.48 + rank * 0.06,
          depth: 11
        });
      }
      originX = targetX;
      originY = targetY;
      chainDamage = Math.max(1, Math.round(chainDamage * 0.9));
      remaining -= 1;
    }
    projectile.chainRemaining = remaining;
  }

  showBlastShellImpact(projectile, x, y, radius, { secondary = false } = {}) {
    const evolution = projectile.impactStyle === 'blast-shell-evo';
    const rank = evolution ? 5 : Math.max(1, Math.min(4, Number(projectile.visualRank) || 1));
    const color = evolution ? 0xfff0a3 : rank >= 4 ? 0xffd35c : 0xffa044;
    const coreColor = evolution || rank >= 3 ? 0xffffdf : 0xffe2b8;

    if (!secondary && !evolution) {
      this.scene.playFx('fx-rocket-explosion', x, y, {
        scale: 0.24 + rank * 0.075,
        alpha: 0.68 + rank * 0.055,
        depth: 10
      });
    }

    const rayCount = secondary ? 8 : 5 + rank;
    const rays = this.scene.add.graphics({ x, y }).setDepth(11);
    const innerRadius = secondary ? radius * 0.26 : 8 + rank * 2;
    const outerRadius = secondary ? radius * 0.64 : 24 + rank * 7;
    rays.lineStyle(secondary ? 2 : 1.4 + rank * 0.25, coreColor, secondary ? 0.52 : 0.82);
    for (let index = 0; index < rayCount; index += 1) {
      const angle = (Math.PI * 2 * index) / rayCount + rank * 0.17;
      rays.lineBetween(
        Math.cos(angle) * innerRadius,
        Math.sin(angle) * innerRadius,
        Math.cos(angle) * outerRadius,
        Math.sin(angle) * outerRadius
      );
    }
    this.scene.tweens.add({
      targets: rays,
      alpha: 0,
      scaleX: secondary ? 1.18 : 1.08 + rank * 0.025,
      scaleY: secondary ? 1.18 : 1.08 + rank * 0.025,
      duration: secondary ? 255 : 135 + rank * 13,
      ease: 'Quad.Out',
      onComplete: () => rays.destroy()
    });

    const shock = this.scene.add.circle(x, y, Math.max(12, radius * 0.46), color, 0)
      .setStrokeStyle(secondary ? 3 : 1.4 + rank * 0.42, coreColor, secondary ? 0.62 : 0.8)
      .setDepth(9);
    shock.setScale(secondary ? 0.52 : 0.68);
    this.scene.tweens.add({
      targets: shock,
      alpha: 0,
      scale: secondary ? 2.05 : 1.45 + rank * 0.08,
      duration: secondary ? 270 : 165 + rank * 15,
      ease: 'Cubic.Out',
      onComplete: () => shock.destroy()
    });
  }

  showGoldenEggImpact(projectile, x, y, scale = 1) {
    if (projectile.source !== 'golden-egg') return;
    const rank = Math.max(1, Math.min(4, projectile.visualRank || 1));
    const color = rank >= 4 ? 0xffef9f : rank >= 3 ? 0xffad2f : 0xffd35c;
    const ring = this.scene.add.circle(x, y, (9 + rank * 3) * scale, color, 0.12)
      .setStrokeStyle((1.5 + rank * 0.65) * scale, 0xfff4c4, 0.82)
      .setDepth(10);
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 1.55 + rank * 0.08,
      duration: 105 + rank * 22,
      ease: 'Quad.Out',
      onComplete: () => ring.destroy()
    });
    if (rank >= 2) {
      this.scene.playFx('fx-laser-impact', x, y, {
        scale: (0.13 + rank * 0.035) * scale,
        alpha: 0.58 + rank * 0.06,
        rotation: rank * 0.19,
        depth: 11
      });
    }
  }

  redirectRicochet(projectile, hitEnemy) {
    const nextTarget = this.scene.enemies
      .filter((candidate) => (
        candidate.sprite.active
        && candidate !== hitEnemy
        && !projectile.hitEnemies.has(candidate.id)
        && Phaser.Math.Distance.Between(
          hitEnemy.sprite.x,
          hitEnemy.sprite.y,
          candidate.sprite.x,
          candidate.sprite.y
        ) <= 320
      ))
      .sort((a, b) => Phaser.Math.Distance.Squared(hitEnemy.sprite.x, hitEnemy.sprite.y, a.sprite.x, a.sprite.y)
        - Phaser.Math.Distance.Squared(hitEnemy.sprite.x, hitEnemy.sprite.y, b.sprite.x, b.sprite.y))[0];
    if (!nextTarget) {
      return false;
    }
    projectile.target = nextTarget;
    projectile.targetOffset = 0;
    projectile.baseAngle = Phaser.Math.Angle.Between(
      projectile.sprite.x,
      projectile.sprite.y,
      nextTarget.sprite.x,
      nextTarget.sprite.y
    );
    projectile.currentAngle = projectile.baseAngle;
    projectile.sprite.rotation = projectile.currentAngle;
    projectile.setVelocity(projectile.currentAngle);
    this.showModifierImpact(
      'ricochet',
      hitEnemy.sprite.x,
      hitEnemy.sprite.y,
      projectile.currentAngle,
      Math.max(1, projectile.ricochetVisualRank)
    );
    return true;
  }

  showModifierImpact(type, x, y, angle, rank = 1) {
    const visualRank = Math.max(1, Math.min(3, rank));
    const graphic = this.scene.add.graphics({ x, y })
      .setDepth(14)
      .setRotation(angle)
      .setBlendMode(Phaser.BlendModes.ADD);

    if (type === 'pierce') {
      const length = 17 + visualRank * 5;
      graphic.lineStyle(3 + visualRank * 0.45, 0x8deeff, 0.54);
      graphic.lineBetween(-length * 0.46, 0, length, 0);
      graphic.lineStyle(1.1 + visualRank * 0.25, 0xf4ffff, 0.96);
      graphic.lineBetween(-length * 0.62, 0, length * 1.12, 0);
      if (visualRank >= 2) {
        graphic.lineStyle(1.1, 0xa9f5ff, 0.52);
        graphic.lineBetween(-length * 0.2, -4, length * 0.62, -4);
        graphic.lineBetween(-length * 0.2, 4, length * 0.62, 4);
      }
    } else if (type === 'ricochet') {
      const length = 15 + visualRank * 5;
      graphic.lineStyle(3.2 + visualRank * 0.35, 0xffb24a, 0.58);
      graphic.lineBetween(-length * 0.65, 0, length * 0.72, 0);
      graphic.lineStyle(1.35 + visualRank * 0.18, 0xffffcf, 0.96);
      graphic.lineBetween(-length * 0.72, 0, length, 0);
      graphic.lineBetween(length, 0, length * 0.48, -7 - visualRank);
      graphic.lineBetween(length, 0, length * 0.48, 7 + visualRank);
    } else {
      const length = 17 + visualRank * 6;
      [-0.38, 0, 0.38].forEach((offset, index) => {
        const rayAngle = offset;
        const inner = index === 1 ? 7 : 10;
        const outer = index === 1 ? length * 1.12 : length;
        graphic.lineStyle(
          index === 1 ? 2.2 + visualRank * 0.35 : 1.4 + visualRank * 0.24,
          index === 1 ? 0xffffe5 : 0xffcf72,
          index === 1 ? 0.9 : 0.62
        );
        graphic.lineBetween(
          Math.cos(rayAngle) * inner,
          Math.sin(rayAngle) * inner,
          Math.cos(rayAngle) * outer,
          Math.sin(rayAngle) * outer
        );
      });
    }

    const entry = { type, rank: visualRank, graphic };
    this.modifierVisuals.add(entry);
    this.recentModifierImpacts.push({ type, rank: visualRank, at: this.scene.time.now });
    this.recentModifierImpacts = this.recentModifierImpacts.slice(-12);
    this.scene.tweens.add({
      targets: graphic,
      alpha: 0,
      scaleX: type === 'shell-shock' ? 1.48 : 1.24,
      scaleY: type === 'shell-shock' ? 1.32 : 1.12,
      duration: type === 'shell-shock' ? 175 : 145,
      ease: 'Cubic.Out',
      onComplete: () => {
        this.modifierVisuals.delete(entry);
        graphic.destroy();
      }
    });
  }

  damageEnemy(enemy, damage, x = enemy.sprite.x, y = enemy.sprite.y, options = {}) {
    const { scene } = this;
    if (!enemy.sprite.active) {
      return false;
    }
    if (scene.time.now < (enemy.invulnerableUntil ?? 0)) {
      const shield = scene.add.circle(x, y, 30, 0x65d7ff, 0.08)
        .setStrokeStyle(3, 0xcaf5ff, 0.75)
        .setDepth(10);
      scene.tweens.add({
        targets: shield,
        alpha: 0,
        scale: 1.35,
        duration: 150,
        onComplete: () => shield.destroy()
      });
      return false;
    }
    const source = options.source ?? 'base-egg';
    const bossMultiplier = getBossDamageMultiplier(enemy, source);
    const adjustedDamage = Math.max(1, Math.round(damage * bossMultiplier));
    const appliedDamage = enemy.mitigateDamage?.(adjustedDamage) ?? adjustedDamage;
    if (!options.quiet) scene.showHitFeedback(x, y, appliedDamage, enemy, options);
    if ([
      'evo-sunshot-array',
      'evo-siegebreaker-shell',
      'evo-tempest-crown',
      'evo-solar-scramble',
      'evo-chick-squadron'
    ].includes(source)) {
      playEvolutionImpact(scene, source, x, y);
    }
    const eggImpact = /^(base-egg|fire-eggs|golden-egg|support-chick|evo-solar-scramble|evo-chick-squadron|evo-sunshot-array|evo-siegebreaker-shell|evo-tempest-crown)/.test(source);
    if (!options.quiet) {
      if (eggImpact) {
        scene.audio.playVariant('egg-impact');
      } else {
        scene.audio.play('enemy-hit');
      }
    }
    scene.debugStats.hits += 1;
    scene.debugStats.lastHitAt = scene.time.now;
    const hpBefore = Math.max(0, enemy.hp);
    const effective = Math.min(hpBefore, appliedDamage);
    const overkill = Math.max(0, appliedDamage - hpBefore);
    scene.telemetry.addHit(scene.time.now, scene.waveSystem.currentWave, source);
    scene.telemetry.addDamageDealt({
      amount: appliedDamage,
      effective,
      overkill,
      source,
      enemyId: enemy.id,
      enemyType: enemy.type,
      time: scene.time.now,
      wave: scene.waveSystem.currentWave
    });
    if (enemy.takeDamage(appliedDamage)) {
      scene.killEnemy(enemy, source);
      return true;
    }
    return false;
  }
}
