import Phaser from 'phaser';
import { LightningBolt } from '../../entities/LightningBolt.js';
import { TimedAbility } from './TimedAbility.js';

export class LightningCombAbility extends TimedAbility {
  constructor(scene) {
    super(scene, 650);
  }

  activate(time) {
    const sorted = [...this.scene.enemies]
      .filter((enemy) => enemy.sprite.active)
      .sort((a, b) => Phaser.Math.Distance.Squared(this.scene.player.sprite.x, this.scene.player.sprite.y, a.sprite.x, a.sprite.y)
        - Phaser.Math.Distance.Squared(this.scene.player.sprite.x, this.scene.player.sprite.y, b.sprite.x, b.sprite.y));
    if (!sorted.length) {
      this.nextAt = time + 700;
      return;
    }
    const targets = sorted.slice(0, Math.min(sorted.length, 2 + this.rank));
    this.scene.lightningBolts.push(new LightningBolt(this.scene, targets, this.rank));
    this.scene.audio.play('lightning');
    targets.forEach((enemy) => {
      this.scene.playFx('fx-lightning-impact', enemy.sprite.x, enemy.sprite.y + 10, {
        scale: 0.38 + this.rank * 0.04,
        depth: 12
      });
    });
    this.scene.debugStats.specialShots += 1;
    this.scene.telemetry.addShot(1, time, this.scene.waveSystem.currentWave);
    this.nextAt = time + Math.max(2600, 5200 - this.rank * 650);
  }
}
