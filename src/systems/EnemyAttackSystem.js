import Phaser from 'phaser';
import { EnemyProjectile } from '../entities/EnemyProjectile.js';

export class EnemyAttackSystem {
  constructor(scene) {
    this.scene = scene;
  }

  updateEnemy(enemy, player) {
    if (enemy.boss) {
      this.updateBoss(enemy, player);
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
    const telegraphMs = ability.telegraphMs ?? (ability.kind === 'fan' ? 230 : 180);
    enemy.abilityCharging = true;
    enemy.nextAbilityAt = this.scene.time.now + ability.cooldown;
    this.scene.combatFeedback.showEnemyTelegraph(enemy, player, ability, {
      duration: telegraphMs,
      count: ability.kind === 'fan' ? ability.count ?? 3 : 1,
      spread: ability.kind === 'fan' ? ability.spread ?? 0.55 : 0
    });
    this.scene.time.delayedCall(telegraphMs, () => {
      enemy.abilityCharging = false;
      if (!enemy.sprite.active || !player.sprite.active) {
        return;
      }

      const angle = Phaser.Math.Angle.Between(
        enemy.sprite.x,
        enemy.sprite.y,
        player.sprite.x,
        player.sprite.y
      );
      if (ability.kind === 'shoot') {
        this.showMuzzleFlash(enemy.sprite.x, enemy.sprite.y, angle, ability);
        this.spawnProjectile(enemy.sprite.x, enemy.sprite.y, angle, ability);
      } else if (ability.kind === 'fan') {
        this.fireFan(enemy, angle);
      } else if (ability.kind === 'summon') {
        this.spawnAddsNear(enemy.sprite.x, enemy.sprite.y, ability.count ?? 2);
      }
    });
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
      enemy.heavyProjectile
      && !enemy.heavyCharging
      && !enemy.abilityCharging
      && this.scene.time.now >= enemy.nextHeavyAttackAt
    ) {
      const telegraphMs = enemy.heavyProjectile.telegraphMs ?? 420;
      enemy.heavyCharging = true;
      enemy.nextHeavyAttackAt = this.scene.time.now + (enemy.heavyProjectile.cooldown ?? 4300);
      this.scene.combatFeedback.showEnemyTelegraph(enemy, player, enemy.heavyProjectile, {
        duration: telegraphMs,
        heavy: true
      });
      this.scene.time.delayedCall(telegraphMs, () => {
        enemy.heavyCharging = false;
        if (!enemy.sprite.active || !player.sprite.active) {
          return;
        }
        const angle = Phaser.Math.Angle.Between(
          enemy.sprite.x,
          enemy.sprite.y,
          player.sprite.x,
          player.sprite.y
        );
        this.spawnBossFireball(enemy.sprite.x, enemy.sprite.y, angle, enemy.heavyProjectile);
      });
    }
  }

  triggerBossPhase(enemy, phase) {
    enemy.speed *= phase.speedMultiplier ?? 1;
    if (phase.ability && enemy.ability) {
      enemy.ability = { ...enemy.ability, ...phase.ability };
    }
    if (phase.heavyProjectile && enemy.heavyProjectile) {
      enemy.heavyProjectile = { ...enemy.heavyProjectile, ...phase.heavyProjectile };
    }
    phase.adds?.forEach((add) => {
      this.spawnAddsNear(enemy.sprite.x, enemy.sprite.y, add.count, add);
    });

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
    this.scene.cameras.main.shake(140, 0.003);
    this.scene.telemetry.record('bossPhaseStarted', this.scene.time.now, {
      wave: this.scene.waveSystem.currentWave,
      phase: enemy.bossPhaseIndex + 1
    });
  }

  fireFan(enemy, angle) {
    const spread = enemy.ability.spread ?? 0.55;
    const count = enemy.ability.count ?? 3;
    this.showMuzzleFlash(enemy.sprite.x, enemy.sprite.y, angle, enemy.ability, count);
    for (let index = 0; index < count; index += 1) {
      const progress = count === 1 ? 0 : index / (count - 1);
      this.spawnProjectile(
        enemy.sprite.x,
        enemy.sprite.y,
        angle - spread / 2 + spread * progress,
        enemy.ability
      );
    }
  }

  spawnProjectile(x, y, angle, config) {
    const muzzleDistance = config.muzzleDistance ?? 30;
    const projectile = this.scene.objectPools.acquire(
      'enemyProjectile',
      () => new EnemyProjectile(this.scene),
      (item) => item.reset(
        x + Math.cos(angle) * muzzleDistance,
        y + Math.sin(angle) * muzzleDistance,
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
    const arenaWidth = this.scene.entities.arenaWidth;
    const arenaHeight = this.scene.entities.arenaHeight;
    const margin = 54;
    let farthest = null;

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const radius = 145 + (attempt % 3) * 55;
      const angle = baseAngle + attempt * (Math.PI / 6);
      const x = Phaser.Math.Clamp(originX + Math.cos(angle) * radius, margin, arenaWidth - margin);
      const y = Phaser.Math.Clamp(originY + Math.sin(angle) * radius, margin, arenaHeight - margin);
      const distance = Phaser.Math.Distance.Between(x, y, player.x, player.y);
      const candidate = { x, y, distance };
      if (!farthest || distance > farthest.distance) {
        farthest = candidate;
      }
      if (distance >= minDistance) {
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
    const core = this.scene.add.circle(x, y, 22, 0xfff08a, 0.55).setDepth(10);
    this.scene.audio.play('rocket-explosion');
    const ring = this.scene.add.circle(x, y, radius, 0xff3048, 0.2)
      .setStrokeStyle(4, 0xffd8dc, 0.92)
      .setDepth(9);
    this.scene.tweens.add({
      targets: core,
      alpha: 0,
      scale: 3.4,
      duration: 180,
      onComplete: () => core.destroy()
    });
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 1.18,
      duration: 280,
      onComplete: () => ring.destroy()
    });
    if (Phaser.Math.Distance.Between(x, y, this.scene.player.sprite.x, this.scene.player.sprite.y) <= radius) {
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
          `explosion:${enemy.type}`,
          { lethal: this.scene.player.hp <= 0 }
        );
      }
    }
  }
}
