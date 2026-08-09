import Phaser from 'phaser';
import { Projectile } from '../entities/Projectile.js';

export class CombatSystem {
  constructor(scene) {
    this.scene = scene;
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
      this.spawnProjectile(angle, shotTarget, shot.laneOffset, {
        homing: true,
        maxTurnRate: shot.maxTurnRate ?? 0.08,
        targetOffset: 0,
        laneOffset: shot.laneOffset
      });
      scene.showShotFeedback(angle, shot.laneOffset);
    });
    scene.lastShotAt = time;
    scene.audio.play('egg-shot');
    scene.debugStats.shots += pattern.length;
    scene.debugStats.lastShotAt = time;
    scene.telemetry.addShot(pattern.length, time, scene.waveSystem.currentWave);
  }

  getShotPattern() {
    if (this.scene.player.shotCount >= 3) {
      return [
        { laneOffset: -24, maxTurnRate: 0.095 },
        { laneOffset: 0, maxTurnRate: 0.09 },
        { laneOffset: 24, maxTurnRate: 0.095 }
      ];
    }
    if (this.scene.player.shotCount === 2) {
      return [
        { laneOffset: -18, maxTurnRate: 0.095 },
        { laneOffset: 18, maxTurnRate: 0.095 }
      ];
    }
    return [{ angleOffset: 0, laneOffset: 0 }];
  }

  getShotTargets(count, fallbackTarget) {
    const { scene } = this;
    const sorted = [...scene.enemies]
      .filter((enemy) => enemy.sprite.active)
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
    this.scene.enemies.forEach((enemy) => {
      if (!enemy.sprite.active) {
        return;
      }
      const distance = Phaser.Math.Distance.Squared(x, y, enemy.sprite.x, enemy.sprite.y);
      if (distance < nearestDistance) {
        nearest = enemy;
        nearestDistance = distance;
      }
    });
    return nearest;
  }

  spawnProjectile(angle, target, laneOffset = 0, options = {}) {
    const { scene } = this;
    const muzzle = scene.player.getMuzzlePosition(42);
    const sideX = -Math.sin(scene.player.aimAngle) * laneOffset;
    const sideY = Math.cos(scene.player.aimAngle) * laneOffset;
    const projectile = new Projectile(
      scene,
      muzzle.x + sideX,
      muzzle.y + sideY,
      angle,
      scene.player.projectileDamage,
      scene.player.fireEggs,
      target,
      options.targetOffset ?? laneOffset,
      options
    );
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
    const projectile = new Projectile(
      scene,
      x,
      y,
      angle,
      options.damage ?? scene.player.projectileDamage,
      options.isFireEgg ?? false,
      target,
      0,
      options
    );
    scene.projectiles.push(projectile);
    scene.projectileGroup.add(projectile.sprite);
    projectile.setVelocity(angle);
    scene.showShotFeedback(angle, 0);
    scene.audio.play(options.sfx ?? 'egg-shot', { volume: options.sfxVolume });
    scene.debugStats.specialShots += 1;
    scene.telemetry.addShot(1, scene.time.now, scene.waveSystem.currentWave);
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
    if (!projectile.sprite.active || !enemy.sprite.active) {
      return;
    }
    const hitX = enemy.sprite.x;
    const hitY = enemy.sprite.y;
    projectile.hitEnemies.add(enemy.id);
    this.damageEnemy(enemy, projectile.damage, hitX, hitY);
    if (projectile.pierceRemaining > 0) {
      projectile.pierceRemaining -= 1;
    } else {
      projectile.destroy();
    }
  }

  damageEnemy(enemy, damage, x = enemy.sprite.x, y = enemy.sprite.y) {
    const { scene } = this;
    if (!enemy.sprite.active) {
      return;
    }
    scene.showHitFeedback(x, y, damage, enemy);
    scene.audio.play('enemy-hit');
    scene.debugStats.hits += 1;
    scene.debugStats.lastHitAt = scene.time.now;
    scene.telemetry.addHit(scene.time.now, scene.waveSystem.currentWave);
    if (enemy.takeDamage(damage)) {
      scene.killEnemy(enemy);
    }
  }
}
