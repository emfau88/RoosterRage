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
    const ring = this.scene.add.circle(target.x, target.y, 32, 0x9b5cff, 0.24)
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
      scale: 0.52 + this.rank * 0.08,
      depth: 6,
      alpha: 0.88
    });
    this.scene.audio.play('void-open');
    const zone = new VoidZone(this.scene, target.x, target.y, this.rank);
    this.lastSynergyActive = zone.synergyActive;
    this.scene.voidZones.push(zone);
    this.nextAt = time + Math.max(3800, 7600 - this.rank * 800);
  }
}
