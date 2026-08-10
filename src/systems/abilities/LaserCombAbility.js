import Phaser from 'phaser';
import { TimedAbility } from './TimedAbility.js';
import { distanceToSegment } from './abilityUtils.js';
import { playEvolutionImpact } from '../EvolutionVisuals.js';

export class LaserCombAbility extends TimedAbility {
  constructor(scene) {
    super(scene, 800);
  }

  activate(time) {
    const target = this.scene.findNearestEnemy();
    if (!target) {
      this.nextAt = time + 700;
      return;
    }
    const start = this.scene.player.getMuzzlePosition(30);
    this.scene.audio.play('laser');
    const baseAngle = Phaser.Math.Angle.Between(start.x, start.y, target.sprite.x, target.sprite.y);
    const offsets = this.evolved ? [-0.18, 0, 0.18] : this.rank >= 3 ? [0, 0.09] : [0];
    const colors = [0x5ad7ff, 0xfff3b0, 0x9b5cff];
    if (this.evolved) {
      const emitter = this.scene.add.image(start.x, start.y, 'evo-dawn-laser-emitter')
        .setDisplaySize(38, 38)
        .setRotation(baseAngle)
        .setDepth(13);
      const emitterScale = emitter.scaleX;
      this.scene.tweens.add({
        targets: emitter,
        alpha: 0,
        scale: emitterScale * 1.18,
        duration: 260,
        onComplete: () => emitter.destroy()
      });
    }
    offsets.forEach((offset, index) => {
      const angle = baseAngle + offset;
      const length = (this.evolved ? 700 : 520) + this.rank * 90;
      const end = {
        x: start.x + Math.cos(angle) * length,
        y: start.y + Math.sin(angle) * length
      };
      const beam = this.scene.add.graphics().setDepth(12);
      beam.lineStyle(this.evolved ? 12 : this.rank >= 4 ? 12 : this.rank >= 2 ? 10 : 8, 0xfff3b0, 0.58);
      beam.lineBetween(start.x, start.y, end.x, end.y);
      beam.lineStyle(this.evolved ? 4 : this.rank >= 4 ? 5 : 3, this.evolved ? colors[index] : 0xff5b25, 0.95);
      beam.lineBetween(start.x, start.y, end.x, end.y);
      this.scene.tweens.add({
        targets: beam,
        alpha: 0,
        duration: this.evolved ? 260 : 180,
        onComplete: () => beam.destroy()
      });
      const damage = (this.evolved ? 26 : 32) + this.rank * 16;
      this.scene.enemies.forEach((enemy) => {
        if (!enemy.sprite.active) {
          return;
        }
        const distance = distanceToSegment(
          enemy.sprite.x,
          enemy.sprite.y,
          start.x,
          start.y,
          end.x,
          end.y
        );
        if (distance <= (this.evolved ? 40 : 32)) {
          if (this.evolved) {
            playEvolutionImpact(this.scene, 'evo-dawn-laser', enemy.sprite.x, enemy.sprite.y + 8, {
              depth: 13
            });
          } else {
            this.scene.playFx('fx-laser-impact', enemy.sprite.x, enemy.sprite.y + 8, {
              scale: 0.34 + this.rank * 0.04,
              depth: 13,
              rotation: angle + Math.PI / 2
            });
          }
          this.scene.damageEnemy(enemy, damage, enemy.sprite.x, enemy.sprite.y, {
            source: this.evolved ? 'evo-dawn-laser' : 'laser-comb'
          });
        }
      });
    });
    this.scene.debugStats.specialShots += 1;
    this.scene.telemetry.addShot(offsets.length, time, this.scene.waveSystem.currentWave, this.evolved ? 'evo-dawn-laser' : 'laser-comb');
    this.nextAt = time + (this.evolved ? 3900 : Math.max(3000, 6400 - this.rank * 760));
  }
}
