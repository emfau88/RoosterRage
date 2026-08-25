import Phaser from 'phaser';

const EXTINGUISH_MS = 440;
const RANK_CONFIG = {
  1: { radius: 90, damage: 10, life: 3000, lobes: 1, heatSpots: 1, ground: 0x3d130d, rim: 0xff6235 },
  2: { radius: 108, damage: 12, life: 3400, lobes: 2, heatSpots: 2, ground: 0x49170d, rim: 0xff7138 },
  3: { radius: 124, damage: 14, life: 3800, lobes: 3, heatSpots: 3, ground: 0x551a0b, rim: 0xff843d },
  4: { radius: 112, damage: 16, life: 4000, lobes: 3, heatSpots: 3, ground: 0x5b1c0a, rim: 0xff9141 }
};
const EVOLVED_CONFIG = {
  radius: 136, damage: 22, life: 4500, lobes: 4, heatSpots: 4, ground: 0x682006, rim: 0xffc45a
};
const LOBE_LAYOUT = [
  { x: -0.2, y: -0.04, width: 1.25, height: 0.68, rotation: -0.08 },
  { x: 0.24, y: 0.04, width: 1.1, height: 0.62, rotation: 0.1 },
  { x: -0.03, y: 0.18, width: 0.92, height: 0.5, rotation: -0.04 },
  { x: 0.04, y: -0.18, width: 0.78, height: 0.44, rotation: 0.05 }
];
const HEAT_LAYOUT = [
  { x: -0.24, y: 0.03, width: 0.32, phase: 0.2 },
  { x: 0.25, y: -0.08, width: 0.27, phase: 2.1 },
  { x: 0.02, y: 0.18, width: 0.23, phase: 4.3 },
  { x: 0.04, y: -0.2, width: 0.2, phase: 5.4 }
];

export class HazardZone {
  constructor(scene, x, y, rank, evolved = false) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.rank = rank;
    this.evolved = evolved;
    this.renderStyle = 'simple-burn-field';
    const config = evolved ? EVOLVED_CONFIG : RANK_CONFIG[rank] ?? RANK_CONFIG[1];
    this.radius = config.radius;
    this.damage = config.damage;
    this.tickMs = evolved ? 320 : 420;
    this.life = config.life;
    this.maxLife = this.life;
    this.nextTickAt = 0;
    this.age = 0;
    this.tickFlash = 0;
    this.active = true;
    this.extinguishing = false;
    this.flames = [];
    this.smoke = null;
    this.glow = null;

    const groundColor = config.ground;
    const rimColor = config.rim;
    this.groundSprite = scene.add.ellipse(x, y, this.radius * 2.02, this.radius * 1.12,
      groundColor, 1).setDepth(3.05);
    this.lobes = LOBE_LAYOUT.slice(0, config.lobes).map((lobe, index) => (
      scene.add.ellipse(x + this.radius * lobe.x, y + this.radius * lobe.y,
        this.radius * lobe.width, this.radius * lobe.height,
        index % 2 === 0 ? groundColor : evolved ? 0x8a2d08 : 0x6a200d, 1)
        .setRotation(lobe.rotation).setDepth(3.06 + index * 0.01)
    ));
    this.rim = scene.add.ellipse(x, y, this.radius * 1.9, this.radius * 1.03, rimColor, 0)
      .setStrokeStyle(evolved ? 2.2 : 1.5, rimColor, 1)
      .setDepth(3.2);
    this.embers = scene.add.image(x, y, 'molotov-embers')
      .setDisplaySize(this.radius * 1.42, this.radius * 0.76)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(evolved ? 0.18 : 0.11)
      .setDepth(3.3);
    this.heatSpots = HEAT_LAYOUT.slice(0, config.heatSpots).map((spot, index) => ({
      sprite: scene.add.ellipse(
        x + this.radius * spot.x,
        y + this.radius * spot.y,
        this.radius * spot.width,
        this.radius * spot.width * 0.42,
        evolved ? 0xffd46a : index === 0 ? 0xff8a3d : 0xffb04a,
        1
      ).setBlendMode(Phaser.BlendModes.ADD).setDepth(3.35),
      phase: spot.phase
    }));
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

    const fadeIn = Phaser.Math.Clamp(this.age / 160, 0, 1);
    const fadeOut = this.extinguishing ? Phaser.Math.Clamp(this.life / EXTINGUISH_MS, 0, 1) : 1;
    const visibility = fadeIn * fadeOut;
    const breathe = 1 + Math.sin(this.age * 0.0026) * 0.012;
    this.groundSprite.setScale(breathe).setAlpha(visibility * (this.evolved ? 0.28 : 0.23));
    this.lobes.forEach((lobe, index) => {
      lobe.setAlpha(visibility * (this.evolved ? 0.17 + index * 0.01 : 0.13 + index * 0.01));
    });
    this.rim.setScale(1 + this.tickFlash * 0.018)
      .setAlpha(visibility * ((this.evolved ? 0.48 : 0.34) + this.tickFlash * 0.12));
    this.embers.setScale(1 + Math.sin(this.age * 0.0022) * 0.018)
      .setAlpha(visibility * ((this.evolved ? 0.18 : 0.11) + this.tickFlash * 0.08));
    this.heatSpots.forEach((spot, index) => {
      const glow = Math.sin(this.age * 0.0018 + spot.phase) * 0.015;
      spot.sprite
        .setScale(1 + glow)
        .setAlpha(visibility * ((this.evolved ? 0.18 : 0.11) + index * 0.012 + this.tickFlash * 0.08));
    });
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
      if (enemy.sprite.active) enemy.applyBurn(3000, Math.max(2, Math.round(this.damage * 0.25)));
    });
  }

  showDamagePulse() {
    this.tickFlash = 1;
  }

  destroy() {
    if (!this.active) return;
    this.active = false;
    this.groundSprite.destroy();
    this.lobes.forEach((lobe) => lobe.destroy());
    this.rim.destroy();
    this.embers.destroy();
    this.heatSpots.forEach((spot) => spot.sprite.destroy());
  }
}
