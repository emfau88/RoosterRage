import Phaser from 'phaser';
import { TimedAbility } from './TimedAbility.js';

export class GoldenEggAbility extends TimedAbility {
  constructor(scene) {
    super(scene, 550);
  }

  activate(time) {
    const target = this.scene.findNearestEnemy();
    if (!target) {
      this.nextAt = time + 700;
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
      damage: 42 + this.rank * 18,
      speed: 430,
      life: 2300,
      pierce: 2 + this.rank,
      hitRadius: 34,
      bodyRadius: 14,
      scale: 1.15 + this.rank * 0.12,
      trailRadius: 17,
      trailColor: 0xffd35c,
      trailAlpha: 0.28,
      homing: true,
      maxTurnRate: 0.045,
      sfx: 'egg-shot',
      sfxVolume: 0.16,
      source: 'golden-egg'
    });
    this.nextAt = time + Math.max(2400, 5200 - this.rank * 650);
  }
}
