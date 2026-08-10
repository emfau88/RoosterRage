import { HazardZone } from '../../entities/HazardZone.js';
import { MolotovEggProjectile } from '../../entities/MolotovEggProjectile.js';
import { TimedAbility } from './TimedAbility.js';
import { findClusterTarget } from './abilityUtils.js';
import { playEvolutionImpact } from '../EvolutionVisuals.js';

export class MolotovEggAbility extends TimedAbility {
  constructor(scene) {
    super(scene, 850);
  }

  activate(time) {
    const target = findClusterTarget(this.scene);
    if (!target) {
      this.nextAt = time + 900;
      return;
    }
    const start = this.scene.player.getMuzzlePosition(28);
    const offsets = this.evolved ? [-62, 62] : this.rank >= 4 ? [-46, 46] : [0];
    offsets.forEach((offset) => {
      this.scene.molotovProjectiles.push(new MolotovEggProjectile(
        this.scene,
        start.x,
        start.y,
        target.x + offset,
        target.y,
        this.rank,
        this.evolved
      ));
    });
    this.scene.audio.play('egg-launch-artillery', { volume: 0.14, cooldown: 160 });
    this.nextAt = time + (this.evolved ? 3900 : Math.max(3200, 6400 - this.rank * 700));
  }

  createImpact(x, y) {
    this.scene.audio.play('molotov-impact');
    if (this.evolved) {
      playEvolutionImpact(this.scene, 'evo-phoenix-pan', x, y, {
        diameter: Math.min(126, 96 + this.rank * 6),
        depth: 8
      });
    } else {
      this.scene.playFx('fx-molotov-fire', x, y, {
        scale: 0.62 + this.rank * 0.08,
        depth: 8,
        alpha: 0.92
      });
    }
    const flash = this.scene.add.circle(x, y, 18, 0xffd35c, 0.72).setDepth(8);
    const ring = this.scene.add.circle(x, y, 54 + this.rank * 10, 0xff6a28, 0.16)
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
    this.scene.hazardZones.push(new HazardZone(this.scene, x, y, this.rank, this.evolved));
  }
}
