import Phaser from 'phaser';

const EXTINGUISH_MS = 440;
const RANK_CONFIG = {
  1: { radius: 90, damage: 10, life: 3000, flameCount: 3 },
  2: { radius: 108, damage: 12, life: 3400, flameCount: 5 },
  3: { radius: 124, damage: 14, life: 3800, flameCount: 7 },
  4: { radius: 112, damage: 16, life: 4000, flameCount: 6 }
};
const EVOLVED_CONFIG = { radius: 136, damage: 22, life: 4500, flameCount: 9 };

const FLAME_LAYOUT = [
  { x: -0.43, y: 0.08, texture: 'molotov-flame-small', size: 0.86, phase: 0.2 },
  { x: 0, y: -0.12, texture: 'molotov-flame-medium', size: 0.82, phase: 2.1 },
  { x: 0.43, y: 0.1, texture: 'molotov-flame-small', size: 0.9, phase: 4.2 },
  { x: -0.22, y: -0.27, texture: 'molotov-flame-small', size: 0.76, phase: 1.1 },
  { x: 0.22, y: 0.27, texture: 'molotov-flame-medium', size: 0.72, phase: 3.4 },
  { x: -0.53, y: 0.3, texture: 'molotov-flame-medium', size: 0.68, phase: 5.2 },
  { x: 0.52, y: -0.25, texture: 'molotov-flame-small', size: 0.74, phase: 2.8 },
  { x: 0, y: 0.32, texture: 'molotov-flame-large', size: 0.64, phase: 0.8 },
  { x: 0, y: -0.38, texture: 'molotov-flame-medium', size: 0.7, phase: 4.8 }
];

const BASE_FLAME_SIZE = {
  'molotov-flame-small': 34,
  'molotov-flame-medium': 42,
  'molotov-flame-large': 49
};

export class HazardZone {
  constructor(scene, x, y, rank, evolved = false) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.rank = rank;
    this.evolved = evolved;
    const config = evolved ? EVOLVED_CONFIG : RANK_CONFIG[rank] ?? RANK_CONFIG[1];
    this.radius = config.radius;
    this.damage = config.damage;
    this.tickMs = evolved ? 320 : 420;
    this.life = config.life;
    this.maxLife = this.life;
    this.nextTickAt = 0;
    this.nextPulseFxAt = 0;
    this.age = 0;
    this.active = true;
    this.extinguishing = false;
    this.groundTexture = evolved ? 'molotov-ground-evo' : `molotov-ground-r${rank}`;

    this.glow = scene.add.ellipse(
      x,
      y + 2,
      this.radius * 1.9,
      this.radius * 1.08,
      evolved ? 0xffb43c : 0xff6828,
      evolved ? 0.075 : 0.05
    ).setDepth(3);
    this.groundSprite = scene.add.image(x, y, this.groundTexture)
      .setDisplaySize(this.radius * 2.08, this.radius * 1.3)
      .setDepth(3.1)
      .setAlpha(0.96);
    this.embers = scene.add.image(x, y, 'molotov-embers')
      .setDisplaySize(this.radius * 1.5, this.radius * 0.82)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(evolved ? 0.22 : 0.13)
      .setDepth(3.3);
    this.flames = FLAME_LAYOUT.slice(0, config.flameCount).map((placement, index) => {
      const size = BASE_FLAME_SIZE[placement.texture]
        * placement.size
        * (1 + Math.max(0, rank - 1) * 0.035)
        * (evolved ? 1.08 : 1);
      const flame = scene.add.image(
        x + placement.x * this.radius,
        y + placement.y * this.radius * 0.58,
        placement.texture
      )
        .setScale(size / 128)
        .setOrigin(0.5, 0.82)
        .setDepth(4 + placement.y * 0.1)
        .setAlpha(0);
      if (evolved && index % 3 === 1) flame.setTint(0xfff1b5);
      return {
        sprite: flame,
        phase: placement.phase,
        baseScale: size / 128,
        baseRotation: (index % 2 === 0 ? -1 : 1) * 0.018
      };
    });
    this.smoke = scene.add.image(x, y - 8, 'molotov-smoke')
      .setDisplaySize(this.radius * 1.15, this.radius * 0.72)
      .setAlpha(0)
      .setDepth(4.5);
    this.smokeBaseScaleX = this.smoke.scaleX;
    this.smokeBaseScaleY = this.smoke.scaleY;
  }

  update(delta) {
    if (!this.active) return;
    this.age += delta;
    this.life -= delta;
    if (!this.extinguishing && this.life <= EXTINGUISH_MS) this.extinguishing = true;

    if (!this.extinguishing && this.scene.time.now >= this.nextTickAt) {
      this.nextTickAt = this.scene.time.now + this.tickMs;
      this.applyDamageTick();
      if (this.rank >= 3 && this.scene.time.now >= this.nextPulseFxAt) {
        this.nextPulseFxAt = this.scene.time.now + this.tickMs * 2;
        this.showDamagePulse();
      }
    }

    const fadeIn = Phaser.Math.Clamp(this.age / 180, 0, 1);
    const extinguishFade = this.extinguishing
      ? Phaser.Math.Clamp(this.life / EXTINGUISH_MS, 0, 1)
      : 1;
    const visibility = fadeIn * extinguishFade;
    this.groundSprite.setAlpha(this.extinguishing ? 0.34 + extinguishFade * 0.62 : 0.96);
    this.glow.setAlpha((this.evolved ? 0.075 : 0.05) * visibility);
    this.embers.setAlpha((this.evolved ? 0.22 : 0.13)
      * visibility
      * (0.9 + Math.sin(this.age * 0.0031) * 0.1));
    this.flames.forEach((flame) => {
      const sway = Math.sin(this.age * 0.0027 + flame.phase);
      const lick = Math.sin(this.age * 0.0041 + flame.phase * 1.7);
      flame.sprite
        .setScale(
          flame.baseScale * (1 + sway * 0.035),
          flame.baseScale * (1 + lick * 0.09)
        )
        .setRotation(flame.baseRotation + sway * 0.035)
        .setAlpha(visibility * (0.88 + lick * 0.055));
    });
    if (this.extinguishing) {
      const extinguishProgress = 1 - extinguishFade;
      this.smoke
        .setAlpha(Math.sin(extinguishProgress * Math.PI) * 0.34)
        .setScale(
          this.smokeBaseScaleX * (0.86 + extinguishProgress * 0.18),
          this.smokeBaseScaleY * (0.86 + extinguishProgress * 0.18)
        );
    }
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
      if (enemy.sprite.active) {
        enemy.applyBurn(3000, Math.max(2, Math.round(this.damage * 0.25)));
      }
    });
  }

  showDamagePulse() {
    const pulse = this.scene.add.image(this.x, this.y, 'molotov-embers')
      .setDisplaySize(this.radius * 1.15, this.radius * 0.64)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(this.evolved ? 0.34 : 0.24)
      .setDepth(4.4);
    this.scene.tweens.add({
      targets: pulse,
      alpha: 0,
      scale: 1.22,
      duration: 320,
      ease: 'Sine.Out',
      onComplete: () => pulse.destroy()
    });
  }

  destroy() {
    if (!this.active) return;
    this.active = false;
    this.glow.destroy();
    this.groundSprite.destroy();
    this.embers.destroy();
    this.flames.forEach((flame) => flame.sprite.destroy());
    this.smoke.destroy();
  }
}
