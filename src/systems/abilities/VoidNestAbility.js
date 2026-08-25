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
    const openingSize = this.evolved ? 92 : 58 + this.rank * 6;
    const ring = this.scene.add.ellipse(target.x, target.y, openingSize, openingSize * 0.58, 0x9b5cff, 0.08)
      .setStrokeStyle(this.evolved ? 3 : 2, 0xc9a8ff, 0.72)
      .setDepth(8);
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 1.65,
      duration: 240,
      onComplete: () => ring.destroy()
    });
    this.scene.audio.play('void-open');
    this.scene.voidZones.filter((activeZone) => activeZone.active).forEach((activeZone) => activeZone.destroy());
    const zone = new VoidZone(this.scene, target.x, target.y, this.rank, this.evolved);
    this.lastSynergyActive = zone.synergyActive;
    this.scene.voidZones.push(zone);
    this.nextAt = time + (this.evolved ? 4700 : Math.max(3800, 7600 - this.rank * 800));
  }
}
