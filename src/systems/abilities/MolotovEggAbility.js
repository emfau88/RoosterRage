import Phaser from 'phaser';
import { HazardZone } from '../../entities/HazardZone.js';
import { MolotovEggProjectile } from '../../entities/MolotovEggProjectile.js';
import { TimedAbility } from './TimedAbility.js';
import { findClusterTarget } from './abilityUtils.js';

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
    const flightMs = evolved ? 440 : Math.max(470, 690 - rank * 55);
    const lead = new Phaser.Math.Vector2(target.velocityX, target.velocityY)
      .scale((flightMs / 1000) * 0.9);
    if (lead.length() > 110) lead.setLength(110);
    const predicted = new Phaser.Math.Vector2(target.x, target.y).add(lead);
    const aimAngle = Phaser.Math.Angle.Between(start.x, start.y, predicted.x, predicted.y);
    const offsets = evolved ? [-112, 112] : rank >= 4 ? [-92, 92] : [0];
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
      else this.scene.time.delayedCall(180, launch);
    });
    this.nextAt = time + (evolved ? 3900 : Math.max(3200, 6400 - rank * 700));
  }

  createImpact(x, y, rank = this.rank, evolved = this.evolved) {
    this.scene.audio.play('molotov-impact');
    const ignitionScale = evolved ? 0.74 : 0.48 + rank * 0.055;
    const ignition = this.scene.add.image(x, y, 'molotov-ignition')
      .setScale(ignitionScale * 0.45)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(8);
    const embersScale = evolved ? 1.12 : 0.68 + rank * 0.08;
    const embers = this.scene.add.image(x, y, 'molotov-embers')
      .setScale(embersScale)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(evolved ? 0.7 : 0.5)
      .setDepth(7.8);
    this.scene.tweens.add({
      targets: ignition,
      alpha: 0,
      scaleX: ignitionScale,
      scaleY: ignitionScale,
      duration: evolved ? 260 : 220,
      ease: 'Quad.Out',
      onComplete: () => ignition.destroy()
    });
    this.scene.tweens.add({
      targets: embers,
      alpha: 0,
      scaleX: embersScale * 1.24,
      scaleY: embersScale * 0.96,
      duration: evolved ? 360 : 300,
      ease: 'Sine.Out',
      onComplete: () => embers.destroy()
    });
    this.scene.hazardZones.push(new HazardZone(this.scene, x, y, rank, evolved));
  }
}
