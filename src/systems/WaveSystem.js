import { WAVE_DEFINITIONS } from '../data/waveDefinitions.js';
import { ENCOUNTER_STANDARDS, ENEMY_ROLE_MATRIX } from '../data/enemyRoleDefinitions.js';
import { allocateBudgets, SpawnDirector } from './SpawnDirector.js';

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
    this.director = new SpawnDirector(scene);
    this.waves = WAVE_DEFINITIONS.map((wave) => this.hydrateWave(wave));
  }

  get totalWaves() {
    return this.waves.length;
  }

  getProgressState() {
    const wave = this.waves[this.currentWave - 1];
    const total = wave?.count ?? 0;
    const spawned = Math.min(total, this.director.spawnedCount ?? this.spawned ?? 0);
    const defeated = Math.max(0, spawned - this.scene.enemies.length);
    return {
      current: this.currentWave,
      totalWaves: this.totalWaves,
      spawned,
      total,
      alive: this.scene.enemies.length,
      defeated,
      percent: total > 0 ? Math.min(1, defeated / total) : 0
    };
  }

  hydrateWave(wave) {
    const hydrated = {
      ...wave,
      elites: (wave.elites ?? []).map((enemy) => this.makeEnemyFromSpec(enemy)),
      composition: (wave.composition ?? []).map((entry) => ({
        count: entry.count,
        enemy: this.makeEnemyFromSpec(entry.enemy)
      })),
      pool: (wave.pool ?? []).map((entry) => ({
        ...entry,
        enemy: this.makeEnemyFromSpec(entry.enemy)
      }))
    };
    return this.scene.challenge?.modifyWave(hydrated) ?? hydrated;
  }

  makeEnemyFromSpec({ kind, multiplier = 1 }) {
    const makers = {
      kornkrabbler: () => this.makeKornkrabbler(multiplier),
      slime: () => this.makeSlime(multiplier),
      runner: () => this.makeRunner(multiplier),
      brute: () => this.makeBrute(multiplier),
      spitter: () => this.makeSpitter(multiplier),
      'fan-spitter': () => this.makeFanSpitter(multiplier),
      bomber: () => this.makeBomber(multiplier),
      support: () => this.makeSupport(multiplier),
      summoner: () => this.makeSummoner(multiplier),
      'elite-runner': () => this.makeEliteRunner(),
      'elite-brute': () => this.makeEliteBrute(),
      'elite-spitter': () => this.makeEliteSpitter(),
      boss: () => this.makeBoss()
    };
    const makeEnemy = makers[kind];
    if (!makeEnemy) {
      throw new Error(`Unknown enemy kind in wave definition: ${kind}`);
    }
    const enemy = makeEnemy();
    return this.scene.challenge?.modifyEnemy(enemy) ?? enemy;
  }

  start() {
    this.currentWave = 1;
    this.active = true;
    this.spawned = 0;
    this.nextSpawnAt = 0;
    this.waitingForClear = false;
    this.spawnQueue = this.buildSpawnQueue(this.waves[this.currentWave - 1]);
    this.director.start(this.waves[this.currentWave - 1], this.spawnQueue, 0);
    this.scene.onWaveStarted?.(this.currentWave, this.waves[this.currentWave - 1]);
  }

  update(time, enemiesAlive) {
    if (!this.active || this.completed) {
      return;
    }

    const wave = this.waves[this.currentWave - 1];
    if (!this.waitingForClear) {
      this.director.update(time, enemiesAlive);
      this.spawned = this.director.spawnedCount;
      this.waitingForClear = this.director.done;
      if (!this.waitingForClear) {
        return;
      }
    }

    // The director can spawn its final batch in this same update. The argument
    // describes the pre-spawn frame, so use the live collection before clearing
    // or advancing a wave.
    if (this.waitingForClear && this.scene.enemies.length === 0) {
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
      this.director.start(
        this.waves[this.currentWave - 1],
        this.spawnQueue,
        time + (this.waves[this.currentWave - 1].intermission ?? 1500)
      );
      this.waitingForClear = false;
    }
  }

  buildSpawnQueue(wave) {
    const queue = [];
    const composition = (wave.composition ?? []).map((entry) => ({
      ...entry,
      remaining: entry.count
    }));

    while (composition.some((entry) => entry.remaining > 0)) {
      composition.forEach((entry) => {
        if (entry.remaining <= 0) {
          return;
        }
        queue.push(this.cloneEnemyConfig(entry.enemy));
        entry.remaining -= 1;
      });
    }

    while (queue.length < wave.count && wave.pool?.length) {
      queue.push(this.pickFromPool(wave.pool));
    }

    (wave.elites ?? []).forEach((enemy) => queue.push(this.cloneEnemyConfig(enemy)));

    if (queue.length !== wave.count) {
      throw new Error(`Wave ${wave.name} defines ${queue.length} enemies but count is ${wave.count}.`);
    }

    return this.applyXpBudget(queue, wave).map((enemy) => ({
      ...enemy,
      spawnMinDistance: wave.spawnMinDistance
    }));
  }

  applyXpBudget(queue, wave) {
    const budget = wave.xpCurve?.budget ?? 0;
    if (budget <= 0 || wave.bossWave || queue.length === 0) {
      return queue;
    }
    const segments = wave.pressureCurve?.length ? wave.pressureCurve : [{ share: 1 }];
    const enemyBudgets = allocateBudgets(queue.length, segments);
    const shareTotal = segments.reduce((sum, segment) => sum + (segment.share ?? 0), 0) || 1;
    let offset = 0;
    enemyBudgets.forEach((enemyCount, segmentIndex) => {
      const group = queue.slice(offset, offset + enemyCount);
      const segmentBudget = budget * ((segments[segmentIndex]?.share ?? 0) / shareTotal);
      const weightTotal = group.reduce((sum, enemy) => sum + this.getXpWeight(enemy), 0) || 1;
      group.forEach((enemy) => {
        enemy.xpOverride = segmentBudget * (this.getXpWeight(enemy) / weightTotal);
      });
      offset += enemyCount;
    });
    return queue;
  }

  getXpWeight(enemy) {
    if (enemy.microFodder) return 0.2;
    if (enemy.elite) return 3;
    if (enemy.role === 'tank' || enemy.role === 'area-denial' || enemy.role === 'summoner') return 1.4;
    if (enemy.role === 'runner' || enemy.role === 'shooter' || enemy.role === 'exploder') return 1.15;
    return 1;
  }

  pickFromPool(pool) {
    const total = pool.reduce((sum, item) => sum + item.weight, 0);
    let roll = this.scene.rng.next('wave-pool') * total;
    for (const item of pool) {
      roll -= item.weight;
      if (roll <= 0) {
        return this.cloneEnemyConfig(item.enemy);
      }
    }
    return this.cloneEnemyConfig(pool[0].enemy);
  }

  cloneEnemyConfig(enemy) {
    return {
      ...enemy,
      ability: enemy.ability ? { ...enemy.ability } : null,
      heavyProjectile: enemy.heavyProjectile ? { ...enemy.heavyProjectile } : null,
      bossSequences: enemy.bossSequences?.map((sequence) => ({
        ...sequence,
        steps: sequence.steps.map((step) => ({
          ...step,
          groups: step.groups?.map((group) => ({ ...group }))
        }))
      })) ?? [],
      bossPhases: enemy.bossPhases?.map((phase) => ({
        ...phase,
        ability: phase.ability ? { ...phase.ability } : undefined,
        heavyProjectile: phase.heavyProjectile ? { ...phase.heavyProjectile } : undefined,
        adds: phase.adds?.map((add) => ({ ...add })) ?? []
      })) ?? [],
      aura: enemy.aura ? { ...enemy.aura } : null
    };
  }

  getWaveCatalog() {
    return this.waves.map((wave, index) => {
      const queue = this.buildSpawnQueue(wave);
      const typeCounts = queue.reduce((counts, enemy) => {
        counts[enemy.type] = (counts[enemy.type] ?? 0) + 1;
        return counts;
      }, {});
      const roleCounts = queue.reduce((counts, enemy) => {
        counts[enemy.role] = (counts[enemy.role] ?? 0) + 1;
        return counts;
      }, {});
      return {
        wave: index + 1,
        name: wave.name,
        intent: wave.intent,
        count: wave.count,
        interval: wave.interval,
        targetDuration: [...wave.targetDuration],
        spawnMinDistance: wave.spawnMinDistance,
        bossWave: wave.bossWave ?? false,
        targetPeak: wave.targetPeak,
        mobileActiveCap: wave.mobileActiveCap,
        primaryRoles: [...(wave.primaryRoles ?? [])],
        pressureCurve: (wave.pressureCurve ?? []).map((segment) => ({ ...segment })),
        xpCurve: { ...wave.xpCurve },
        allocatedXp: queue.reduce((sum, enemy) => sum + (enemy.xpOverride ?? 0), 0),
        typeCounts,
        roleCounts,
        queue: queue.map((enemy) => enemy.type)
      };
    });
  }

  makeSlime(multiplier = 1) {
    return { type: 'slime', role: 'fodder', hp: Math.round(18 * multiplier), speed: 78, damage: 5, xp: 3, texture: 'enemy-slime-wobble', animation: 'enemy-slime-wobble-loop', scale: 0.2, radius: 23, bodyOffsetX: 105, bodyOffsetY: 123, hpBarWidth: 34, hpBarYOffset: 27 };
  }

  makeKornkrabbler(multiplier = 1) {
    return {
      type: 'kornkrabbler',
      role: 'micro-fodder',
      displayName: 'Kornkrabbler',
      hp: Math.max(3, Math.round(7 * multiplier)),
      speed: 96,
      damage: 2,
      microFodder: true,
      texture: 'enemy-kornkrabbler-run',
      animation: 'enemy-kornkrabbler-run-left',
      directionalAnimationPrefix: 'enemy-kornkrabbler-run',
      scale: 0.2,
      radius: 12,
      bodyOffsetX: 116,
      bodyOffsetY: 116,
      showHpBar: false
    };
  }

  getXpForSpawn(config) {
    if (Number.isFinite(config.xpOverride)) {
      return Math.max(0, config.xpOverride * (this.scene.challenge?.modifiers.xpMultiplier ?? 1));
    }
    const wave = this.waves[this.currentWave - 1];
    if (!wave?.xpCurve) {
      return config.xp ?? 0;
    }
    if (config.boss) {
      return Math.round((wave.xpCurve.bossXp ?? 0) * (this.scene.challenge?.modifiers.xpMultiplier ?? 1));
    }
    return Math.max(0, (config.xp ?? 0) * (this.scene.challenge?.modifiers.xpMultiplier ?? 1));
  }

  makeRunner(multiplier = 1) {
    return { type: 'runner', role: 'runner', hp: Math.round(36 * multiplier), speed: 118, damage: 7, xp: 5, texture: 'enemy-runner-walk', animation: 'enemy-runner-walk-loop', scale: 0.22, radius: 22, bodyOffsetX: 106, bodyOffsetY: 124, hpBarWidth: 36, hpBarYOffset: 27 };
  }

  makeBrute(multiplier = 1) {
    return { type: 'brute', role: 'tank', hp: Math.round(145 * multiplier), speed: 68, damage: 12, xp: 12, texture: 'enemy-brute-stomp', animation: 'enemy-brute-stomp-loop', scale: 0.28, radius: 35, bodyOffsetX: 93, bodyOffsetY: 107, hpBarWidth: 56, hpBarYOffset: 43 };
  }

  makeSpitter(multiplier = 1) {
    return { ...this.makeSlime(0.9 * multiplier), type: 'spitter', role: 'shooter', hp: Math.round(68 * multiplier), speed: 56, damage: 7, xp: 9, texture: 'enemy-spitter-pulse', animation: 'enemy-spitter-pulse-loop', scale: 0.25, radius: 26, bodyOffsetX: 101, bodyOffsetY: 102, ability: { kind: 'shoot', cooldown: 2350, speed: 230, damage: 7, source: 'spitter-shot', texture: 'enemy-shot', radius: 8, color: 0x7cff67, trailColor: 0x4dea7e, scale: 1.18 } };
  }

  makeFanSpitter(multiplier = 1) {
    return { ...this.makeSlime(1.05 * multiplier), type: 'fan-spitter', role: 'area-denial', hp: Math.round(80 * multiplier), speed: 50, damage: 8, xp: 12, texture: 'enemy-fan-spitter-recoil', animation: 'enemy-fan-spitter-recoil-loop', scale: 0.29, radius: 31, bodyOffsetX: 97, bodyOffsetY: 100, hpBarWidth: 48, hpBarYOffset: 36, ability: { kind: 'fan', cooldown: 3300, speed: 210, damage: 5, source: 'fan-spitter-shot', texture: 'enemy-blue-shot', radius: 10, count: 3, spread: 0.75, color: 0xffffff, trailColor: 0x51a8ff, scale: 1.18, muzzleDistance: 36 } };
  }

  makeBomber(multiplier = 1) {
    return { ...this.makeRunner(0.95 * multiplier), type: 'bomber', role: 'exploder', hp: Math.round(72 * multiplier), speed: 94, damage: 10, xp: 10, texture: 'enemy-bomber-bob', animation: 'enemy-bomber-bob-loop', scale: 0.28, radius: 29, bodyOffsetX: 99, bodyOffsetY: 100, hpBarWidth: 46, hpBarYOffset: 36, explodeOnDeath: true, explosionRadius: 86, explosionDamage: 18 };
  }

  makeSupport(multiplier = 1) {
    return {
      ...this.makeSpitter(1.25 * multiplier),
      type: 'support',
      role: 'support',
      displayName: 'Brood Tender',
      hp: Math.round(92 * multiplier),
      speed: 52,
      damage: 5,
      xp: 14,
      tint: 0x84ff9a,
      ability: null,
      aura: {
        kind: 'regeneration',
        label: 'Regenerationsaura',
        radius: 185,
        healPerSecond: 4,
        color: 0x65ef8b
      }
    };
  }

  makeSummoner(multiplier = 1) {
    return {
      ...this.makeSpitter(1.5 * multiplier),
      type: 'summoner',
      role: 'summoner',
      displayName: 'Nest Caller',
      hp: Math.round(118 * multiplier),
      speed: 45,
      damage: 7,
      xp: 18,
      tint: 0xc18aff,
      ability: {
        kind: 'summon',
        label: 'Brood Call',
        cooldown: 5600,
        count: 3,
        telegraphMs: 520,
        color: 0xc18aff
      }
    };
  }

  makeEliteRunner() {
    return {
      ...this.makeRunner(10),
      type: 'elite-runner',
      role: 'runner',
      displayName: 'Gilded Talon',
      elite: true,
      eliteTint: false,
      speed: 126,
      damage: 13,
      xp: 34,
      texture: 'enemy-elite-runner-walk',
      animation: 'enemy-elite-runner-walk-loop',
      scale: 0.34,
      radius: 29,
      bodyOffsetX: 99,
      bodyOffsetY: 100,
      hpBarWidth: 62,
      hpBarYOffset: 42,
      aura: { kind: 'haste', label: 'Haste-Aura', radius: 185, multiplier: 1.2, color: 0xffd35c },
      ability: { kind: 'dash', label: 'Talon Dash', cooldown: 3900, telegraphMs: 380, speed: 470, duration: 460, color: 0xffd35c }
    };
  }

  makeEliteBrute() {
    return {
      ...this.makeBrute(3.1),
      type: 'elite-brute',
      role: 'tank',
      displayName: 'Iron Brooder',
      elite: true,
      eliteTint: false,
      speed: 66,
      damage: 18,
      xp: 42,
      texture: 'enemy-elite-brute-stomp',
      animation: 'enemy-elite-brute-stomp-loop',
      scale: 0.39,
      radius: 41,
      bodyOffsetX: 87,
      bodyOffsetY: 91,
      hpBarWidth: 74,
      hpBarYOffset: 56,
      aura: { kind: 'armor', label: 'Panzer-Aura', radius: 205, reduction: 0.22, color: 0x6bd8ff },
      ability: { kind: 'slam', label: 'Iron Stomp', cooldown: 4400, telegraphMs: 620, heavy: true, radius: 165, damage: 21, color: 0xff6a32 }
    };
  }

  makeEliteSpitter() {
    return {
      ...this.makeSpitter(4.8),
      type: 'elite-spitter',
      role: 'shooter',
      displayName: 'Violet Matron',
      elite: true,
      eliteTint: false,
      speed: 48,
      xp: 40,
      texture: 'enemy-elite-spitter-pulse',
      animation: 'enemy-elite-spitter-pulse-loop',
      scale: 0.34,
      radius: 36,
      bodyOffsetX: 92,
      bodyOffsetY: 93,
      hpBarWidth: 68,
      hpBarYOffset: 48,
      aura: { kind: 'regeneration', label: 'Brood-Regenaura', radius: 210, healPerSecond: 6, color: 0xc18aff },
      ability: { kind: 'fan', label: 'Violet Volley', cooldown: 2700, telegraphMs: 420, speed: 245, damage: 7, source: 'elite-spitter-shot', texture: 'enemy-purple-shot', radius: 11, count: 5, spread: 0.92, color: 0xffffff, trailColor: 0x9b5cff, scale: 1.2, muzzleDistance: 42 }
    };
  }

  makeBoss() {
    return {
      ...this.makeBrute(1),
      type: 'boss',
      role: 'boss',
      displayName: 'THE BROOD KING',
      hp: 10000,
      boss: true,
      elite: true,
      entryProtectionMs: ENCOUNTER_STANDARDS.bossEntryProtectionMs,
      eliteTint: false,
      speed: 58,
      damage: 24,
      xp: 120,
      texture: 'enemy-boss-heavy',
      animation: 'enemy-boss-heavy-loop',
      scale: 0.58,
      radius: 58,
      bodyOffsetX: 70,
      bodyOffsetY: 72,
      hpBarWidth: 130,
      hpBarYOffset: 88,
      ability: { kind: 'fan', cooldown: 1900, speed: 280, damage: 12, source: 'boss-fan', texture: 'enemy-shot', radius: 8, count: 5, spread: 1.15, color: 0xff7a33, trailColor: 0xff3828, scale: 1.15, muzzleDistance: 72 },
      heavyAttackDelay: 1350,
      heavyProjectile: { cooldown: 3900, speed: 238, damage: 24, radius: 19, life: 4600, color: 0xff6824, trailColor: 0xff2a20, trailAlpha: 0.44, scale: 1.55, muzzleDistance: 82, depth: 8, pulse: true, tint: false },
      bossSequences: [
        {
          name: 'Learn the King',
          steps: [
            { kind: 'fan', telegraphMs: 460 },
            { kind: 'recovery', duration: 950 },
            { kind: 'chase', duration: 900 },
            { kind: 'fireball', telegraphMs: 620 },
            { kind: 'recovery', duration: 1200 }
          ]
        },
        {
          name: 'Royal Fury',
          steps: [
            { kind: 'fan', count: 6, spread: 1.3, telegraphMs: 520 },
            { kind: 'recovery', duration: 1000 },
            { kind: 'chase', duration: 850 },
            { kind: 'fireball', telegraphMs: 640 },
            { kind: 'recovery', duration: 1300 }
          ]
        },
        {
          name: 'Last Hatch',
          steps: [
            { kind: 'fan', count: 7, spread: 1.45, telegraphMs: 680 },
            { kind: 'recovery', duration: 950 },
            { kind: 'dash', speed: 440, duration: 520, telegraphMs: 620 },
            { kind: 'recovery', duration: 900 },
            { kind: 'fireball', speed: 255, telegraphMs: 680 },
            { kind: 'recovery', duration: 1100 },
            {
              kind: 'add-pulse',
              maxActive: 6,
              groups: [
                { kind: 'runner', count: 4, multiplier: 1 },
                { kind: 'spitter', count: 2, multiplier: 1 }
              ]
            },
            { kind: 'recovery', duration: 1300 }
          ]
        }
      ],
      bossPhases: [
        {
          name: 'Phase 2: Royal Fury',
          subtitle: 'Breiterer Faecher, sechs Adds und ein klares Atemfenster.',
          threshold: 0.65,
          speedMultiplier: 1.08,
          transitionMs: 1000,
          adds: [{ kind: 'slime', count: 6, multiplier: 1 }]
        },
        {
          name: 'Phase 3: Last Hatch',
          subtitle: 'Siebenfacher Faecher, Charge und ein begrenzter Add-Trupp.',
          threshold: 0.32,
          speedMultiplier: 1.12,
          transitionMs: 1100,
          adds: [
            { kind: 'runner', count: 4, multiplier: 1 },
            { kind: 'spitter', count: 2, multiplier: 1 }
          ]
        }
      ]
    };
  }

  getEnemyRoleMatrix() {
    return ENEMY_ROLE_MATRIX.map((role) => ({ ...role }));
  }
}
