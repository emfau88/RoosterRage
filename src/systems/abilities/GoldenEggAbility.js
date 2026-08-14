import Phaser from 'phaser';
import { TimedAbility } from './TimedAbility.js';

const GOLDEN_EGG_VISUALS = {
  1: {
    texture: 'golden-egg',
    trailRadius: 16,
    trailColor: 0xffd35c,
    trailAlpha: 0.28,
    trailPulse: 0.04,
    trailPulseMs: 340
  },
  2: {
    texture: 'golden-egg-r2',
    trailRadius: 19,
    trailColor: 0xffdf6a,
    trailAlpha: 0.34,
    trailPulse: 0.06,
    trailPulseMs: 315
  },
  3: {
    texture: 'golden-egg-r3',
    trailRadius: 23,
    trailColor: 0xffad2f,
    trailAlpha: 0.4,
    trailPulse: 0.08,
    trailPulseMs: 285
  },
  4: {
    texture: 'golden-egg-r4',
    trailRadius: 28,
    trailColor: 0xffef9f,
    trailAlpha: 0.46,
    trailPulse: 0.1,
    trailPulseMs: 255
  }
};

const SOLAR_SCRAMBLE_VISUAL = {
  texture: 'evo-solar-scramble-projectile',
  trailRadius: 29,
  trailColor: 0xff5b25,
  trailAlpha: 0.48,
  trailPulse: 0.12,
  trailPulseMs: 235
};

export class GoldenEggAbility extends TimedAbility {
  constructor(scene) {
    super(scene, 550);
    this.pendingShowcase = false;
  }

  unlock(rank) {
    const previousRank = this.rank;
    super.unlock(rank);
    if (rank > previousRank) {
      this.pendingShowcase = true;
    }
  }

  evolve(id) {
    super.evolve(id);
    this.pendingShowcase = true;
  }

  activate(time) {
    const target = this.scene.findNearestEnemy();
    if (!target) {
      this.nextAt = time + 700;
      return;
    }
    const count = this.evolved ? 3 : this.rank >= 4 ? 2 : 1;
    const targets = this.getTargets(count, target);
    const visual = this.evolved ? SOLAR_SCRAMBLE_VISUAL : GOLDEN_EGG_VISUALS[this.rank];
    const shotDelay = this.evolved ? 40 : count > 1 ? 65 : 0;
    const spread = this.evolved ? 0.18 : 0.16;
    const showcase = this.pendingShowcase;
    this.pendingShowcase = false;
    for (let index = 0; index < count; index += 1) {
      const fire = () => {
        const configuredTarget = targets[index] ?? target;
        const shotTarget = configuredTarget.sprite.active ? configuredTarget : this.scene.findNearestEnemy();
        if (!shotTarget) return;
        const offset = count === 1 ? 0 : (index - (count - 1) / 2) * spread;
        const shotAngle = Phaser.Math.Angle.Between(
          this.scene.player.sprite.x,
          this.scene.player.sprite.y,
          shotTarget.sprite.x,
          shotTarget.sprite.y
        ) + offset;
        this.scene.spawnSpecialProjectile(shotAngle, shotTarget, {
          texture: visual.texture,
          damage: this.evolved ? 38 + this.rank * 10 : 42 + this.rank * 18,
          speed: 430,
          life: 2300,
          pierce: (this.evolved ? 4 : 2) + this.rank,
          hitRadius: this.evolved ? 42 : 30 + this.rank * 3,
          bodyRadius: 14,
          scale: (this.evolved ? 1.42 : 1.15) + this.rank * 0.12,
          trailRadius: visual.trailRadius,
          trailColor: visual.trailColor,
          trailAlpha: visual.trailAlpha,
          trailPulse: visual.trailPulse,
          trailPulseMs: visual.trailPulseMs,
          trailPhase: index * Math.PI * 0.72,
          visualRank: this.rank,
          homing: true,
          maxTurnRate: 0.045,
          chainCount: !this.evolved && this.rank >= 3 ? 1 : 0,
          chainRadius: 190,
          chainDamageRatio: 0.38,
          sfx: 'egg-launch-ace',
          sfxVolume: 0.16,
          source: this.evolved ? 'evo-solar-scramble' : 'golden-egg'
        });
        this.showLaunchFx(shotAngle, visual, showcase && index === 0);
      };
      if (index === 0) {
        fire();
      } else {
        this.scene.time.delayedCall(index * shotDelay, fire);
      }
    }
    this.nextAt = time + (this.evolved ? 3450 : Math.max(2400, 5200 - this.rank * 650));
  }

  getTargets(count, fallbackTarget) {
    const playerX = this.scene.player.sprite.x;
    const playerY = this.scene.player.sprite.y;
    const targets = this.scene.getTargetableEnemies()
      .filter((enemy) => enemy.sprite.active)
      .sort((a, b) => Phaser.Math.Distance.Squared(playerX, playerY, a.sprite.x, a.sprite.y)
        - Phaser.Math.Distance.Squared(playerX, playerY, b.sprite.x, b.sprite.y))
      .slice(0, count);
    while (targets.length < count) {
      targets.push(fallbackTarget);
    }
    return targets;
  }

  showLaunchFx(angle, visual, showcase) {
    const muzzle = this.scene.player.getMuzzlePosition(49);
    const evolved = this.evolved;
    const flash = this.scene.add.circle(
      muzzle.x,
      muzzle.y,
      evolved ? 16 : 7 + this.rank * 2,
      evolved ? 0xff6a28 : visual.trailColor,
      evolved ? 0.72 : 0.62
    ).setStrokeStyle(evolved ? 4 : 2 + this.rank * 0.35, 0xfff4c4, 0.9).setDepth(7);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 2.1,
      scaleY: 1.45,
      rotation: angle,
      duration: evolved ? 190 : 120 + this.rank * 12,
      ease: 'Quad.Out',
      onComplete: () => flash.destroy()
    });
    if (!showcase) return;
    const ring = this.scene.add.circle(
      this.scene.player.sprite.x,
      this.scene.player.sprite.y,
      evolved ? 34 : 20 + this.rank * 3,
      visual.trailColor,
      0.08
    ).setStrokeStyle(evolved ? 6 : 3 + this.rank * 0.5, 0xfff4c4, 0.86).setDepth(6);
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: evolved ? 2.8 : 2.15 + this.rank * 0.12,
      duration: evolved ? 360 : 240 + this.rank * 28,
      ease: 'Quad.Out',
      onComplete: () => ring.destroy()
    });
  }
}
