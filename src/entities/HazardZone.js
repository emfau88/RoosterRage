import Phaser from 'phaser';
import { MolotovFieldVisual } from '../systems/CombatEffectVisuals.js';

const EXTINGUISH_MS = 440;
const RANK_CONFIG = {
  1: { radius: 90, damage: 10, life: 3000 },
  2: { radius: 108, damage: 12, life: 3400 },
  3: { radius: 124, damage: 14, life: 3800 },
  4: { radius: 112, damage: 16, life: 4000 }
};
const EVOLVED_CONFIG = { radius: 136, damage: 22, life: 4500 };

export class HazardZone {
  constructor(scene, x, y, rank, evolved = false) {
    Object.assign(this, { scene, x, y, rank, evolved });
    this.renderStyle = 'animated-burn-field';
    const config = evolved ? EVOLVED_CONFIG : RANK_CONFIG[rank] ?? RANK_CONFIG[1];
    this.radius = config.radius;
    this.damage = config.damage;
    this.tickMs = evolved ? 320 : 420;
    this.life = this.maxLife = config.life;
    this.nextTickAt = 0;
    this.age = 0;
    this.tickFlash = 0;
    this.active = true;
    this.extinguishing = false;
    this.visual = new MolotovFieldVisual(scene, x, y, RANK_CONFIG[rank] ? rank : 1, evolved);
    this.heatSpots = this.visual.flames;
    this.visual.draw(0);
  }

  update(delta) {
    if (!this.active) return;
    this.age += delta;
    this.life -= delta;
    this.tickFlash = Math.max(0, this.tickFlash - delta / 180);
    if (!this.extinguishing && this.life <= EXTINGUISH_MS) this.extinguishing = true;
    if (!this.extinguishing && this.scene.time.now >= this.nextTickAt) {
      this.nextTickAt = this.scene.time.now + this.tickMs;
      this.tickFlash = 1;
      this.applyDamageTick();
    }
    this.visual.draw(this.age);
    if (this.life <= 0) this.destroy();
  }

  applyDamageTick() {
    this.scene.enemies.forEach((enemy) => {
      if (!enemy.sprite.active) return;
      const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.sprite.x, enemy.sprite.y);
      if (distance > this.radius) return;
      this.scene.damageEnemy(enemy, this.damage, enemy.sprite.x, enemy.sprite.y, {
        source: this.evolved ? 'evo-phoenix-pan' : 'molotov-egg'
      });
      if (enemy.sprite.active) enemy.applyBurn(3000, Math.max(2, Math.round(this.damage * 0.25)), 'molotov-burn');
    });
  }

  showDamagePulse() {
    this.tickFlash = 1;
  }

  destroy() {
    if (!this.active) return;
    this.active = false;
    this.visual.destroy();
  }
}
