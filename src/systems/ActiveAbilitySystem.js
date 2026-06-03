import Phaser from 'phaser';
import { HazardZone } from '../entities/HazardZone.js';
import { LightningBolt } from '../entities/LightningBolt.js';
import { MolotovEggProjectile } from '../entities/MolotovEggProjectile.js';
import { OrbitEgg } from '../entities/OrbitEgg.js';
import { RocketProjectile } from '../entities/RocketProjectile.js';
import { SupportChicken } from '../entities/SupportChicken.js';
import { VoidZone } from '../entities/VoidZone.js';

export class ActiveAbilitySystem {
  constructor(scene) {
    this.scene = scene;
    this.goldenEgg = { rank: 0, nextAt: 0 };
    this.molotovEgg = { rank: 0, nextAt: 0 };
    this.lightningComb = { rank: 0, nextAt: 0 };
    this.voidNest = { rank: 0, nextAt: 0 };
    this.rocketEgg = { rank: 0, nextAt: 0 };
    this.laserComb = { rank: 0, nextAt: 0 };
  }

  update(time) {
    if (this.goldenEgg.rank > 0 && time >= this.goldenEgg.nextAt) {
      this.fireGoldenEgg(time);
    }
    if (this.molotovEgg.rank > 0 && time >= this.molotovEgg.nextAt) {
      this.throwMolotovEgg(time);
    }
    if (this.lightningComb.rank > 0 && time >= this.lightningComb.nextAt) {
      this.fireLightningComb(time);
    }
    if (this.voidNest.rank > 0 && time >= this.voidNest.nextAt) {
      this.openVoidNest(time);
    }
    if (this.rocketEgg.rank > 0 && time >= this.rocketEgg.nextAt) {
      this.fireRocketEgg(time);
    }
    if (this.laserComb.rank > 0 && time >= this.laserComb.nextAt) {
      this.fireLaserComb(time);
    }
  }

  fireGoldenEgg(time) {
    const target = this.scene.findNearestEnemy();
    if (!target) {
      this.goldenEgg.nextAt = time + 700;
      return;
    }
    const angle = Phaser.Math.Angle.Between(
      this.scene.player.sprite.x,
      this.scene.player.sprite.y,
      target.sprite.x,
      target.sprite.y
    );
    this.scene.spawnSpecialProjectile(angle, target, {
      texture: 'golden-egg',
      damage: 42 + this.goldenEgg.rank * 18,
      speed: 430,
      life: 2300,
      pierce: 2 + this.goldenEgg.rank,
      hitRadius: 34,
      bodyRadius: 14,
      scale: 1.15 + this.goldenEgg.rank * 0.12,
      trailRadius: 17,
      trailColor: 0xffd35c,
      trailAlpha: 0.28,
      homing: true,
      maxTurnRate: 0.045,
      sfx: 'egg-shot',
      sfxVolume: 0.16
    });
    this.goldenEgg.nextAt = time + Math.max(2400, 5200 - this.goldenEgg.rank * 650);
  }

  throwMolotovEgg(time) {
    const target = this.findClusterTarget();
    if (!target) {
      this.molotovEgg.nextAt = time + 900;
      return;
    }
    const start = this.scene.player.getMuzzlePosition(28);
    this.scene.molotovProjectiles.push(new MolotovEggProjectile(this.scene, start.x, start.y, target.x, target.y, this.molotovEgg.rank));
    this.scene.audio.play('egg-shot', { volume: 0.14, cooldown: 160 });
    this.molotovEgg.nextAt = time + Math.max(3200, 6400 - this.molotovEgg.rank * 700);
  }

  fireLightningComb(time) {
    const sorted = [...this.scene.enemies]
      .filter((enemy) => enemy.sprite.active)
      .sort((a, b) => Phaser.Math.Distance.Squared(this.scene.player.sprite.x, this.scene.player.sprite.y, a.sprite.x, a.sprite.y)
        - Phaser.Math.Distance.Squared(this.scene.player.sprite.x, this.scene.player.sprite.y, b.sprite.x, b.sprite.y));
    if (!sorted.length) {
      this.lightningComb.nextAt = time + 700;
      return;
    }
    const targetCount = Math.min(sorted.length, 2 + this.lightningComb.rank);
    const targets = sorted.slice(0, targetCount);
    this.scene.lightningBolts.push(new LightningBolt(this.scene, targets, this.lightningComb.rank));
    this.scene.audio.play('lightning');
    targets.forEach((enemy) => {
      this.scene.playFx('fx-lightning-impact', enemy.sprite.x, enemy.sprite.y + 10, {
        scale: 0.38 + this.lightningComb.rank * 0.04,
        depth: 12
      });
    });
    this.scene.debugStats.specialShots += 1;
    this.scene.telemetry.addShot(1, time, this.scene.waveSystem.currentWave);
    this.lightningComb.nextAt = time + Math.max(2600, 5200 - this.lightningComb.rank * 650);
  }

  openVoidNest(time) {
    const target = this.findClusterTarget();
    if (!target) {
      this.voidNest.nextAt = time + 900;
      return;
    }
    const ring = this.scene.add.circle(target.x, target.y, 32, 0x9b5cff, 0.24)
      .setStrokeStyle(3, 0xc9a8ff, 0.82)
      .setDepth(8);
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 2.4,
      duration: 220,
      onComplete: () => ring.destroy()
    });
    this.scene.playFx('fx-void-portal', target.x, target.y, {
      scale: 0.52 + this.voidNest.rank * 0.08,
      depth: 6,
      alpha: 0.88
    });
    this.scene.audio.play('void-open');
    this.scene.voidZones.push(new VoidZone(this.scene, target.x, target.y, this.voidNest.rank));
    this.voidNest.nextAt = time + Math.max(3800, 7600 - this.voidNest.rank * 800);
  }

  fireRocketEgg(time) {
    const target = this.scene.findNearestEnemy();
    if (!target) {
      this.rocketEgg.nextAt = time + 800;
      return;
    }
    const start = this.scene.player.getMuzzlePosition(36);
    this.scene.rocketProjectiles.push(new RocketProjectile(this.scene, start.x, start.y, target, this.rocketEgg.rank));
    this.scene.showShotFeedback(Phaser.Math.Angle.Between(start.x, start.y, target.sprite.x, target.sprite.y), 0);
    this.scene.audio.play('egg-shot', { volume: 0.16, cooldown: 160 });
    this.scene.debugStats.specialShots += 1;
    this.scene.telemetry.addShot(1, time, this.scene.waveSystem.currentWave);
    this.rocketEgg.nextAt = time + Math.max(2800, 5600 - this.rocketEgg.rank * 620);
  }

  createRocketExplosion(x, y, damage, radius) {
    this.scene.audio.play('rocket-explosion');
    this.scene.playFx('fx-rocket-explosion', x, y, {
      scale: Phaser.Math.Clamp(radius / 118, 0.58, 1.05),
      depth: 11
    });
    const core = this.scene.add.circle(x, y, 18, 0xfff0a6, 0.72).setDepth(10);
    const ring = this.scene.add.circle(x, y, radius, 0xff6a28, 0.22)
      .setStrokeStyle(4, 0xffd35c, 0.9)
      .setDepth(9);
    this.scene.tweens.add({
      targets: core,
      alpha: 0,
      scale: 3,
      duration: 160,
      onComplete: () => core.destroy()
    });
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 1.24,
      duration: 260,
      onComplete: () => ring.destroy()
    });
    this.scene.enemies.forEach((enemy) => {
      if (enemy.sprite.active && Phaser.Math.Distance.Between(x, y, enemy.sprite.x, enemy.sprite.y) <= radius) {
        this.scene.damageEnemy(enemy, damage);
      }
    });
  }

  fireLaserComb(time) {
    const target = this.scene.findNearestEnemy();
    if (!target) {
      this.laserComb.nextAt = time + 700;
      return;
    }
    const start = this.scene.player.getMuzzlePosition(30);
    this.scene.audio.play('laser');
    const angle = Phaser.Math.Angle.Between(start.x, start.y, target.sprite.x, target.sprite.y);
    const length = 520 + this.laserComb.rank * 90;
    const end = {
      x: start.x + Math.cos(angle) * length,
      y: start.y + Math.sin(angle) * length
    };
    const beam = this.scene.add.graphics().setDepth(12);
    beam.lineStyle(9, 0xfff3b0, 0.58);
    beam.lineBetween(start.x, start.y, end.x, end.y);
    beam.lineStyle(3, 0xff5b25, 0.95);
    beam.lineBetween(start.x, start.y, end.x, end.y);
    this.scene.tweens.add({
      targets: beam,
      alpha: 0,
      duration: 180,
      onComplete: () => beam.destroy()
    });
    const damage = 32 + this.laserComb.rank * 16;
    this.scene.enemies.forEach((enemy) => {
      if (!enemy.sprite.active) {
        return;
      }
      const distance = this.distanceToSegment(enemy.sprite.x, enemy.sprite.y, start.x, start.y, end.x, end.y);
      if (distance <= 32) {
        this.scene.playFx('fx-laser-impact', enemy.sprite.x, enemy.sprite.y + 8, {
          scale: 0.34 + this.laserComb.rank * 0.04,
          depth: 13,
          rotation: angle + Math.PI / 2
        });
        this.scene.damageEnemy(enemy, damage);
      }
    });
    this.scene.debugStats.specialShots += 1;
    this.scene.telemetry.addShot(1, time, this.scene.waveSystem.currentWave);
    this.laserComb.nextAt = time + Math.max(3000, 6400 - this.laserComb.rank * 760);
  }

  createMolotovImpact(x, y) {
    this.scene.audio.play('molotov-impact');
    this.scene.playFx('fx-molotov-fire', x, y, {
      scale: 0.62 + this.molotovEgg.rank * 0.08,
      depth: 8,
      alpha: 0.92
    });
    const flash = this.scene.add.circle(x, y, 18, 0xffd35c, 0.72).setDepth(8);
    const ring = this.scene.add.circle(x, y, 54 + this.molotovEgg.rank * 10, 0xff6a28, 0.16)
      .setStrokeStyle(4, 0xffd35c, 0.82)
      .setDepth(7);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 3,
      duration: 180,
      onComplete: () => flash.destroy()
    });
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 1.5,
      duration: 260,
      onComplete: () => ring.destroy()
    });
    this.scene.hazardZones.push(new HazardZone(this.scene, x, y, this.molotovEgg.rank));
  }

  setOrbitEggRank(rank) {
    this.scene.orbitEggs.forEach((egg) => egg.destroy());
    this.scene.orbitEggs = [];
    const count = Phaser.Math.Clamp(rank, 1, 3);
    for (let i = 0; i < count; i += 1) {
      this.scene.orbitEggs.push(new OrbitEgg(this.scene, i, count, rank));
    }
  }

  setSupportChickenRank(rank) {
    this.scene.supportChickens.forEach((chicken) => chicken.destroy());
    this.scene.supportChickens = [];
    const count = Phaser.Math.Clamp(rank, 1, 2);
    for (let i = 0; i < count; i += 1) {
      this.scene.supportChickens.push(new SupportChicken(this.scene, i, count, rank));
    }
  }

  unlockGoldenEgg(rank) {
    this.goldenEgg.rank = rank;
    this.goldenEgg.nextAt = Math.min(this.goldenEgg.nextAt || Infinity, this.scene.time.now + 550);
  }

  unlockMolotovEgg(rank) {
    this.molotovEgg.rank = rank;
    this.molotovEgg.nextAt = Math.min(this.molotovEgg.nextAt || Infinity, this.scene.time.now + 850);
  }

  unlockLightningComb(rank) {
    this.lightningComb.rank = rank;
    this.lightningComb.nextAt = Math.min(this.lightningComb.nextAt || Infinity, this.scene.time.now + 650);
  }

  unlockVoidNest(rank) {
    this.voidNest.rank = rank;
    this.voidNest.nextAt = Math.min(this.voidNest.nextAt || Infinity, this.scene.time.now + 900);
  }

  unlockRocketEgg(rank) {
    this.rocketEgg.rank = rank;
    this.rocketEgg.nextAt = Math.min(this.rocketEgg.nextAt || Infinity, this.scene.time.now + 750);
  }

  unlockLaserComb(rank) {
    this.laserComb.rank = rank;
    this.laserComb.nextAt = Math.min(this.laserComb.nextAt || Infinity, this.scene.time.now + 800);
  }

  findClusterTarget() {
    if (!this.scene.enemies.length) {
      return null;
    }
    let bestEnemy = this.scene.findNearestEnemy();
    let bestScore = -1;
    this.scene.enemies.forEach((enemy) => {
      const score = this.scene.enemies.filter((candidate) => Phaser.Math.Distance.Between(
        enemy.sprite.x,
        enemy.sprite.y,
        candidate.sprite.x,
        candidate.sprite.y
      ) < 150).length;
      if (score > bestScore) {
        bestScore = score;
        bestEnemy = enemy;
      }
    });
    return bestEnemy ? { x: bestEnemy.sprite.x, y: bestEnemy.sprite.y } : null;
  }

  distanceToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    if (dx === 0 && dy === 0) {
      return Phaser.Math.Distance.Between(px, py, ax, ay);
    }
    const t = Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1);
    return Phaser.Math.Distance.Between(px, py, ax + dx * t, ay + dy * t);
  }
}
