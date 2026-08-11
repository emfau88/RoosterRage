import Phaser from 'phaser';
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
    const rank = this.rank;
    const evolved = this.evolved;
    const start = this.scene.player.getMuzzlePosition(28);
    const flightMs = Math.max(620, 920 - rank * 70);
    const lead = new Phaser.Math.Vector2(target.velocityX, target.velocityY)
      .scale((flightMs / 1000) * 0.72);
    if (lead.length() > 110) lead.setLength(110);
    const predicted = new Phaser.Math.Vector2(target.x, target.y).add(lead);
    const aimAngle = Phaser.Math.Angle.Between(start.x, start.y, predicted.x, predicted.y);
    const offsets = evolved ? [-68, 68] : rank >= 4 ? [-56, 56] : [0];
    offsets.forEach((offset, index) => {
      const targetX = predicted.x - Math.sin(aimAngle) * offset;
      const targetY = predicted.y + Math.cos(aimAngle) * offset;
      const launch = () => {
        if (!this.scene.sys.isActive()) return;
        this.scene.molotovProjectiles.push(new MolotovEggProjectile(
          this.scene,
          start.x,
          start.y,
          targetX,
          targetY,
          rank,
          evolved
        ));
        this.scene.audio.play('egg-launch-artillery', { volume: 0.14, cooldown: 160 });
      };
      if (index === 0) launch();
      else this.scene.time.delayedCall(250, launch);
    });
    this.nextAt = time + (evolved ? 3900 : Math.max(3200, 6400 - rank * 700));
  }

  createImpact(x, y, rank = this.rank, evolved = this.evolved) {
    this.scene.audio.play('molotov-impact');
    if (evolved) {
      playEvolutionImpact(this.scene, 'evo-phoenix-pan', x, y, {
        diameter: Math.min(126, 96 + rank * 6),
        depth: 8
      });
    } else {
      const impact = this.scene.add.sprite(x, y, 'molotov-v2-sheet', 0)
        .setScale(0.72 + rank * 0.07)
        .setDepth(8)
        .play('molotov-v2-impact');
      impact.once('animationcomplete', () => impact.destroy());
      this.scene.time.delayedCall(650, () => {
        if (impact.active) impact.destroy();
      });
    }
    const flash = this.scene.add.circle(x, y, 18, 0xffd35c, 0.72).setDepth(8);
    const ring = this.scene.add.circle(x, y, 54 + rank * 10, 0xff6a28, 0.16)
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
    this.scene.hazardZones.push(new HazardZone(this.scene, x, y, rank, evolved));
  }
}
