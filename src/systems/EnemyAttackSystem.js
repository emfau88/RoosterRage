import Phaser from 'phaser';
import { EnemyProjectile } from '../entities/EnemyProjectile.js';
import { ENCOUNTER_STANDARDS } from '../data/enemyRoleDefinitions.js';

const DANGER_RECOVERY_MS = 180;

export class EnemyAttackSystem {
  constructor(scene) {
    this.scene = scene;
    this.reservedNormalProjectiles = 0;
  }

  updateAuras(delta) {
    const enemies = this.scene.enemies.filter((enemy) => enemy.sprite.active);
    enemies.forEach((enemy) => {
      enemy.auraSpeedMultiplier = 1;
      enemy.damageReduction = 0;
    });
    enemies.filter((enemy) => enemy.aura).forEach((source) => {
      enemies.forEach((target) => {
        if (Phaser.Math.Distance.Between(
          source.sprite.x,
          source.sprite.y,
          target.sprite.x,
          target.sprite.y
        ) > source.aura.radius) {
          return;
        }
        if (source.aura.kind === 'haste') {
          target.auraSpeedMultiplier = Math.max(target.auraSpeedMultiplier, source.aura.multiplier ?? 1.18);
        } else if (source.aura.kind === 'armor') {
          target.damageReduction = Math.max(target.damageReduction, source.aura.reduction ?? 0.22);
        } else if (source.aura.kind === 'regeneration') {
          const heal = (source.aura.healPerSecond ?? 3) * delta / 1000;
          target.hp = Math.min(target.maxHp, target.hp + heal);
        }
      });
    });
  }

  updateEnemy(enemy, player) {
    if (this.scene.time.now < (enemy.invulnerableUntil ?? 0)) {
      return;
    }
    if (enemy.boss) {
      this.updateBoss(enemy, player);
      return;
    }
    if (
      !enemy.ability
      || enemy.abilityCharging
      || enemy.heavyCharging
      || this.scene.time.now < enemy.nextAbilityAt
    ) {
      return;
    }

    this.beginAbility(enemy, player);
  }

  beginAbility(enemy, player) {
    const ability = enemy.ability;
    const projectileCost = this.getNormalProjectileCost(enemy, ability);
    if (projectileCost > 0 && !this.reserveNormalProjectiles(projectileCost)) {
      enemy.nextAbilityAt = this.scene.time.now + 260;
      this.scene.telemetry.record('enemyAbilityDeferred', this.scene.time.now, {
        wave: this.scene.waveSystem.currentWave,
        enemyType: enemy.type,
        ability: ability.kind,
        projectileCost
      });
      return;
    }
    const heavy = ability.heavy ?? ability.kind === 'slam';
    const minimumTelegraph = heavy
      ? ENCOUNTER_STANDARDS.heavyTelegraphMs
      : ENCOUNTER_STANDARDS.normalTelegraphMs;
    const telegraphMs = Math.max(minimumTelegraph, ability.telegraphMs ?? minimumTelegraph);
    enemy.abilityCharging = true;
    enemy.nextAbilityAt = this.scene.time.now + ability.cooldown;
    this.scene.combatFeedback.showEnemyTelegraph(enemy, player, ability, {
      duration: telegraphMs,
      count: ability.kind === 'fan' ? ability.count ?? 3 : 1,
      spread: ability.kind === 'fan' ? ability.spread ?? 0.55 : 0,
      heavy,
      radial: ability.kind === 'slam',
      radius: ability.radius
    });
    if (ability.kind === 'summon') {
      this.scene.audio.play('summoner-charge');
    }
    this.scene.time.delayedCall(telegraphMs, () => {
      this.releaseNormalProjectiles(projectileCost);
      if (!enemy.sprite.active || !player.sprite.active || enemy.ability !== ability) {
        return;
      }
      enemy.abilityCharging = false;
      enemy.markAbilityResolved?.(
        ability.kind === 'summon' || ability.kind === 'slam' ? 220 : 150,
        ability.kind === 'dash' ? 160 : 240
      );

      const angle = Phaser.Math.Angle.Between(
        enemy.sprite.x,
        enemy.sprite.y,
        player.sprite.x,
        player.sprite.y
      );
      if (ability.kind === 'shoot') {
        this.scene.audio.play('spitter-shot');
        this.showMuzzleFlash(enemy.sprite.x, enemy.sprite.y, angle, ability);
        this.spawnProjectile(enemy.sprite.x, enemy.sprite.y, angle, ability);
      } else if (ability.kind === 'fan') {
        this.scene.audio.play('spitter-shot');
        this.fireFan(enemy, angle, ability);
      } else if (ability.kind === 'summon') {
        this.scene.audio.play('summoner-spawn');
        this.spawnAddsNear(enemy.sprite.x, enemy.sprite.y, ability.count ?? 2);
      } else if (ability.kind === 'dash') {
        enemy.beginDash(angle, ability.speed ?? 430, ability.duration ?? 480);
      } else if (ability.kind === 'slam') {
        this.performSlam(enemy, player, ability);
      }
      this.scene.telemetry.record('enemyAbilityFired', this.scene.time.now, {
        wave: this.scene.waveSystem.currentWave,
        enemyType: enemy.type,
        ability: ability.kind
      });
    });
  }

  getNormalProjectileCost(enemy, ability) {
    if (enemy.elite || enemy.boss || !['shoot', 'fan'].includes(ability.kind)) {
      return 0;
    }
    return ability.kind === 'fan' ? ability.count ?? 3 : 1;
  }

  reserveNormalProjectiles(count) {
    const active = this.scene.enemyProjectiles.filter((projectile) => projectile.sprite.active).length;
    if (active + this.reservedNormalProjectiles + count > ENCOUNTER_STANDARDS.normalProjectileBudget) {
      return false;
    }
    this.reservedNormalProjectiles += count;
    return true;
  }

  releaseNormalProjectiles(count) {
    this.reservedNormalProjectiles = Math.max(0, this.reservedNormalProjectiles - count);
  }

  updateBoss(enemy, player) {
    const hpRatio = enemy.hp / enemy.maxHp;
    let phase = enemy.bossPhases[enemy.bossPhaseIndex];
    while (phase && hpRatio <= phase.threshold) {
      this.triggerBossPhase(enemy, phase);
      enemy.bossPhaseIndex += 1;
      phase = enemy.bossPhases[enemy.bossPhaseIndex];
    }
    if (
      enemy.abilityCharging
      || enemy.heavyCharging
      || this.scene.time.now < enemy.bossSequenceReadyAt
    ) {
      return;
    }
    this.advanceBossSequence(enemy, player);
  }

  advanceBossSequence(enemy, player) {
    const sequence = enemy.bossSequences[enemy.bossPhaseIndex] ?? enemy.bossSequences[0];
    if (!sequence?.steps?.length) {
      return;
    }
    const stepIndex = enemy.bossSequenceStep % sequence.steps.length;
    const step = sequence.steps[stepIndex];
    enemy.bossSequenceStep = (stepIndex + 1) % sequence.steps.length;
    this.scene.telemetry.record('bossSequenceStepStarted', this.scene.time.now, {
      wave: this.scene.waveSystem.currentWave,
      phase: enemy.bossPhaseIndex + 1,
      sequence: sequence.name,
      step: step.kind,
      stepIndex
    });

    if (step.kind === 'recovery' || step.kind === 'chase') {
      enemy.bossSequenceReadyAt = this.scene.time.now + step.duration;
      return;
    }
    if (step.kind === 'add-pulse') {
      this.spawnBossAddPulse(enemy, step);
      enemy.bossSequenceReadyAt = this.scene.time.now;
      return;
    }
    this.beginBossSequenceAttack(enemy, player, step);
  }

  beginBossSequenceAttack(enemy, player, step) {
    const isFireball = step.kind === 'fireball';
    const isDash = step.kind === 'dash';
    const base = isFireball ? enemy.heavyProjectile : enemy.ability;
    const attack = { ...base, ...step, kind: step.kind };
    const heavy = isFireball || isDash;
    const minimumTelegraph = heavy
      ? ENCOUNTER_STANDARDS.heavyTelegraphMs
      : ENCOUNTER_STANDARDS.normalTelegraphMs;
    const telegraphMs = Math.max(minimumTelegraph, attack.telegraphMs ?? minimumTelegraph);
    const token = ++enemy.bossSequenceToken;
    enemy.abilityCharging = true;
    enemy.heavyCharging = isFireball;
    enemy.bossSequenceReadyAt = Infinity;
    if (isFireball) {
      this.scene.audio.play('summoner-charge', { rate: 0.72, volume: 0.16 });
    }
    this.scene.combatFeedback.showEnemyTelegraph(enemy, player, attack, {
      duration: telegraphMs,
      count: step.kind === 'fan' ? attack.count ?? 5 : 1,
      spread: step.kind === 'fan' ? attack.spread ?? 1.15 : 0,
      heavy,
      radial: false
    });
    const activationId = enemy.activationId;
    this.scene.time.delayedCall(telegraphMs, () => {
      if (
        !enemy.sprite.active
        || !player.sprite.active
        || enemy.activationId !== activationId
        || enemy.bossSequenceToken !== token
      ) {
        return;
      }
      enemy.abilityCharging = false;
      enemy.heavyCharging = false;
      enemy.markAbilityResolved?.(isFireball || isDash ? 220 : 170, 260);
      enemy.bossSequenceReadyAt = this.scene.time.now;
      const angle = Phaser.Math.Angle.Between(
        enemy.sprite.x,
        enemy.sprite.y,
        player.sprite.x,
        player.sprite.y
      );
      if (step.kind === 'fan') {
        this.scene.audio.play('spitter-shot');
        this.fireFan(enemy, angle, attack);
      } else if (isFireball) {
        this.spawnBossFireball(enemy.sprite.x, enemy.sprite.y, angle, attack);
      } else if (isDash) {
        enemy.beginDash(angle, attack.speed ?? 440, attack.duration ?? 520);
      }
      this.scene.telemetry.record('bossSequenceStepResolved', this.scene.time.now, {
        wave: this.scene.waveSystem.currentWave,
        phase: enemy.bossPhaseIndex + 1,
        step: step.kind
      });
      this.scene.telemetry.record('enemyAbilityFired', this.scene.time.now, {
        wave: this.scene.waveSystem.currentWave,
        enemyType: enemy.type,
        ability: step.kind
      });
    });
  }

  spawnBossAddPulse(enemy, step) {
    const activeAdds = this.scene.enemies.filter((candidate) => (
      candidate.sprite.active && !candidate.boss
    )).length;
    let remaining = Math.max(0, (step.maxActive ?? 6) - activeAdds);
    let spawned = 0;
    step.groups?.forEach((group) => {
      if (remaining <= 0) {
        return;
      }
      const count = Math.min(group.count ?? 0, remaining);
      this.spawnAddsNear(enemy.sprite.x, enemy.sprite.y, count, group);
      remaining -= count;
      spawned += count;
    });
    this.scene.telemetry.record('bossAddPulse', this.scene.time.now, {
      wave: this.scene.waveSystem.currentWave,
      phase: enemy.bossPhaseIndex + 1,
      activeBefore: activeAdds,
      spawned,
      cap: step.maxActive ?? 6
    });
  }

  triggerBossPhase(enemy, phase) {
    this.scene.audio.play('boss-phase', { cooldown: 0 });
    enemy.bossSequenceToken += 1;
    enemy.abilityCharging = false;
    enemy.heavyCharging = false;
    enemy.bossSequenceStep = 0;
    const transitionMs = phase.transitionMs ?? 1000;
    enemy.bossSequenceReadyAt = this.scene.time.now + transitionMs;
    enemy.invulnerableUntil = Math.max(enemy.invulnerableUntil ?? 0, enemy.bossSequenceReadyAt);
    this.clearBossProjectiles();
    this.clearBossAdds();
    enemy.speed *= phase.speedMultiplier ?? 1;
    if (phase.ability && enemy.ability) {
      enemy.ability = { ...enemy.ability, ...phase.ability };
    }
    if (phase.heavyProjectile && enemy.heavyProjectile) {
      enemy.heavyProjectile = { ...enemy.heavyProjectile, ...phase.heavyProjectile };
    }
    this.spawnBossTransitionAdds(enemy, phase.adds ?? [], 6);

    const ring = this.scene.add.circle(enemy.sprite.x, enemy.sprite.y, 62, 0xff6a28, 0.12)
      .setStrokeStyle(5, 0xffd35a, 0.9)
      .setDepth(9);
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 2.35,
      duration: 520,
      onComplete: () => ring.destroy()
    });
    this.scene.combatFeedback.shake(140, 0.003);
    this.scene.telemetry.record('bossPhaseStarted', this.scene.time.now, {
      wave: this.scene.waveSystem.currentWave,
      phase: enemy.bossPhaseIndex + 2,
      name: phase.name ?? `Phase ${enemy.bossPhaseIndex + 2}`,
      transitionMs
    });
    this.scene.hud.showEncounterBanner(
      phase.name ?? `Brood King Phase ${enemy.bossPhaseIndex + 2}`,
      phase.subtitle ?? 'Das Angriffsmuster veraendert sich.',
      'boss'
    );
  }

  clearBossProjectiles() {
    let cleared = 0;
    this.scene.enemyProjectiles.forEach((projectile) => {
      if (projectile.sprite.active && projectile.source?.startsWith('boss-')) {
        projectile.destroy();
        cleared += 1;
      }
    });
    this.scene.enemyProjectiles = this.scene.enemyProjectiles.filter((projectile) => (
      projectile.sprite.active
    ));
    this.scene.telemetry.record('bossProjectilesCleared', this.scene.time.now, {
      wave: this.scene.waveSystem.currentWave,
      cleared
    });
    return cleared;
  }

  clearBossAdds() {
    const adds = this.scene.enemies.filter((candidate) => (
      candidate.sprite.active && !candidate.boss
    ));
    adds.forEach((add) => add.destroy());
    this.scene.enemies = this.scene.enemies.filter((candidate) => candidate.sprite.active);
    this.scene.telemetry.record('bossAddsCleared', this.scene.time.now, {
      wave: this.scene.waveSystem.currentWave,
      cleared: adds.length
    });
    return adds.length;
  }

  spawnBossTransitionAdds(enemy, groups, cap) {
    const existing = this.scene.enemies.filter((candidate) => (
      candidate.sprite.active && !candidate.boss
    )).length;
    let remaining = Math.max(0, cap - existing);
    groups.forEach((group) => {
      if (remaining <= 0) {
        return;
      }
      const count = Math.min(group.count ?? 0, remaining);
      this.spawnAddsNear(enemy.sprite.x, enemy.sprite.y, count, group);
      remaining -= count;
    });
  }

  performSlam(enemy, player, ability) {
    this.scene.audio.play('brute-stomp');
    const radius = ability.radius ?? 150;
    const ring = this.scene.add.circle(enemy.sprite.x, enemy.sprite.y, radius, 0xff5b32, 0.13)
      .setStrokeStyle(6, 0xffd35c, 0.9)
      .setDepth(11);
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 1.12,
      duration: 260,
      onComplete: () => ring.destroy()
    });
    if (Phaser.Math.Distance.Between(
      enemy.sprite.x,
      enemy.sprite.y,
      player.sprite.x,
      player.sprite.y
    ) > radius) {
      return;
    }
    const hpBefore = player.hp;
    if (player.damage(ability.damage ?? 20, this.scene.time.now)) {
      const applied = hpBefore - player.hp;
      this.scene.combatFeedback.showPlayerDamage(player.sprite.x, player.sprite.y, applied, {
        color: 0xff5b32,
        heavy: true
      });
      this.scene.telemetry.addDamageTaken(
        applied,
        this.scene.time.now,
        this.scene.waveSystem.currentWave,
        `slam:${enemy.type}`,
        { lethal: player.hp <= 0 }
      );
    }
  }

  fireFan(enemy, angle, ability = enemy.ability) {
    if (!ability) {
      return;
    }
    const spread = ability.spread ?? 0.55;
    const count = ability.count ?? 3;
    this.showMuzzleFlash(enemy.sprite.x, enemy.sprite.y, angle, ability, count);
    for (let index = 0; index < count; index += 1) {
      const progress = count === 1 ? 0 : index / (count - 1);
      this.spawnProjectile(
        enemy.sprite.x,
        enemy.sprite.y,
        angle - spread / 2 + spread * progress,
        ability
      );
    }
  }

  spawnProjectile(x, y, angle, config) {
    const muzzleDistance = config.muzzleDistance ?? 30;
    const spawnX = x + Math.cos(angle) * muzzleDistance;
    const spawnY = y + Math.sin(angle) * muzzleDistance;
    if (Phaser.Math.Distance.Between(
      spawnX,
      spawnY,
      this.scene.player.sprite.x,
      this.scene.player.sprite.y
    ) < ENCOUNTER_STANDARDS.playerProtectionRadius) {
      this.scene.telemetry.record('enemyProjectileSuppressed', this.scene.time.now, {
        wave: this.scene.waveSystem.currentWave,
        source: config.source ?? 'enemy-projectile'
      });
      return null;
    }
    const projectile = this.scene.objectPools.acquire(
      'enemyProjectile',
      () => new EnemyProjectile(this.scene),
      (item) => item.reset(
        spawnX,
        spawnY,
        angle,
        config
      )
    );
    if (!projectile) {
      return null;
    }
    this.scene.enemyProjectiles.push(projectile);
    this.scene.enemyProjectileGroup.add(projectile.sprite);
    return projectile;
  }

  spawnBossFireball(x, y, angle, config = {}) {
    const fireballConfig = {
      texture: 'boss-fireball',
      radius: 19,
      speed: 238,
      damage: 22,
      life: 4200,
      color: 0xff6a28,
      trailColor: 0xff3322,
      trailAlpha: 0.44,
      scale: 1.55,
      depth: 8,
      muzzleDistance: 82,
      pulse: true,
      heavy: true,
      warningColor: 0xff3048,
      source: 'boss-fireball',
      tint: false,
      ...config
    };
    this.showMuzzleFlash(x, y, angle, fireballConfig, 3);
    this.scene.audio.play('boss-fireball');
    return this.spawnProjectile(x, y, angle, fireballConfig);
  }

  showMuzzleFlash(x, y, angle, config = {}, burstCount = 1) {
    const color = config.color ?? 0xa7ff64;
    const distance = burstCount > 1 ? 28 : 22;
    const flashX = x + Math.cos(angle) * distance;
    const flashY = y + Math.sin(angle) * distance;
    const flash = this.scene.add.circle(flashX, flashY, burstCount > 1 ? 18 : 13, color, 0.42)
      .setStrokeStyle(2, color, 0.85)
      .setDepth(6);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: burstCount > 1 ? 2.2 : 1.7,
      duration: 150,
      onComplete: () => flash.destroy()
    });
    return flash;
  }

  spawnAddsNear(x, y, count, spec = { kind: 'slime', multiplier: 0.8 }) {
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count;
      const { x: spawnX, y: spawnY } = this.findSafeAddSpawn(x, y, angle, 210);
      const config = this.scene.waveSystem.makeEnemyFromSpec(spec);
      this.scene.entities.spawnEnemyAt(config, spawnX, spawnY);
    }
  }

  findSafeAddSpawn(originX, originY, baseAngle, minDistance) {
    const player = this.scene.player.sprite;
    const bounds = this.scene.arena.bounds;
    const margin = 54;
    let farthest = null;

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const radius = 145 + (attempt % 3) * 55;
      const angle = baseAngle + attempt * (Math.PI / 6);
      const x = Phaser.Math.Clamp(
        originX + Math.cos(angle) * radius,
        bounds.x + margin,
        bounds.x + bounds.width - margin
      );
      const y = Phaser.Math.Clamp(
        originY + Math.sin(angle) * radius,
        bounds.y + margin,
        bounds.y + bounds.height - margin
      );
      const distance = Phaser.Math.Distance.Between(x, y, player.x, player.y);
      const candidate = { x, y, distance };
      if (!farthest || distance > farthest.distance) {
        farthest = candidate;
      }
      if (distance >= minDistance && !this.scene.arena.overlapsObstacle(x, y, 34)) {
        return candidate;
      }
    }

    return this.scene.entities.findSafeEdgeSpawn(minDistance) ?? farthest;
  }

  explodeEnemy(enemy) {
    const radius = enemy.explosionRadius ?? 86;
    const damage = enemy.explosionDamage ?? 18;
    const x = enemy.sprite.x;
    const y = enemy.sprite.y;
    const source = `explosion:${enemy.type}`;
    const armedSprite = enemy.type === 'bomber'
      ? this.scene.add.sprite(x, y, 'enemy-bomber-bob', 2)
        .setScale(enemy.sprite.scaleX)
        .setDepth(8)
      : null;
    if (armedSprite) {
      this.scene.tweens.add({
        targets: armedSprite,
        scaleX: enemy.sprite.scaleX * 1.12,
        scaleY: enemy.sprite.scaleY * 1.12,
        alpha: { from: 0.9, to: 1 },
        duration: 150,
        yoyo: true,
        repeat: 1
      });
    }
    this.scene.enemyDangerZones.push({
      x,
      y,
      radius,
      expiresAt: this.scene.time.now + ENCOUNTER_STANDARDS.heavyTelegraphMs + DANGER_RECOVERY_MS,
      source
    });
    const ring = this.scene.add.circle(x, y, radius, 0xff3048, 0.12)
      .setStrokeStyle(4, 0xffd8dc, 0.92)
      .setDepth(9);
    this.scene.tweens.add({
      targets: ring,
      alpha: { from: 0.22, to: 0.8 },
      scale: { from: 0.45, to: 1 },
      duration: ENCOUNTER_STANDARDS.heavyTelegraphMs,
      onComplete: () => ring.destroy()
    });
    this.scene.telemetry.record('deathExplosionTelegraphed', this.scene.time.now, {
      wave: this.scene.waveSystem.currentWave,
      source,
      duration: ENCOUNTER_STANDARDS.heavyTelegraphMs
    });
    this.scene.time.delayedCall(ENCOUNTER_STANDARDS.heavyTelegraphMs, () => {
      armedSprite?.destroy();
      const core = this.scene.add.circle(x, y, 22, 0xfff08a, 0.55).setDepth(10);
      this.scene.audio.play('bomber-explosion');
      this.scene.tweens.add({
        targets: core,
        alpha: 0,
        scale: 3.4,
        duration: 180,
        onComplete: () => core.destroy()
      });
      if (Phaser.Math.Distance.Between(x, y, this.scene.player.sprite.x, this.scene.player.sprite.y) > radius) {
        return;
      }
      const hpBefore = this.scene.player.hp;
      if (this.scene.player.damage(damage, this.scene.time.now)) {
        const appliedDamage = Math.max(0, hpBefore - this.scene.player.hp);
        this.scene.combatFeedback.showPlayerDamage(
          this.scene.player.sprite.x,
          this.scene.player.sprite.y,
          appliedDamage,
          { color: 0xff3048, heavy: true }
        );
        this.scene.telemetry.addDamageTaken(
          appliedDamage,
          this.scene.time.now,
          this.scene.waveSystem.currentWave,
          source,
          { lethal: this.scene.player.hp <= 0 }
        );
      }
    });
  }
}
