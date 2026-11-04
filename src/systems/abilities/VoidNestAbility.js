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
    this.scene.audio.play('void-open');
    this.scene.voidZones.filter((activeZone) => activeZone.active).forEach((activeZone) => activeZone.destroy(true));
    const zone = new VoidZone(this.scene, target.x, target.y, this.rank, this.evolved);
    this.lastSynergyActive = zone.synergyActive;
    this.scene.voidZones.push(zone);
    this.nextAt = time + (this.evolved ? 4700 : Math.max(3800, 7600 - this.rank * 800));
  }
}
