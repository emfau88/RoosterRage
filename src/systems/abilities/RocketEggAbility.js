import Phaser from 'phaser';
import { RocketProjectile } from '../../entities/RocketProjectile.js';
import { TimedAbility } from './TimedAbility.js';

export class RocketEggAbility extends TimedAbility {
  constructor(scene) {
    super(scene, 750);
    this.lastSynergyActive = false;
    this.activeImpactVisuals = new Set();
  }

  activate(time) {
    const target = this.scene.findNearestEnemy();
    if (!target) {
      this.nextAt = time + 800;
      return;
    }
    const start = this.scene.player.getMuzzlePosition(36);
    const availableTargets = this.scene.getTargetableEnemies()
      .sort((a, b) => Phaser.Math.Distance.Squared(start.x, start.y, a.sprite.x, a.sprite.y)
        - Phaser.Math.Distance.Squared(start.x, start.y, b.sprite.x, b.sprite.y));
    const targets = this.evolved
      ? availableTargets.slice(0, 3)
      : this.rank >= 4
        ? availableTargets.slice(0, 2)
        : [target];
    const launchGap = this.evolved ? 90 : 115;
    targets.forEach((rocketTarget, index) => {
      this.scene.time.delayedCall(index * launchGap, () => {
        if (!this.scene.sys.isActive()) return;
        const projectile = new RocketProjectile(
          this.scene,
          start.x + (index - (targets.length - 1) / 2) * 18,
          start.y,
          rocketTarget,
          this.rank,
          this.evolved
        );
        this.lastSynergyActive = projectile.synergyActive;
        this.scene.rocketProjectiles.push(projectile);
        this.scene.audio.play('rocket-launch', { volume: 0.16, cooldown: 75 });
      });
    });
    this.scene.showShotFeedback(
      Phaser.Math.Angle.Between(start.x, start.y, target.sprite.x, target.sprite.y),
      0
    );
    this.scene.debugStats.specialShots += 1;
    this.scene.telemetry.addShot(
      targets.length,
      time,
      this.scene.waveSystem.currentWave,
      this.evolved ? 'evo-broodstorm' : 'rocket-egg'
    );
    this.nextAt = time + (this.evolved ? 3900 : Math.max(2800, 5600 - this.rank * 620));
  }

  createExplosion(x, y, damage, radius, evolved = false, rank = this.rank) {
    this.scene.audio.play('rocket-explosion');
    const texture = evolved ? 'rocket-impact-evo' : `rocket-impact-r${rank}`;
    const duration = evolved ? 440 : 240 + rank * 38;
    this.showImpact(x, y, radius, texture, duration, evolved ? 1 : 0.94);

    this.scene.enemies.forEach((enemy) => {
      if (enemy.sprite.active && Phaser.Math.Distance.Between(x, y, enemy.sprite.x, enemy.sprite.y) <= radius) {
        this.scene.damageEnemy(enemy, damage, enemy.sprite.x, enemy.sprite.y, {
          source: evolved ? 'evo-broodstorm' : 'rocket-egg'
        });
      }
    });

    if (!evolved && rank >= 3) {
      for (let index = 0; index < 3; index += 1) {
        this.scene.time.delayedCall(70 + index * 72, () => {
          if (!this.scene.sys.isActive()) return;
          const angle = (Math.PI * 2 * index) / 3 - Math.PI / 2;
          const clusterX = x + Math.cos(angle) * radius * 0.52;
          const clusterY = y + Math.sin(angle) * radius * 0.4;
          const clusterRadius = radius * 0.4;
          this.showImpact(
            clusterX,
            clusterY,
            clusterRadius,
            'rocket-impact-r1',
            230,
            0.82,
            false
          );
          this.scene.enemies.forEach((enemy) => {
            if (
              enemy.sprite.active
              && Phaser.Math.Distance.Between(clusterX, clusterY, enemy.sprite.x, enemy.sprite.y) <= clusterRadius
            ) {
              this.scene.damageEnemy(enemy, Math.round(damage * 0.24), enemy.sprite.x, enemy.sprite.y, {
                source: 'rocket-egg:cluster'
              });
            }
          });
        });
      }
    }
  }

  showImpact(x, y, radius, texture, duration, alpha, showShockwave = true) {
    const impact = this.trackImpact(this.scene.add.image(x, y, texture)
      .setDisplaySize(radius * 2.16, radius * 1.34)
      .setAlpha(alpha)
      .setDepth(11));
    const baseScaleX = impact.scaleX;
    const baseScaleY = impact.scaleY;
    impact.setScale(baseScaleX * 0.7, baseScaleY * 0.7);
    this.scene.tweens.add({
      targets: impact,
      scaleX: baseScaleX * 1.04,
      scaleY: baseScaleY * 1.04,
      alpha: 0,
      duration,
      ease: 'Cubic.Out',
      onComplete: () => this.destroyImpact(impact)
    });
    if (!showShockwave) return;

    const shockwave = this.scene.add.ellipse(
      x,
      y + radius * 0.04,
      radius * 1.32,
      radius * 0.62,
      0xff8a28,
      0.08
    )
      .setStrokeStyle(2, 0xffd878, 0.34)
      .setDepth(9.5);
    this.scene.tweens.add({
      targets: shockwave,
      alpha: 0,
      scaleX: 1.58,
      scaleY: 1.4,
      duration: Math.min(duration, 310),
      ease: 'Sine.Out',
      onComplete: () => shockwave.destroy()
    });
  }

  trackImpact(impact) {
    this.activeImpactVisuals.add(impact);
    return impact;
  }

  destroyImpact(impact) {
    this.activeImpactVisuals.delete(impact);
    if (impact?.active) impact.destroy();
  }
}
