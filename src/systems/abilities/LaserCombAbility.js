import Phaser from 'phaser';
import { TimedAbility } from './TimedAbility.js';
import { distanceToSegment } from './abilityUtils.js';
import { LaserBeamVisual } from '../CombatEffectVisuals.js';
import { runCombatVisual } from '../TimedCombatVisual.js';

export class LaserCombAbility extends TimedAbility {
  constructor(scene) {
    super(scene, 800);
    this.activeVisuals = new Set();
  }

  activate(time) {
    const target = this.scene.findNearestEnemy();
    if (!target) { this.nextAt = time + 700; return; }
    const rank = this.rank, evolved = this.evolved;
    const start = this.scene.player.getMuzzlePosition(30);
    this.scene.audio.play('laser');
    const baseAngle = Phaser.Math.Angle.Between(start.x, start.y, target.sprite.x, target.sprite.y);
    const offsets = evolved ? [-0.18, 0, 0.18] : rank >= 3 ? [0, 0.09] : [0];
    const timing = evolved ? { charge: 150, hold: 280, fade: 220 }
      : { charge: 100 + rank * 8, hold: 170 + rank * 18, fade: 150 + rank * 15 };
    const contacts = [], visual = new LaserBeamVisual(this.scene);
    const record = runCombatVisual(this.scene, visual, timing.charge + timing.hold + timing.fade,
      age => visual.draw(age, start, baseAngle, rank, evolved, contacts),
      finished => this.activeVisuals.delete(finished));
    this.activeVisuals.add(record);
    record.timers.push(this.scene.time.delayedCall(timing.charge, () => {
      if (!record.active || !this.scene.sys.isActive()) return;
      offsets.forEach(offset => {
        const angle = baseAngle + offset, length = (evolved ? 700 : 520) + rank * 90;
        const end = { x: start.x + Math.cos(angle) * length, y: start.y + Math.sin(angle) * length };
        this.resolveBeamDamage(start, end, angle, rank, evolved, contacts);
      });
    }));
    this.scene.debugStats.specialShots += 1;
    this.scene.telemetry.addShot(offsets.length, time, this.scene.waveSystem.currentWave, evolved ? 'evo-dawn-laser' : 'laser-comb');
    this.nextAt = time + (evolved ? 3900 : Math.max(3000, 6400 - rank * 760));
  }

  resolveBeamDamage(start, end, angle, rank, evolved, contacts = []) {
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
      if (!contacts.some(contact => contact.id === enemy.id)) {
        contacts.push({ id: enemy.id, x: enemy.sprite.x, y: enemy.sprite.y });
      }
      this.scene.damageEnemy(enemy, damage, enemy.sprite.x, enemy.sprite.y, {
        source: evolved ? 'evo-dawn-laser' : 'laser-comb'
      });
    });
  }

}
