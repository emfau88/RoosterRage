import Phaser from 'phaser';
import { RocketProjectile } from '../../entities/RocketProjectile.js';
import { RocketImpactVisual, STAGES, prepareRocketImpactTextures } from '../RocketImpactVisual.js';
import { TimedAbility } from './TimedAbility.js';

export class RocketEggAbility extends TimedAbility {
  constructor(scene) {
    super(scene, 750);
    this.lastSynergyActive = false;
    this.activeImpactVisuals = new Set();
    prepareRocketImpactTextures(scene);
  }

  activate(time) {
    const target = this.scene.findNearestEnemy();
    if (!target) {
      this.nextAt = time + 800;
      return;
    }
    const start = this.scene.player.getMuzzlePosition(36);
    const rank = this.rank;
    const evolved = this.evolved;
    const salvoCount = evolved ? 3 : rank >= 4 ? 2 : 1;
    const availableTargets = this.scene.getTargetableEnemies()
      .filter((enemy) => enemy.sprite.active)
      .sort((a, b) => Phaser.Math.Distance.Squared(start.x, start.y, a.sprite.x, a.sprite.y)
        - Phaser.Math.Distance.Squared(start.x, start.y, b.sprite.x, b.sprite.y));
    const targets = Array.from({ length: salvoCount }, (_, index) => {
      const enemy = availableTargets[index % availableTargets.length] ?? target;
      return { enemy, activationId: enemy.activationId };
    });
    const launchGap = evolved ? 90 : 115;
    targets.forEach(({ enemy, activationId }, index) => {
      const launch = () => {
        if (!this.scene.sys.isActive() || this.scene.gameEnded) return;
        // Enemies are pooled: a living sprite can already belong to a new
        // enemy by the time the next rocket in this salvo launches.
        const rocketTarget = enemy.sprite.active && enemy.activationId === activationId
          && this.scene.getTargetableEnemies().includes(enemy)
          ? enemy : this.scene.findNearestEnemy();
        if (!rocketTarget) return;
        const muzzle = this.scene.player.getMuzzlePosition(36);
        const angle = Phaser.Math.Angle.Between(muzzle.x, muzzle.y, rocketTarget.sprite.x, rocketTarget.sprite.y);
        const offset = (index - (salvoCount - 1) / 2) * 12;
        const projectile = new RocketProjectile(
          this.scene,
          muzzle.x - Math.sin(angle) * offset,
          muzzle.y + Math.cos(angle) * offset,
          rocketTarget,
          rank,
          evolved
        );
        this.lastSynergyActive = projectile.synergyActive;
        this.scene.rocketProjectiles.push(projectile);
        this.scene.audio.play('rocket-launch', { volume: 0.16, cooldown: 75 });
        this.scene.telemetry.addShot(1, this.scene.time.now, this.scene.waveSystem.currentWave,
          evolved ? 'evo-broodstorm' : 'rocket-egg');
      };
      if (index === 0) launch();
      else this.scene.time.delayedCall(index * launchGap, launch);
    });
    this.scene.showShotFeedback(
      Phaser.Math.Angle.Between(start.x, start.y, target.sprite.x, target.sprite.y),
      0
    );
    this.scene.debugStats.specialShots += 1;
    this.nextAt = time + (evolved ? 3900 : Math.max(2800, 5600 - rank * 620));
  }

  createExplosion(x, y, damage, radius, evolved = false, rank = this.rank) {
    this.scene.audio.play('rocket-explosion');
    // The approved animation owns all three timed cluster visuals. Damage below
    // keeps the existing radii, delays and multipliers; no second visual pass.
    const stage = STAGES[evolved ? 4 : Math.max(0, Math.min(3, rank - 1))];
    // Bound transient visuals even if several debug/burst sources fire together.
    // This never suppresses or changes gameplay damage.
    if (this.activeImpactVisuals.size >= 12) this.activeImpactVisuals.values().next().value.destroy();
    const effect = new RocketImpactVisual(this.scene, x, y, { ...stage, radius },
      (finished) => this.activeImpactVisuals.delete(finished));
    this.activeImpactVisuals.add(effect);

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

}
