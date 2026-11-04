import Phaser from 'phaser';
import { VoidZoneVisual } from '../systems/VoidZoneVisual.js';

const COLLAPSE_MS = 420;
const RANK_CONFIG = {
  1: { radius: 132, damage: 11, life: 4200, pullOuter: 24, pullInner: 110 },
  2: { radius: 150, damage: 15, life: 4800, pullOuter: 28, pullInner: 135 },
  3: { radius: 170, damage: 19, life: 5400, pullOuter: 32, pullInner: 165 },
  4: { radius: 190, damage: 23, life: 6000, pullOuter: 38, pullInner: 205 }
};
const EVOLVED_CONFIG = {
  radius: 225, damage: 28, life: 7200, pullOuter: 44, pullInner: 255
};

export class VoidZone {
  constructor(scene, x, y, rank, evolved = false) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.rank = rank;
    this.evolved = evolved;
    this.renderStyle = 'gravity-field';
    this.visualTier = evolved ? 5 : rank;
    this.synergyActive = scene.molotovEgg.rank > 0;
    const config = evolved ? EVOLVED_CONFIG : RANK_CONFIG[rank] ?? RANK_CONFIG[1];
    const synergyMultiplier = this.synergyActive ? 1.25 : 1;
    this.radius = config.radius;
    this.damage = config.damage;
    this.pullOuter = config.pullOuter * synergyMultiplier;
    this.pullInner = config.pullInner * synergyMultiplier;
    this.pull = this.pullInner;
    this.tickMs = evolved ? 290 : 360;
    this.nextTickAt = 0;
    this.life = config.life;
    this.maxLife = this.life;
    this.age = 0;
    this.tickFlash = 0;
    this.active = true;
    this.collapsing = false;

    this.visual = new VoidZoneVisual(scene, x, y, Phaser.Math.Clamp(rank, 1, 4), evolved, {
      radius: this.radius, maxLife: this.maxLife
    });
  }

  getPullSpeed(distance) {
    const proximity = Phaser.Math.Clamp(1 - distance / this.radius, 0, 1);
    const easedProximity = proximity * proximity * (3 - 2 * proximity);
    return Phaser.Math.Linear(this.pullOuter, this.pullInner, easedProximity);
  }

  registerPull(enemy, delta) {
    const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.sprite.x, enemy.sprite.y);
    if (distance > this.radius || distance <= 5) return;
    const speed = this.getPullSpeed(distance);
    const step = Math.min(speed * (delta / 1000), distance - 5);
    const vector = new Phaser.Math.Vector2(this.x - enemy.sprite.x, this.y - enemy.sprite.y).normalize().scale(step);
    if (!this.scene.pendingVoidPulls) {
      enemy.sprite.x += vector.x;
      enemy.sprite.y += vector.y;
      return;
    }
    const current = this.scene.pendingVoidPulls.get(enemy);
    if (!current || speed > current.priority) {
      this.scene.pendingVoidPulls.set(enemy, { enemy, x: vector.x, y: vector.y, priority: speed });
    }
  }

  update(delta) {
    if (!this.active) return;
    this.age += delta;
    this.life -= delta;
    this.tickFlash = Math.max(0, this.tickFlash - delta / 180);
    if (!this.collapsing && this.life <= COLLAPSE_MS) this.collapsing = true;

    this.scene.enemies.forEach((enemy) => {
      if (enemy.sprite.active) this.registerPull(enemy, delta);
    });
    if (!this.collapsing && this.scene.time.now >= this.nextTickAt) {
      this.nextTickAt = this.scene.time.now + this.tickMs;
      this.tickFlash = 1;
      this.scene.enemies.forEach((enemy) => {
        if (enemy.sprite.active && Phaser.Math.Distance.Between(this.x, this.y, enemy.sprite.x, enemy.sprite.y) <= this.radius) {
          this.scene.damageEnemy(enemy, this.damage, enemy.sprite.x, enemy.sprite.y, {
            source: this.evolved ? 'evo-singularity-nest' : 'void-nest'
          });
        }
      });
    }

    this.visual.draw(this.age, this.life);
    if (this.life <= 0) this.destroy();
  }

  destroy(animate = false) {
    if (!this.active) return;
    this.active = false;
    if (animate) this.visual.finish();
    else this.visual.destroy();
  }
}
