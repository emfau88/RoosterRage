import Phaser from 'phaser';
import { TimedAbility } from './TimedAbility.js';
import { distanceToSegment } from './abilityUtils.js';
import { playEvolutionImpact } from '../EvolutionVisuals.js';

export class LaserCombAbility extends TimedAbility {
  constructor(scene) {
    super(scene, 800);
    this.activeVisuals = new Set();
  }

  activate(time) {
    const target = this.scene.findNearestEnemy();
    if (!target) {
      this.nextAt = time + 700;
      return;
    }
    const rank = this.rank;
    const evolved = this.evolved;
    const start = this.scene.player.getMuzzlePosition(30);
    this.scene.audio.play('laser');
    const baseAngle = Phaser.Math.Angle.Between(start.x, start.y, target.sprite.x, target.sprite.y);
    const offsets = evolved ? [-0.18, 0, 0.18] : rank >= 3 ? [0, 0.09] : [0];
    const colors = [0x5ad7ff, 0xfff3b0, 0x9b5cff];
    const rankColors = [0xff5b25, 0xff5b25, 0xff8b2e, 0xffc247, 0xfff3b0];
    const rankColor = rankColors[rank] ?? rankColors[1];
    const timing = evolved
      ? { charge: 150, hold: 280, fade: 220 }
      : { charge: 100 + rank * 8, hold: 170 + rank * 18, fade: 150 + rank * 15 };
    if (evolved) {
      const emitter = this.trackVisual(this.scene.add.image(start.x, start.y, 'evo-dawn-laser-emitter')
        .setDisplaySize(38, 38)
        .setRotation(baseAngle)
        .setDepth(13));
      const emitterScale = emitter.scaleX;
      this.scene.tweens.add({
        targets: emitter,
        scale: emitterScale * 1.14,
        duration: timing.charge,
        yoyo: true
      });
      this.scene.time.delayedCall(timing.charge + timing.hold, () => {
        if (!emitter.active) return;
        this.scene.tweens.add({
          targets: emitter,
          alpha: 0,
          duration: timing.fade,
          onComplete: () => this.destroyVisual(emitter)
        });
      });
    }
    offsets.forEach((offset, index) => {
      const angle = baseAngle + offset;
      const length = (evolved ? 700 : 520) + rank * 90;
      const end = {
        x: start.x + Math.cos(angle) * length,
        y: start.y + Math.sin(angle) * length
      };
      const charge = this.trackVisual(this.scene.add.graphics().setDepth(11));
      charge.lineStyle(evolved ? 4 : 3, evolved ? colors[index] : rankColor, 0.28 + rank * 0.035);
      charge.lineBetween(start.x, start.y, end.x, end.y);
      charge.setAlpha(0.28);
      this.scene.tweens.add({
        targets: charge,
        alpha: 0.82,
        duration: timing.charge
      });
      this.scene.time.delayedCall(timing.charge, () => {
        this.destroyVisual(charge);
        if (!this.scene.sys.isActive()) return;
        const beam = this.trackVisual(this.scene.add.graphics().setDepth(12));
        beam.lineStyle(
          evolved ? 12 : rank >= 4 ? 12 : rank >= 2 ? 10 : 8,
          0xfff3b0,
          evolved ? 0.68 : 0.5 + rank * 0.055
        );
        beam.lineBetween(start.x, start.y, end.x, end.y);
        beam.lineStyle(
          evolved ? 4 : rank >= 4 ? 5 : 3,
          evolved ? colors[index] : rankColor,
          Math.min(1, 0.88 + rank * 0.03)
        );
        beam.lineBetween(start.x, start.y, end.x, end.y);
        this.resolveBeamDamage(start, end, angle, rank, evolved);
        this.scene.time.delayedCall(timing.hold, () => {
          if (!beam.active) return;
          this.scene.tweens.add({
            targets: beam,
            alpha: 0,
            duration: timing.fade,
            onComplete: () => this.destroyVisual(beam)
          });
        });
      });
    });
    this.scene.debugStats.specialShots += 1;
    this.scene.telemetry.addShot(offsets.length, time, this.scene.waveSystem.currentWave, evolved ? 'evo-dawn-laser' : 'laser-comb');
    this.nextAt = time + (evolved ? 3900 : Math.max(3000, 6400 - rank * 760));
  }

  resolveBeamDamage(start, end, angle, rank, evolved) {
    const damage = (evolved ? 26 : 32) + rank * 16;
    this.scene.enemies.forEach((enemy) => {
      if (!enemy.sprite.active) return;
      const distance = distanceToSegment(
        enemy.sprite.x,
        enemy.sprite.y,
        start.x,
        start.y,
        end.x,
        end.y
      );
      if (distance > (evolved ? 40 : 32)) return;
      if (evolved) {
        playEvolutionImpact(this.scene, 'evo-dawn-laser', enemy.sprite.x, enemy.sprite.y + 8, {
          depth: 13
        });
      } else {
        this.scene.playFx('fx-laser-impact', enemy.sprite.x, enemy.sprite.y + 8, {
          scale: 0.34 + rank * 0.04,
          depth: 13,
          rotation: angle + Math.PI / 2
        });
      }
      this.scene.damageEnemy(enemy, damage, enemy.sprite.x, enemy.sprite.y, {
        source: evolved ? 'evo-dawn-laser' : 'laser-comb'
      });
    });
  }

  trackVisual(visual) {
    this.activeVisuals.add(visual);
    return visual;
  }

  destroyVisual(visual) {
    this.activeVisuals.delete(visual);
    if (visual?.active) visual.destroy();
  }
}
