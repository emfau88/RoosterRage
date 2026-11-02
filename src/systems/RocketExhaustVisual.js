import Phaser from 'phaser';

// Coordinates in a normalized 256 x 160 hull. R1-R4 keep their original
// artwork with painted flames removed; EVO uses the complete, unlit hull.
const ENGINES = {
  1: [{ x: 96, y: 81, clear: [35, 61, 61, 42], scale: 1 }],
  2: [{ x: 94, y: 64, clear: [54, 48, 40, 33], scale: 1 }],
  3: [
    { x: 82, y: 81, clear: [34, 62, 48, 38], scale: 1 },
    { x: 104, y: 28, clear: [68, 16, 36, 22], scale: 0.62 },
    { x: 104, y: 132, clear: [70, 120, 34, 23], scale: 0.62 }
  ],
  4: [
    { x: 75, y: 60, clear: [28, 42, 47, 37], scale: 0.88 },
    { x: 76, y: 100, clear: [28, 83, 48, 37], scale: 0.88 }
  ],
  evo: [
    { x: 55, y: 52, scale: 0.86 },
    { x: 52, y: 80, scale: 1 },
    { x: 54, y: 109, scale: 0.86 }
  ]
};

function radialTexture(scene, key, stops) {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, 64, 64);
  const ctx = texture.getContext();
  const fill = ctx.createRadialGradient(32, 32, 1, 32, 32, 31);
  stops.forEach(([at, color]) => fill.addColorStop(at, color));
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, 64, 64);
  texture.refresh();
}

export function prepareRocketHull(scene, rank, evolved) {
  const variant = evolved ? 'evo' : rank;
  const key = evolved ? 'rocket-hull-evo' : `rocket-hull-r${rank}`;
  if (!scene.textures.exists(key)) {
    const source = scene.textures.get(evolved ? 'rocket-egg-evo' : `rocket-egg-r${rank}`).getSourceImage();
    const texture = scene.textures.createCanvas(key, 256, 160);
    const ctx = texture.getContext();
    ctx.drawImage(source, 0, 0, 256, 160);
    ENGINES[variant].forEach(({ clear }) => { if (clear) ctx.clearRect(...clear); });
    texture.refresh();
  }
  return key;
}

function prepareExhaustTextures(scene) {
  if (!scene.textures.exists('rocket-live-flame')) {
    const source = scene.textures.get('rocket-flame-source').getSourceImage();
    const texture = scene.textures.createCanvas('rocket-live-flame', 8 * 128, 64);
    const ctx = texture.getContext();
    for (let frame = 0; frame < 8; frame++) {
      ctx.drawImage(source, (frame % 4) * source.width / 4, Math.floor(frame / 4) * source.height / 2,
        source.width / 4, source.height / 2, frame * 128, 0, 128, 64);
      texture.add(frame, 0, frame * 128, 0, 128, 64);
    }
    texture.refresh();
  }
  radialTexture(scene, 'rocket-nozzle-glow', [
    [0, 'rgba(255,250,213,0.95)'], [0.25, 'rgba(255,183,69,0.65)'], [1, 'rgba(255,105,21,0)']
  ]);
  radialTexture(scene, 'rocket-smoke-puff', [
    [0, 'rgba(225,216,199,0.85)'], [0.38, 'rgba(155,150,147,0.7)'],
    [0.7, 'rgba(92,89,91,0.25)'], [1, 'rgba(78,76,82,0)']
  ]);
}

export class RocketExhaustVisual {
  constructor(scene, sprite, rank, evolved) {
    this.scene = scene;
    this.sprite = sprite;
    this.rank = rank;
    this.evolved = evolved;
    this.engines = ENGINES[evolved ? 'evo' : rank];
    this.phase = (sprite.x * 0.37 + sprite.y * 0.61 + scene.time.now * 0.013) % (Math.PI * 2);
    this.nextEmissionAt = 0;
    this.emissionIndex = 0;
    this.particles = new Set();
    prepareExhaustTextures(scene);
    this.flames = this.engines.map(() => scene.add.image(sprite.x, sprite.y, 'rocket-live-flame', 0)
      .setOrigin(1, 0.5).setDepth(6.8));
    this.glows = this.engines.map(() => scene.add.image(sprite.x, sprite.y, 'rocket-nozzle-glow')
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(6.9));
  }

  getNozzlePosition(index = 0) {
    const engine = this.engines[index];
    const angle = this.sprite.rotation;
    const x = (engine.x / 256 - 0.5) * this.sprite.displayWidth;
    const y = (engine.y / 160 - 0.5) * this.sprite.displayHeight;
    return {
      x: this.sprite.x + Math.cos(angle) * x - Math.sin(angle) * y,
      y: this.sprite.y + Math.sin(angle) * x + Math.cos(angle) * y
    };
  }

  update(ageMs) {
    const angle = this.sprite.rotation;
    const time = ageMs / 1000;
    this.engines.forEach((engine, index) => {
      const phase = this.phase + index * 2.3;
      const flicker = Math.sin(time * 43 + phase) * 0.13 + Math.sin(time * 79 + phase) * 0.07;
      const point = this.getNozzlePosition(index);
      const length = this.sprite.displayWidth * (this.evolved ? 0.52 : 0.36 + this.rank * 0.025)
        * engine.scale * (1 + flicker);
      const width = this.sprite.displayHeight * 0.48 * engine.scale * (1 - flicker * 0.6);
      const frame = (Math.floor(ageMs / 50) + index * 3 + Math.floor(this.phase)) % 8;
      this.flames[index].setFrame(frame).setPosition(point.x, point.y).setRotation(angle)
        .setDisplaySize(length, width).setAlpha(0.88 + flicker * 0.45);
      this.glows[index].setPosition(point.x, point.y)
        .setDisplaySize(width * 1.4, width * 1.4).setAlpha(0.42 + flicker);
    });
    // Simulation age holds during pauses. Particles are emitted in world
    // space, so a homing turn leaves a curved wake instead of rotating smoke.
    if (ageMs <= 0 || ageMs < this.nextEmissionAt) return;
    this.nextEmissionAt = ageMs + (this.evolved ? 32 : 50 - this.rank * 3);
    this.emitParticle(ageMs, angle);
  }

  emitParticle(ageMs, angle) {
    const index = this.emissionIndex++;
    const engineIndex = index % this.engines.length;
    const point = this.getNozzlePosition(engineIndex);
    const wave = Math.sin(index * 2.399 + this.phase);
    const size = (this.evolved ? 8 : 4 + this.rank * 0.7) * (1 + wave * 0.12);
    const rear = this.sprite.displayWidth * 0.15;
    const x = point.x - Math.cos(angle) * rear;
    const y = point.y - Math.sin(angle) * rear;
    const duration = (this.evolved ? 680 : 420 + this.rank * 38) + wave * 45;
    const puff = this.scene.objectPools.createFx(() => this.scene.add.image(x, y, 'rocket-smoke-puff')
      .setDisplaySize(size, size * 0.8).setRotation(angle + wave)
      .setAlpha(this.evolved ? 0.52 : 0.4).setDepth(4.15));
    if (puff) {
      this.track(puff);
      this.scene.tweens.add({
        targets: puff,
        x: x - Math.cos(angle) * 14 - Math.sin(angle) * wave * 12,
        y: y - Math.sin(angle) * 14 + Math.cos(angle) * wave * 12 - 7,
        scaleX: puff.scaleX * 2.7,
        scaleY: puff.scaleY * 3.2,
        rotation: angle + wave * 1.8,
        alpha: 0,
        duration,
        ease: 'Sine.Out',
        onComplete: () => puff.destroy()
      });
    }
    if (index % (this.evolved ? 2 : 3) !== 0) return;
    const spark = this.scene.objectPools.createFx(() => this.scene.add.image(point.x, point.y, 'rocket-nozzle-glow')
      .setDisplaySize(this.evolved ? 8 : 5, 2.5).setRotation(angle)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.85).setDepth(6.7));
    if (!spark) return;
    this.track(spark);
    this.scene.tweens.add({
      targets: spark,
      x: point.x - Math.cos(angle) * 28 - Math.sin(angle) * wave * 10,
      y: point.y - Math.sin(angle) * 28 + Math.cos(angle) * wave * 10,
      alpha: 0,
      scaleX: spark.scaleX * 0.25,
      duration: 220 + 40 * Math.sin(ageMs),
      ease: 'Quad.Out',
      onComplete: () => spark.destroy()
    });
  }

  track(particle) {
    this.particles.add(particle);
    particle.once('destroy', () => this.particles.delete(particle));
  }

  destroy() {
    this.flames.forEach((flame) => flame.destroy());
    this.glows.forEach((glow) => glow.destroy());
    // The existing wake finishes its short fade after impact. Scene-owned
    // tweens and the global FX budget also handle shutdown and mass salvos.
  }
}
