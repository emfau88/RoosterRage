import Phaser from 'phaser';

const COLLAPSE_MS = 420;
const VISUAL_Y_SCALE = 0.58;
const RANK_CONFIG = {
  1: { radius: 132, damage: 11, life: 4200, pullOuter: 24, pullInner: 110, motes: 4, rings: 0, moteLength: 1 },
  2: { radius: 150, damage: 15, life: 4800, pullOuter: 28, pullInner: 135, motes: 5, rings: 1, moteLength: 1.08 },
  3: { radius: 170, damage: 19, life: 5400, pullOuter: 32, pullInner: 165, motes: 6, rings: 1, moteLength: 1.3 },
  4: { radius: 190, damage: 23, life: 6000, pullOuter: 38, pullInner: 205, motes: 7, rings: 2, moteLength: 1.5 }
};
const EVOLVED_CONFIG = {
  radius: 225, damage: 28, life: 7200, pullOuter: 44, pullInner: 255, motes: 8, rings: 2, moteLength: 1.8
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

    this.outer = scene.add.ellipse(x, y, this.radius * 2, this.radius * 2 * VISUAL_Y_SCALE,
      evolved ? 0x19082f : 0x25124b, 0.55)
      .setStrokeStyle(evolved ? 1.8 : 1.3, evolved ? 0xc888ff : 0x9b5cff, 1)
      .setDepth(3);
    this.core = scene.add.ellipse(x, y, this.radius * 0.32, this.radius * 0.18, 0x020106, 1)
      .setStrokeStyle(evolved ? 2.2 : 1.6, evolved ? 0xe0b7ff : 0x9b5cff, evolved ? 0.72 : 0.56)
      .setDepth(4.2);
    this.portal = scene.add.ellipse(x, y, this.radius * 0.52, this.radius * 0.3,
      evolved ? 0xc888ff : 0x9b5cff, 0)
      .setStrokeStyle(evolved ? 3 : 2, evolved ? 0xe0b7ff : 0xa66cff, 1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(4.1);
    this.accentRings = Array.from({ length: config.rings }, (_, index) => ({
      sprite: scene.add.ellipse(
        x,
        y,
        this.radius * (0.68 + index * 0.18),
        this.radius * (0.25 + index * 0.06),
        evolved ? 0xe0b7ff : 0xa66cff,
        0
      )
        .setStrokeStyle(evolved ? 1.8 : 1.2, evolved ? 0xe0b7ff : 0xa66cff, 1)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(4.05),
      baseRotation: index % 2 === 0 ? -0.12 : 0.12,
      direction: index % 2 === 0 ? 1 : -1
    }));
    this.motes = Array.from({ length: config.motes }, (_, index) => ({
      sprite: scene.add.ellipse(x, y, (evolved && index % 3 === 0 ? 6 : 4.5) * config.moteLength,
        evolved && index % 3 === 0 ? 2.8 : 2.1,
        index % 2 === 0 ? 0xd9b7ff : 0x9b5cff, 1).setDepth(4.5),
      phase: (Math.PI * 2 * index) / config.motes,
      offset: index / config.motes,
      speed: 0.00018 + (index % 3) * 0.00002
    }));
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

    const exitRatio = this.collapsing ? Phaser.Math.Clamp(this.life / COLLAPSE_MS, 0, 1) : 1;
    const pulse = 1 + Math.sin(this.age * 0.0032) * 0.018;
    this.outer.setScale(pulse)
      .setAlpha(exitRatio * ((this.evolved ? 0.15 : 0.12) + this.tickFlash * 0.025));
    this.core.setScale(0.96 + Math.sin(this.age * 0.0054) * 0.04)
      .setAlpha(exitRatio * (this.evolved ? 0.94 : 0.9));
    this.portal.setScale(0.98 + Math.sin(this.age * 0.0043) * 0.025)
      .setAlpha(exitRatio * ((this.evolved ? 0.46 : 0.34) + this.tickFlash * 0.08));
    this.accentRings.forEach((ring, index) => {
      ring.sprite
        .setRotation(ring.baseRotation + this.age * 0.00005 * ring.direction)
        .setAlpha(exitRatio * ((this.evolved ? 0.24 : 0.13 + this.rank * 0.018)
          + this.tickFlash * (0.04 + this.visualTier * 0.012)))
        .setScale(1 + Math.sin(this.age * 0.0024 + index) * 0.018);
    });
    this.motes.forEach((mote) => {
      const cycle = (mote.offset + this.age * mote.speed) % 1;
      const orbitRadius = this.radius * (0.92 - cycle * 0.78);
      const angle = mote.phase + this.age * 0.00065 + cycle * Math.PI * 1.25;
      mote.sprite.setPosition(this.x + Math.cos(angle) * orbitRadius,
        this.y + Math.sin(angle) * orbitRadius * VISUAL_Y_SCALE)
        .setRotation(angle + Math.PI)
        .setScale(0.72 + cycle * 0.5)
        .setAlpha(exitRatio * (0.1 + cycle * 0.34));
    });
    if (this.life <= 0) this.destroy();
  }

  destroy() {
    if (!this.active) return;
    this.active = false;
    this.outer.destroy();
    this.core.destroy();
    this.portal.destroy();
    this.accentRings.forEach((ring) => ring.sprite.destroy());
    this.motes.forEach((mote) => mote.sprite.destroy());
  }
}
