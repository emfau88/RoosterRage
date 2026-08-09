import { WAVE_DEFINITIONS } from '../data/waveDefinitions.js';

export class WaveSystem {
  constructor(scene) {
    this.scene = scene;
    this.currentWave = 0;
    this.active = false;
    this.completed = false;
    this.spawned = 0;
    this.nextSpawnAt = 0;
    this.waitingForClear = false;
    this.spawnQueue = [];
    this.waves = WAVE_DEFINITIONS.map((wave) => this.hydrateWave(wave));
  }

  get totalWaves() {
    return this.waves.length;
  }

  hydrateWave(wave) {
    return {
      ...wave,
      elites: (wave.elites ?? []).map((enemy) => this.makeEnemyFromSpec(enemy)),
      pool: wave.pool.map((entry) => ({
        ...entry,
        enemy: this.makeEnemyFromSpec(entry.enemy)
      }))
    };
  }

  makeEnemyFromSpec({ kind, multiplier = 1 }) {
    const makers = {
      slime: () => this.makeSlime(multiplier),
      runner: () => this.makeRunner(multiplier),
      brute: () => this.makeBrute(multiplier),
      spitter: () => this.makeSpitter(multiplier),
      'fan-spitter': () => this.makeFanSpitter(multiplier),
      bomber: () => this.makeBomber(multiplier),
      'elite-runner': () => this.makeEliteRunner(),
      'elite-brute': () => this.makeEliteBrute(),
      'elite-spitter': () => this.makeEliteSpitter(),
      boss: () => this.makeBoss()
    };
    const makeEnemy = makers[kind];
    if (!makeEnemy) {
      throw new Error(`Unknown enemy kind in wave definition: ${kind}`);
    }
    return makeEnemy();
  }

  start() {
    this.currentWave = 1;
    this.active = true;
    this.spawned = 0;
    this.nextSpawnAt = 0;
    this.waitingForClear = false;
    this.spawnQueue = this.buildSpawnQueue(this.waves[this.currentWave - 1]);
    this.scene.onWaveStarted?.(this.currentWave, this.waves[this.currentWave - 1]);
  }

  update(time, enemiesAlive) {
    if (!this.active || this.completed) {
      return;
    }

    const wave = this.waves[this.currentWave - 1];
    if (this.spawned < this.spawnQueue.length && time >= this.nextSpawnAt) {
      this.scene.spawnEnemy(this.spawnQueue[this.spawned]);
      this.spawned += 1;
      this.nextSpawnAt = time + wave.interval;
      this.waitingForClear = this.spawned >= this.spawnQueue.length;
      return;
    }

    if (this.waitingForClear && enemiesAlive === 0) {
      if (this.currentWave >= this.waves.length) {
        this.completed = true;
        this.active = false;
        this.scene.onWaveCompleted?.(this.currentWave);
        this.scene.victory();
        return;
      }

      this.scene.onWaveCompleted?.(this.currentWave);
      this.currentWave += 1;
      this.scene.onWaveStarted?.(this.currentWave, this.waves[this.currentWave - 1]);
      this.spawnQueue = this.buildSpawnQueue(this.waves[this.currentWave - 1]);
      this.spawned = 0;
      this.nextSpawnAt = time + 1700;
      this.waitingForClear = false;
    }
  }

  buildSpawnQueue(wave) {
    const queue = [...(wave.elites ?? [])];
    while (queue.length < wave.count) {
      queue.push(this.pickFromPool(wave.pool));
    }
    return queue;
  }

  pickFromPool(pool) {
    const total = pool.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;
    for (const item of pool) {
      roll -= item.weight;
      if (roll <= 0) {
        return { ...item.enemy };
      }
    }
    return { ...pool[0].enemy };
  }

  makeSlime(multiplier = 1) {
    return { type: 'slime', hp: Math.round(44 * multiplier), speed: 74, damage: 8, xp: 8, texture: 'enemy-slime-wobble', animation: 'enemy-slime-wobble-loop', scale: 0.24, radius: 28, bodyOffsetX: 100, bodyOffsetY: 118, hpBarWidth: 42, hpBarYOffset: 32 };
  }

  makeRunner(multiplier = 1) {
    return { type: 'runner', hp: Math.round(48 * multiplier), speed: 112, damage: 9, xp: 9, texture: 'enemy-runner-walk', animation: 'enemy-runner-walk-loop', scale: 0.25, radius: 24, bodyOffsetX: 104, bodyOffsetY: 122, hpBarWidth: 40, hpBarYOffset: 30 };
  }

  makeBrute(multiplier = 1) {
    return { type: 'brute', hp: Math.round(95 * multiplier), speed: 74, damage: 13, xp: 13, texture: 'enemy-brute-stomp', animation: 'enemy-brute-stomp-loop', scale: 0.27, radius: 34, bodyOffsetX: 94, bodyOffsetY: 108, hpBarWidth: 54, hpBarYOffset: 42 };
  }

  makeSpitter(multiplier = 1) {
    return { ...this.makeSlime(0.9 * multiplier), type: 'spitter', speed: 58, damage: 7, xp: 12, texture: 'enemy-spitter-pulse', animation: 'enemy-spitter-pulse-loop', scale: 0.26, radius: 27, bodyOffsetX: 101, bodyOffsetY: 102, ability: { kind: 'shoot', cooldown: 2200, speed: 230, damage: 7, texture: 'enemy-shot', radius: 8, color: 0x7cff67, trailColor: 0x4dea7e, scale: 1.18 } };
  }

  makeFanSpitter(multiplier = 1) {
    return { ...this.makeSlime(1.05 * multiplier), type: 'fan-spitter', speed: 52, damage: 8, xp: 14, texture: 'enemy-fan-spitter-recoil', animation: 'enemy-fan-spitter-recoil-loop', scale: 0.29, radius: 31, bodyOffsetX: 97, bodyOffsetY: 100, hpBarWidth: 48, hpBarYOffset: 36, ability: { kind: 'fan', cooldown: 3100, speed: 210, damage: 6, texture: 'enemy-blue-shot', radius: 10, count: 3, spread: 0.75, color: 0xffffff, trailColor: 0x51a8ff, scale: 1.18, muzzleDistance: 36 } };
  }

  makeBomber(multiplier = 1) {
    return { ...this.makeRunner(0.95 * multiplier), type: 'bomber', speed: 92, damage: 12, xp: 13, texture: 'enemy-bomber-bob', animation: 'enemy-bomber-bob-loop', scale: 0.28, radius: 29, bodyOffsetX: 99, bodyOffsetY: 100, hpBarWidth: 46, hpBarYOffset: 36, explodeOnDeath: true, explosionRadius: 86, explosionDamage: 18 };
  }

  makeEliteRunner() {
    return { ...this.makeRunner(3.1), type: 'elite-runner', elite: true, eliteTint: false, speed: 128, damage: 13, xp: 40, texture: 'enemy-elite-runner-walk', animation: 'enemy-elite-runner-walk-loop', scale: 0.34, radius: 29, bodyOffsetX: 99, bodyOffsetY: 100, hpBarWidth: 62, hpBarYOffset: 42 };
  }

  makeEliteBrute() {
    return { ...this.makeBrute(3.2), type: 'elite-brute', elite: true, eliteTint: false, speed: 68, damage: 18, xp: 48, texture: 'enemy-elite-brute-stomp', animation: 'enemy-elite-brute-stomp-loop', scale: 0.39, radius: 41, bodyOffsetX: 87, bodyOffsetY: 91, hpBarWidth: 74, hpBarYOffset: 56 };
  }

  makeEliteSpitter() {
    return { ...this.makeSpitter(2.7), type: 'elite-spitter', elite: true, eliteTint: false, speed: 50, xp: 44, texture: 'enemy-elite-spitter-pulse', animation: 'enemy-elite-spitter-pulse-loop', scale: 0.34, radius: 36, bodyOffsetX: 92, bodyOffsetY: 93, hpBarWidth: 68, hpBarYOffset: 48, ability: { kind: 'fan', cooldown: 2400, speed: 245, damage: 7, texture: 'enemy-purple-shot', radius: 11, count: 3, spread: 0.7, color: 0xffffff, trailColor: 0x9b5cff, scale: 1.2, muzzleDistance: 42 } };
  }

  makeBoss() {
    return { ...this.makeBrute(50), type: 'boss', boss: true, elite: true, eliteTint: false, speed: 58, damage: 24, xp: 120, texture: 'enemy-boss-heavy', animation: 'enemy-boss-heavy-loop', scale: 0.58, radius: 58, bodyOffsetX: 70, bodyOffsetY: 72, hpBarWidth: 130, hpBarYOffset: 88, ability: { kind: 'fan', cooldown: 1900, speed: 280, damage: 12, texture: 'enemy-shot', radius: 8, count: 5, spread: 1.15, color: 0xff7a33, trailColor: 0xff3828, scale: 1.15, muzzleDistance: 72 }, heavyAttackDelay: 1350, heavyProjectile: { cooldown: 3900, speed: 238, damage: 24, radius: 19, life: 4600, color: 0xff6824, trailColor: 0xff2a20, trailAlpha: 0.44, scale: 1.55, muzzleDistance: 82, depth: 8, pulse: true, tint: false } };
  }
}
