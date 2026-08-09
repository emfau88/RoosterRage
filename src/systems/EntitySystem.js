import Phaser from 'phaser';
import { Enemy } from '../entities/Enemy.js';
import { XPOrb } from '../entities/XPOrb.js';

export class EntitySystem {
  constructor(scene, arenaWidth, arenaHeight) {
    this.scene = scene;
    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;
  }

  spawnEnemy(waveConfig) {
    const edge = Phaser.Math.Between(0, 3);
    const margin = 36;
    let x = Phaser.Math.Between(margin, this.arenaWidth - margin);
    let y = Phaser.Math.Between(margin, this.arenaHeight - margin);
    if (edge === 0) y = margin;
    if (edge === 1) x = this.arenaWidth - margin;
    if (edge === 2) y = this.arenaHeight - margin;
    if (edge === 3) x = margin;

    const enemy = new Enemy(this.scene, x, y, waveConfig);
    this.scene.enemies.push(enemy);
    this.scene.enemyGroup.add(enemy.sprite);
    this.scene.telemetry.summary.enemiesSpawned += 1;
    this.scene.telemetry.record('enemySpawned', this.scene.time.now, {
      wave: this.scene.waveSystem.currentWave,
      type: waveConfig.type ?? 'unknown'
    });
    return enemy;
  }

  killEnemy(enemy) {
    this.scene.enemies = this.scene.enemies.filter((item) => item !== enemy);
    if (enemy.type === 'boss') {
      this.scene.clearEnemyProjectiles();
    }
    if (enemy.explodeOnDeath) {
      this.scene.explodeEnemy(enemy);
    } else {
      this.scene.audio.play(enemy.type === 'boss' ? 'rocket-explosion' : 'enemy-pop');
    }
    this.spawnXp(enemy.sprite.x, enemy.sprite.y, enemy.xpValue);
    this.scene.debugStats.kills += 1;
    this.scene.telemetry.addKill(this.scene.time.now, this.scene.waveSystem.currentWave, enemy.type);
    enemy.destroy();
  }

  spawnXp(x, y, value) {
    const orb = new XPOrb(this.scene, x, y, value);
    this.scene.xpOrbs.push(orb);
    this.scene.xpGroup.add(orb.sprite);
    return orb;
  }

  removeOrb(orb) {
    this.scene.xpOrbs = this.scene.xpOrbs.filter((item) => item !== orb);
    orb.destroy();
  }
}
