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
    const count = this.evolved ? 3 : this.rank >= 4 ? 2 : 1;
    for (let index = 0; index < count; index += 1) {
      const offset = count === 1 ? 0 : (index - 1) * 0.18;
      this.scene.spawnSpecialProjectile(angle + offset, target, {
      texture: this.evolved ? 'evo-solar-scramble-projectile' : 'golden-egg',
      damage: this.evolved ? 38 + this.rank * 10 : 42 + this.rank * 18,
      speed: 430,
      life: 2300,
      pierce: (this.evolved ? 4 : 2) + this.rank,
      hitRadius: this.evolved ? 42 : 30 + this.rank * 3,
      bodyRadius: 14,
      scale: (this.evolved ? 1.42 : 1.15) + this.rank * 0.12,
      trailRadius: this.evolved ? 23 : 14 + this.rank * 2,
      trailColor: this.evolved ? 0xff5b25 : 0xffd35c,
      trailAlpha: this.evolved ? 0.42 : 0.28,
      homing: true,
      maxTurnRate: 0.045,
      chainCount: !this.evolved && this.rank >= 3 ? 1 : 0,
      chainRadius: 190,
      chainDamageRatio: 0.38,
      sfx: 'egg-launch-ace',
      sfxVolume: 0.16,
      source: this.evolved ? 'evo-solar-scramble' : 'golden-egg'
      });
    }
    this.nextAt = time + (this.evolved ? 3450 : Math.max(2400, 5200 - this.rank * 650));
  }
}
