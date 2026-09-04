import { WAVE_DEFINITIONS } from '../data/waveDefinitions.js';
import { ENCOUNTER_STANDARDS, ENEMY_ROLE_MATRIX } from '../data/enemyRoleDefinitions.js';
import { allocateBudgets, SpawnDirector } from './SpawnDirector.js';

const STRANDED_CLEANUP_GRACE_MS = 10000;
const STRANDED_CLEANUP_MAX_ENEMIES = 3;
const STRANDED_CLEANUP_ATTEMPTS = 12;

export class WaveSystem {
  constructor(scene) {
    this.scene = scene;
    this.currentWave = 0;
    this.active = false;
    this.completed = false;
    this.spawned = 0;
    this.nextSpawnAt = 0;
    this.waitingForClear = false;
    this.cleanupCandidateSince = null;
    this.cleanupRecoveries = 0;
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
      'champion-charger': () => this.makeChampionCharger(),
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
    this.resetCleanupWatch();
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

    this.recoverStrandedEnemies(time);

    // The director can spawn its final batch in this same update. The argument
    // describes the pre-spawn frame, so use the live collection before clearing
    // or advancing a wave.
    if (this.waitingForClear && this.scene.enemies.length === 0) {
      if (this.currentWave >= this.waves.length) {
        if (this.scene.pickups?.hasPendingRoyalReward()) return;
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
      this.resetCleanupWatch();
    }
  }

  resetCleanupWatch() {
    this.cleanupCandidateSince = null;
  }

  getCleanupState() {
    return {
      candidateSince: this.cleanupCandidateSince,
      recoveries: this.cleanupRecoveries,
      graceMs: STRANDED_CLEANUP_GRACE_MS,
      maxEnemies: STRANDED_CLEANUP_MAX_ENEMIES
    };
  }

  recoverStrandedEnemies(time) {
    if (!this.waitingForClear) {
      this.resetCleanupWatch();
      return 0;
    }

    const activeEnemies = this.scene.enemies.filter((enemy) => enemy.sprite?.active);
    const eligible = activeEnemies.length > 0
      && activeEnemies.length <= STRANDED_CLEANUP_MAX_ENEMIES
      && activeEnemies.every((enemy) => !enemy.boss);
    if (!eligible || this.scene.getTargetableEnemies().length > 0) {
      this.resetCleanupWatch();
      return 0;
    }

    if (this.cleanupCandidateSince === null) {
      this.cleanupCandidateSince = time;
      return 0;
    }
    if (time - this.cleanupCandidateSince < STRANDED_CLEANUP_GRACE_MS) {
      return 0;
    }

    let recovered = 0;
    activeEnemies.forEach((enemy, index) => {
      const destination = this.findCleanupRecoveryPoint(enemy, index);
      if (!destination) return;
      const distance = Math.hypot(
        enemy.sprite.x - this.scene.player.sprite.x,
        enemy.sprite.y - this.scene.player.sprite.y
      );
      enemy.dashUntil = 0;
      enemy.knockbackUntil = 0;
      enemy.sprite.setPosition(destination.x, destination.y);
      enemy.sprite.body?.reset(destination.x, destination.y);
      enemy.sprite.setVelocity?.(0, 0);
      this.scene.telemetry.record('strandedEnemyRecovered', time, {
        wave: this.currentWave,
        enemyId: enemy.id,
        enemyType: enemy.type,
        distance: Math.round(distance)
      });
      recovered += 1;
    });

    if (recovered > 0) {
      this.cleanupRecoveries += recovered;
      this.resetCleanupWatch();
    } else {
      this.cleanupCandidateSince = time;
    }
    return recovered;
  }

  findCleanupRecoveryPoint(enemy, index) {
    const player = this.scene.player.sprite;
    const bounds = this.scene.getTargetAcquisitionBounds();
    const distance = Math.max(220, Math.min(330, Math.min(bounds.visibleWidth, bounds.visibleHeight) * 0.7));
    const seed = ((enemy.id ?? 0) + index + this.cleanupRecoveries) * 2.399963229728653;
    for (let attempt = 0; attempt < STRANDED_CLEANUP_ATTEMPTS; attempt += 1) {
      const angle = seed + (attempt / STRANDED_CLEANUP_ATTEMPTS) * Math.PI * 2;
      const point = this.scene.arena.clampToWorld(
        player.x + Math.cos(angle) * distance,
        player.y + Math.sin(angle) * distance,
        80
      );
      const targetable = point.x >= bounds.x
        && point.x <= bounds.x + bounds.width
        && point.y >= bounds.y
        && point.y <= bounds.y + bounds.height;
      if (targetable
        && this.scene.arena.isInsidePlayable(point.x, point.y, 50)
        && !this.scene.arena.overlapsObstacle(point.x, point.y, 42)) {
        return point;
      }
    }
    return null;
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
    const xpShares = this.getXpSegmentShares(wave, segments);
    const shareTotal = xpShares.reduce((sum, share) => sum + share, 0) || 1;
    let offset = 0;
    enemyBudgets.forEach((enemyCount, segmentIndex) => {
      const group = queue.slice(offset, offset + enemyCount);
      const segmentBudget = budget * ((xpShares[segmentIndex] ?? 0) / shareTotal);
      const weightTotal = group.reduce((sum, enemy) => sum + this.getXpWeight(enemy), 0) || 1;
      group.forEach((enemy) => {
        enemy.xpOverride = segmentBudget * (this.getXpWeight(enemy) / weightTotal);
      });
      offset += enemyCount;
    });
    return queue;
  }

  getXpSegmentShares(wave, segments) {
    const configured = wave.xpCurve?.segmentShares;
    if (Array.isArray(configured)
      && configured.length === segments.length
      && configured.every((share) => Number.isFinite(share) && share >= 0)
      && configured.some((share) => share > 0)) {
      return [...configured];
    }
    return segments.map((segment) => Math.max(0, segment.share ?? 0));
  }

  getXpWeight(enemy) {
    if (enemy.microFodder) return 0.2;
    if (enemy.champion) return 2.2;
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
        xpCurve: {
          ...wave.xpCurve,
          segmentShares: wave.xpCurve?.segmentShares ? [...wave.xpCurve.segmentShares] : null
        },
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
      displayName: 'Kernel Crawler',
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
    return { type: 'runner', role: 'runner', hp: Math.round(36 * multiplier), speed: 118, damage: 7, xp: 5, texture: 'enemy-runner-run', animation: 'enemy-runner-run-left', directionalAnimationPrefix: 'enemy-runner-run', scale: 0.22, radius: 22, bodyOffsetX: 106, bodyOffsetY: 124, hpBarWidth: 36, hpBarYOffset: 27 };
  }

  makeBrute(multiplier = 1) {
    return { type: 'brute', role: 'tank', hp: Math.round(145 * multiplier), speed: 68, damage: 12, xp: 12, texture: 'enemy-brute-run', animation: 'enemy-brute-run-left', directionalAnimationPrefix: 'enemy-brute-run', animationSet: this.makeAnimationSet('enemy-brute'), scale: 0.28, radius: 35, bodyOffsetX: 93, bodyOffsetY: 107, hpBarWidth: 56, hpBarYOffset: 43 };
  }

  makeSpitter(multiplier = 1) {
    return { ...this.makeSlime(0.9 * multiplier), type: 'spitter', role: 'shooter', hp: Math.round(68 * multiplier), speed: 56, damage: 7, xp: 9, texture: 'enemy-spitter-run', animation: 'enemy-spitter-run-left', directionalAnimationPrefix: 'enemy-spitter-run', animationSet: this.makeAnimationSet('enemy-spitter'), scale: 0.25, radius: 26, bodyOffsetX: 101, bodyOffsetY: 102, ability: { kind: 'shoot', cooldown: 2350, speed: 230, damage: 7, source: 'spitter-shot', texture: 'enemy-shot', radius: 8, color: 0x7cff67, trailColor: 0x4dea7e, scale: 1.18 } };
  }

  makeFanSpitter(multiplier = 1) {
    return { ...this.makeSlime(1.05 * multiplier), type: 'fan-spitter', role: 'area-denial', hp: Math.round(80 * multiplier), speed: 50, damage: 8, xp: 12, texture: 'enemy-fan-spitter-run', animation: 'enemy-fan-spitter-run-left', directionalAnimationPrefix: 'enemy-fan-spitter-run', animationSet: this.makeAnimationSet('enemy-fan-spitter'), scale: 0.29, radius: 31, bodyOffsetX: 97, bodyOffsetY: 100, hpBarWidth: 48, hpBarYOffset: 36, ability: { kind: 'fan', cooldown: 3300, speed: 210, damage: 5, source: 'fan-spitter-shot', texture: 'enemy-blue-shot', radius: 10, count: 3, spread: 0.75, color: 0xffffff, trailColor: 0x51a8ff, scale: 1.18, muzzleDistance: 36 } };
  }

  makeBomber(multiplier = 1) {
    return { ...this.makeRunner(0.95 * multiplier), type: 'bomber', role: 'exploder', hp: Math.round(72 * multiplier), speed: 94, damage: 10, xp: 10, texture: 'enemy-bomber-run', animation: 'enemy-bomber-run-left', animationSet: this.makeAnimationSet('enemy-bomber'), directionalAnimationPrefix: 'enemy-bomber-run', scale: 0.28, radius: 29, bodyOffsetX: 99, bodyOffsetY: 100, hpBarWidth: 46, hpBarYOffset: 36, explodeOnDeath: true, explosionRadius: 86, explosionDamage: 18 };
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
      texture: 'enemy-support-run',
      animation: 'enemy-support-run-left',
      animationSet: null,
      directionalAnimationPrefix: 'enemy-support-run',
      tint: null,
      scale: 0.28,
      radius: 29,
      bodyOffsetX: 99,
      bodyOffsetY: 106,
      hpBarYOffset: 36,
      ability: null,
      aura: {
        kind: 'regeneration',
        label: 'Regeneration Aura',
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
      texture: 'enemy-summoner-run',
      animation: 'enemy-summoner-run-left',
      animationSet: null,
      directionalAnimationPrefix: 'enemy-summoner-run',
      tint: null,
      scale: 0.3,
      radius: 30,
      bodyOffsetX: 98,
      bodyOffsetY: 104,
      hpBarYOffset: 38,
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
      texture: 'enemy-elite-runner-run',
      animation: 'enemy-elite-runner-run-left',
      directionalAnimationPrefix: 'enemy-elite-runner-run',
      scale: 0.34,
      radius: 29,
      bodyOffsetX: 99,
      bodyOffsetY: 100,
      hpBarWidth: 62,
      hpBarYOffset: 42,
      aura: { kind: 'haste', label: 'Haste Aura', radius: 185, multiplier: 1.2, color: 0xffd35c },
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
      animation: null,
      animationSet: this.makeAnimationSet('enemy-elite-brute'),
      directionalAnimationPrefix: null,
      scale: 0.39,
      radius: 41,
      bodyOffsetX: 87,
      bodyOffsetY: 91,
      hpBarWidth: 74,
      hpBarYOffset: 56,
      aura: { kind: 'armor', label: 'Armor Aura', radius: 205, reduction: 0.22, color: 0x6bd8ff },
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
      texture: 'enemy-elite-spitter-run',
      animation: 'enemy-elite-spitter-run-left',
      animationSet: this.makeAnimationSet('enemy-elite-spitter'),
      directionalAnimationPrefix: 'enemy-elite-spitter-run',
      scale: 0.34,
      radius: 36,
      bodyOffsetX: 92,
      bodyOffsetY: 93,
      hpBarWidth: 68,
      hpBarYOffset: 48,
      aura: { kind: 'regeneration', label: 'Brood Regeneration Aura', radius: 210, healPerSecond: 6, color: 0xc18aff },
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
      texture: 'enemy-boss-run',
      animation: 'enemy-boss-run-left',
      animationSet: null,
      directionalAnimationPrefix: 'enemy-boss-run',
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
          subtitle: 'Wider fan shots, six adds, and a clear breathing window.',
          threshold: 0.65,
          speedMultiplier: 1.08,
          transitionMs: 1000,
          adds: [{ kind: 'slime', count: 6, multiplier: 1 }]
        },
        {
          name: 'Phase 3: Last Hatch',
          subtitle: 'Seven-shot fan, charge, and a limited add squad.',
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

  makeChampionCharger() {
    return {
      ...this.makeEliteRunner(),
      type: 'champion-charger',
      role: 'runner',
      displayName: 'Stormclaw Champion',
      elite: false,
      champion: true,
      hp: 520,
      speed: 112,
      damage: 15,
      xp: 30,
      tint: 0xffd475,
      scale: 0.32,
      radius: 28,
      hpBarWidth: 58,
      hpBarYOffset: 40,
      aura: null,
      ability: {
        kind: 'dash',
        label: 'Stormclaw Charge',
        cooldown: 4200,
        telegraphMs: 520,
        speed: 455,
        duration: 460,
        color: 0xffd35c
      }
    };
  }

  makeAnimationSet(prefix) {
    return {
      move: `${prefix}-move`,
      windup: `${prefix}-windup`,
      resolve: `${prefix}-resolve`,
      recovery: `${prefix}-recovery`
    };
  }
}
