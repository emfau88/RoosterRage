import Phaser from 'phaser';
import { LightningBolt } from '../../entities/LightningBolt.js';
import { TimedAbility } from './TimedAbility.js';
import { playEvolutionImpact } from '../EvolutionVisuals.js';

export class LightningCombAbility extends TimedAbility {
  constructor(scene) {
    super(scene, 650);
    this.lastSynergyActive = false;
  }

  activate(time) {
    const sorted = this.scene.getTargetableEnemies()
      .sort((a, b) => Phaser.Math.Distance.Squared(this.scene.player.sprite.x, this.scene.player.sprite.y, a.sprite.x, a.sprite.y)
        - Phaser.Math.Distance.Squared(this.scene.player.sprite.x, this.scene.player.sprite.y, b.sprite.x, b.sprite.y));
    if (!sorted.length) {
      this.nextAt = time + 700;
      return;
    }
    this.lastSynergyActive = this.scene.orbitEggs.length > 0;
    const targetCount = this.evolved ? 10 : 2 + this.rank + (this.lastSynergyActive ? 1 : 0);
    const targets = sorted.slice(0, Math.min(sorted.length, targetCount));
    this.scene.lightningBolts.push(new LightningBolt(
      this.scene,
      targets,
      this.rank,
      this.lastSynergyActive,
      this.evolved
    ));
    this.scene.audio.play('lightning');
    targets.forEach((enemy) => {
      if (this.evolved) {
        playEvolutionImpact(this.scene, 'evo-thunder-roost', enemy.sprite.x, enemy.sprite.y + 10);
      } else {
        this.scene.playFx('fx-lightning-impact', enemy.sprite.x, enemy.sprite.y + 10, {
          scale: 0.38 + this.rank * 0.04,
          depth: 12
        });
      }
    });
    this.scene.debugStats.specialShots += 1;
    this.scene.telemetry.addShot(1, time, this.scene.waveSystem.currentWave, this.evolved ? 'evo-thunder-roost' : 'lightning-comb');
    this.nextAt = time + (this.evolved ? 2800 : Math.max(2600, 5200 - this.rank * 650));
  }
}
