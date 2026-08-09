import Phaser from 'phaser';
import { RocketProjectile } from '../../entities/RocketProjectile.js';
import { TimedAbility } from './TimedAbility.js';

export class RocketEggAbility extends TimedAbility {
  constructor(scene) {
    super(scene, 750);
    this.lastSynergyActive = false;
  }

  activate(time) {
    const target = this.scene.findNearestEnemy();
    if (!target) {
      this.nextAt = time + 800;
      return;
    }
    const start = this.scene.player.getMuzzlePosition(36);
    const projectile = new RocketProjectile(this.scene, start.x, start.y, target, this.rank);
    this.lastSynergyActive = projectile.synergyActive;
    this.scene.rocketProjectiles.push(projectile);
    this.scene.showShotFeedback(
      Phaser.Math.Angle.Between(start.x, start.y, target.sprite.x, target.sprite.y),
      0
    );
    this.scene.audio.play('egg-shot', { volume: 0.16, cooldown: 160 });
    this.scene.debugStats.specialShots += 1;
    this.scene.telemetry.addShot(1, time, this.scene.waveSystem.currentWave, 'rocket-egg');
    this.nextAt = time + Math.max(2800, 5600 - this.rank * 620);
  }

  createExplosion(x, y, damage, radius) {
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
        this.scene.damageEnemy(enemy, damage, enemy.sprite.x, enemy.sprite.y, { source: 'rocket-egg' });
      }
    });
  }
}
