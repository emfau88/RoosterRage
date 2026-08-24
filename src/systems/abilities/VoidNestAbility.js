import { VoidZone } from '../../entities/VoidZone.js';
import { TimedAbility } from './TimedAbility.js';
import { findClusterTarget } from './abilityUtils.js';

export class VoidNestAbility extends TimedAbility {
  constructor(scene) {
    super(scene, 900);
    this.lastSynergyActive = false;
  }

  activate(time) {
    const target = findClusterTarget(this.scene);
    if (!target) {
      this.nextAt = time + 900;
      return;
    }
    const ring = this.scene.add.ellipse(target.x, target.y, 64, 38, 0x9b5cff, 0.2)
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
      scaleX: 0.52 + this.rank * 0.08,
      scaleY: (0.52 + this.rank * 0.08) * 0.6,
      depth: 6,
      alpha: 0.88
    });
    this.scene.audio.play('void-open');
    const offsets = this.evolved ? [-92, 92] : this.rank >= 4 ? [-68, 68] : [0];
    offsets.forEach((offset) => {
      const zone = new VoidZone(this.scene, target.x + offset, target.y, this.rank, this.evolved);
      this.lastSynergyActive = zone.synergyActive;
      this.scene.voidZones.push(zone);
    });
    this.nextAt = time + (this.evolved ? 4700 : Math.max(3800, 7600 - this.rank * 800));
  }
}
