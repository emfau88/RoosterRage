import Phaser from 'phaser';

const COLLAPSE_MS = 520;
const VISUAL_Y_SCALE = 0.6;
const RANK_CONFIG = {
  1: { radius: 132, damage: 11, life: 4200, pullOuter: 24, pullInner: 110, motes: 5 },
  2: { radius: 150, damage: 15, life: 4800, pullOuter: 28, pullInner: 135, motes: 6 },
  3: { radius: 170, damage: 19, life: 5400, pullOuter: 32, pullInner: 165, motes: 7 },
  4: { radius: 178, damage: 23, life: 6000, pullOuter: 36, pullInner: 190, motes: 8 }
};
const EVOLVED_CONFIG = {
  radius: 225,
  damage: 28,
  life: 7200,
  pullOuter: 42,
  pullInner: 245,
  motes: 10
};

export class VoidZone {
  constructor(scene, x, y, rank, evolved = false) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.rank = rank;
    this.evolved = evolved;
    this.synergyActive = scene.molotovEgg.rank > 0;
    const config = evolved ? EVOLVED_CONFIG : RANK_CONFIG[rank] ?? RANK_CONFIG[1];
    this.radius = config.radius;
    this.damage = config.damage;
    const synergyMultiplier = this.synergyActive ? 1.25 : 1;
    this.pullOuter = config.pullOuter * synergyMultiplier;
    this.pullInner = config.pullInner * synergyMultiplier;
    this.pull = this.pullInner;
    this.tickMs = evolved ? 290 : 360;
    this.nextTickAt = 0;
    this.life = config.life;
    this.maxLife = this.life;
    this.age = 0;
    this.active = true;
    this.collapsing = false;

    this.outer = scene.add.ellipse(
      x,
      y,
      this.radius * 2,
      this.radius * 2 * VISUAL_Y_SCALE,
      evolved ? 0x19082f : 0x25124b,
      evolved ? 0.15 : 0.11
    )
      .setStrokeStyle(evolved ? 2.2 : 1.6, evolved ? 0xc888ff : 0x9b5cff, evolved ? 0.34 : 0.25)
      .setDepth(3);
    this.core = scene.add.ellipse(
      x,
      y,
      this.radius * 0.58,
      this.radius * 0.34,
      0x030108,
      evolved ? 0.82 : 0.72
    ).setDepth(4.2);

    this.portalBaseScaleX = (this.radius * (evolved ? 1.5 : 1.42)) / 256;
    this.portalBaseScaleY = this.portalBaseScaleX * VISUAL_Y_SCALE;
    this.portal = (evolved
      ? scene.add.image(x, y, 'evo-singularity-nest-zone')
      : scene.add.sprite(x, y, 'fx-atlas-v1', 12))
      .setScale(this.portalBaseScaleX, this.portalBaseScaleY)
      .setAlpha(evolved ? 0.7 : 0.62)
      .setDepth(4);
    if (!evolved) {
      this.portal.play('fx-void-open');
      this.portal.once('animationcomplete', () => {
        if (this.active && !this.collapsing) this.portal.setFrame(14);
      });
    }

    this.motes = Array.from({ length: config.motes }, (_, index) => {
      const mote = scene.add.circle(
        x,
        y,
        evolved && index % 3 === 0 ? 3.2 : 2.3,
        index % 2 === 0 ? 0xd9b7ff : 0x9b5cff,
        0.38
      ).setDepth(4.5);
      return {
        sprite: mote,
        phase: (Math.PI * 2 * index) / config.motes,
        offset: index / config.motes,
        speed: 0.00016 + (index % 3) * 0.000018
      };
    });
  }

  getPullSpeed(distance) {
    const proximity = Phaser.Math.Clamp(1 - distance / this.radius, 0, 1);
    const easedProximity = proximity * proximity * (3 - 2 * proximity);
    return Phaser.Math.Linear(this.pullOuter, this.pullInner, easedProximity);
  }

  update(delta) {
    if (!this.active) return;

    this.age += delta;
    this.life -= delta;
    if (!this.collapsing && this.life <= COLLAPSE_MS) {
      this.collapsing = true;
      if (!this.evolved) this.portal.play('fx-void-collapse');
    }

    this.scene.enemies.forEach((enemy) => {
      if (!enemy.sprite.active) return;
      const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.sprite.x, enemy.sprite.y);
      if (distance > this.radius || distance <= 5) return;
      const step = Math.min(this.getPullSpeed(distance) * (delta / 1000), distance - 5);
      const pullVector = new Phaser.Math.Vector2(this.x - enemy.sprite.x, this.y - enemy.sprite.y)
        .normalize()
        .scale(step);
      enemy.sprite.x += pullVector.x;
      enemy.sprite.y += pullVector.y;
    });

    if (!this.collapsing && this.scene.time.now >= this.nextTickAt) {
      this.nextTickAt = this.scene.time.now + this.tickMs;
      this.scene.enemies.forEach((enemy) => {
        if (enemy.sprite.active && Phaser.Math.Distance.Between(this.x, this.y, enemy.sprite.x, enemy.sprite.y) <= this.radius) {
          this.scene.damageEnemy(enemy, this.damage, enemy.sprite.x, enemy.sprite.y, {
            source: this.evolved ? 'evo-singularity-nest' : 'void-nest'
          });
        }
      });
    }

    const exitRatio = this.collapsing
      ? Phaser.Math.Clamp(this.life / COLLAPSE_MS, 0, 1)
      : 1;
    const pulse = 0.98 + Math.sin(this.age * 0.0036) * 0.025;
    this.outer.setScale(pulse).setAlpha(exitRatio * (this.evolved ? 0.15 : 0.11));
    this.core
      .setScale(0.94 + Math.sin(this.age * 0.0065) * 0.055)
      .setAlpha(exitRatio * (this.evolved ? 0.82 : 0.72));
    const portalPulse = 0.98 + Math.sin(this.age * 0.0038) * 0.025;
    this.portal
      .setScale(
        this.portalBaseScaleX * portalPulse,
        this.portalBaseScaleY * portalPulse
      )
      .setAlpha(exitRatio * (this.evolved ? 0.7 : 0.62));

    this.motes.forEach((mote) => {
      const cycle = (mote.offset + this.age * mote.speed) % 1;
      const orbitRadius = this.radius * (0.9 - cycle * 0.68);
      const angle = mote.phase + this.age * 0.0011 + cycle * Math.PI * 1.35;
      mote.sprite
        .setPosition(
          this.x + Math.cos(angle) * orbitRadius,
          this.y + Math.sin(angle) * orbitRadius * VISUAL_Y_SCALE
        )
        .setScale(0.72 + cycle * 0.62)
        .setAlpha(exitRatio * (0.14 + cycle * 0.42));
    });

    if (this.life <= 0) this.destroy();
  }

  destroy() {
    if (!this.active) return;
    this.active = false;
    this.outer.destroy();
    this.core.destroy();
    this.portal.destroy();
    this.motes.forEach((mote) => mote.sprite.destroy());
  }
}
