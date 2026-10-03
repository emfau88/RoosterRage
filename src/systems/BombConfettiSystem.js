const TEXTURE_KEY = 'bomb-death-confetti';
const COLORS = ['#ffe36a', '#ff718f', '#65e6ff', '#97f075', '#be8dff', '#fff5de'];
const PARTICLE_LIMIT = 512;

function ensureConfettiTexture(scene) {
  if (scene.textures.exists(TEXTURE_KEY)) return TEXTURE_KEY;
  const texture = scene.textures.createCanvas(TEXTURE_KEY, COLORS.length * 24, 24);
  const ctx = texture.context;
  COLORS.forEach((color, i) => {
    const x = i * 24;
    ctx.fillStyle = color;
    if (i % 2) ctx.fillRect(x + 8, 4, 7, 16);
    else ctx.fillRect(x + 4, 8, 16, 7);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(x + (i % 2 ? 8 : 4), 8, i % 2 ? 2 : 16, 2);
    texture.add(`paper-${i}`, 0, x, 0, 24, 24);
  });
  texture.refresh();
  return TEXTURE_KEY;
}

export class BombConfettiSystem {
  constructor(scene) {
    this.scene = scene;
    this.emitter = null;
    this.particlesPerEnemy = 10;
    this.deathBursts = 0;
    this.emittedParticles = 0;
  }

  getEmitter() {
    if (!this.emitter) {
      this.emitter = this.scene.add.particles(0, 0, ensureConfettiTexture(this.scene), {
        frame: COLORS.map((_, i) => `paper-${i}`),
        emitting: false,
        lifespan: { min: 650, max: 1050 },
        speed: { min: 125, max: 255 },
        angle: { min: 205, max: 335 },
        gravityY: 540,
        rotate: {
          onEmit: particle => {
            particle.confettiAngle = Math.random() * 360;
            particle.confettiSpin = (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 540);
            return particle.confettiAngle;
          },
          onUpdate: (particle, _key, t) => particle.confettiAngle + particle.confettiSpin * t
        },
        scale: { start: 0.85, end: 0.5 },
        alpha: { start: 1, end: 0, ease: 'Quad.In' },
        maxAliveParticles: PARTICLE_LIMIT
      }).setDepth(12);
    }
    return this.emitter;
  }

  prepareBomb(enemyCount) {
    if (!enemyCount) return;
    const emitter = this.getEmitter();
    let available = PARTICLE_LIMIT - emitter.getAliveParticleCount();
    // Reserve at least three pieces for every possible death, including the
    // whole 170-enemy pool. Reuse the emitter's existing particle objects.
    if (available < enemyCount * 3) {
      emitter.killAll();
      // killAll recycles live particles without resetting their coordinates.
      // Reset them before explode adds the next enemy's world position.
      emitter.dead.forEach(particle => particle.setPosition());
      available = PARTICLE_LIMIT;
    }
    this.particlesPerEnemy = Math.min(14, Math.max(3, Math.floor(available / enemyCount)));
  }

  burst(x, y) {
    const emitter = this.getEmitter();
    const before = emitter.getAliveParticleCount();
    emitter.explode(this.particlesPerEnemy, x, y);
    const emitted = emitter.getAliveParticleCount() - before;
    if (emitted > 0) this.deathBursts += 1;
    this.emittedParticles += emitted;
    return emitted;
  }

  setPaused(paused) {
    if (!this.emitter) return;
    if (paused) this.emitter.pause();
    else this.emitter.resume();
  }

  getState() {
    return { deathBursts: this.deathBursts, emittedParticles: this.emittedParticles,
      activeParticles: this.emitter?.getAliveParticleCount() ?? 0,
      particlesPerEnemy: this.particlesPerEnemy, limit: PARTICLE_LIMIT };
  }

  destroy() {
    this.emitter?.destroy();
    this.emitter = null;
  }
}
