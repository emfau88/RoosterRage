import Phaser from 'phaser';
import { Enemy } from '../entities/Enemy.js';
import { EnemyProjectile } from '../entities/EnemyProjectile.js';

export class EnemyAttackSystem {
  constructor(scene) {
    this.scene = scene;
  }

  updateEnemy(enemy, player) {
    if (enemy.boss) {
      this.updateBoss(enemy, player);
    }
    if (!enemy.ability || this.scene.time.now < enemy.nextAbilityAt) {
      return;
    }

    const angle = Phaser.Math.Angle.Between(
      enemy.sprite.x,
      enemy.sprite.y,
      player.sprite.x,
      player.sprite.y
    );
    if (enemy.ability.kind === 'shoot') {
      this.showMuzzleFlash(enemy.sprite.x, enemy.sprite.y, angle, enemy.ability);
      this.spawnProjectile(enemy.sprite.x, enemy.sprite.y, angle, enemy.ability);
    } else if (enemy.ability.kind === 'fan') {
      this.fireFan(enemy, angle);
    } else if (enemy.ability.kind === 'summon') {
      this.spawnAddsNear(enemy.sprite.x, enemy.sprite.y, enemy.ability.count ?? 2);
    }
    enemy.nextAbilityAt = this.scene.time.now + enemy.ability.cooldown;
  }

  updateBoss(enemy, player) {
    const hpRatio = enemy.hp / enemy.maxHp;
    if (!enemy.phaseTwoTriggered && hpRatio <= 0.6) {
      enemy.phaseTwoTriggered = true;
      this.spawnAddsNear(enemy.sprite.x, enemy.sprite.y, 4);
    }
    if (!enemy.phaseThreeTriggered && hpRatio <= 0.3) {
      enemy.phaseThreeTriggered = true;
      if (enemy.ability?.kind === 'fan') {
        enemy.ability = { ...enemy.ability, count: 7, spread: 1.45, cooldown: 2100 };
      }
    }
    if (enemy.heavyProjectile && this.scene.time.now >= enemy.nextHeavyAttackAt) {
      const angle = Phaser.Math.Angle.Between(
        enemy.sprite.x,
        enemy.sprite.y,
        player.sprite.x,
        player.sprite.y
      );
      this.spawnBossFireball(enemy.sprite.x, enemy.sprite.y, angle, enemy.heavyProjectile);
      enemy.nextHeavyAttackAt = this.scene.time.now + (enemy.heavyProjectile.cooldown ?? 4300);
    }
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
    const projectile = new EnemyProjectile(
      this.scene,
      x + Math.cos(angle) * muzzleDistance,
      y + Math.sin(angle) * muzzleDistance,
      angle,
      config
    );
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

  spawnAddsNear(x, y, count) {
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count;
      const config = this.scene.waveSystem.makeSlime(0.8);
      const enemy = new Enemy(
        this.scene,
        x + Math.cos(angle) * 80,
        y + Math.sin(angle) * 80,
        config
      );
      this.scene.enemies.push(enemy);
      this.scene.enemyGroup.add(enemy.sprite);
    }
  }

  explodeEnemy(enemy) {
    const radius = enemy.explosionRadius ?? 86;
    const damage = enemy.explosionDamage ?? 18;
    const x = enemy.sprite.x;
    const y = enemy.sprite.y;
    const core = this.scene.add.circle(x, y, 22, 0xfff08a, 0.55).setDepth(10);
    this.scene.audio.play('rocket-explosion');
    const ring = this.scene.add.circle(x, y, radius, 0xff6a28, 0.24)
      .setStrokeStyle(4, 0xffd35c, 0.9)
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
      if (this.scene.player.damage(damage, this.scene.time.now)) {
        this.scene.telemetry.addDamageTaken(
          damage,
          this.scene.time.now,
          this.scene.waveSystem.currentWave
        );
      }
    }
  }
}
