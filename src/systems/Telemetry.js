const FRAME_SAMPLE_LIMIT = 3600;
const EVENT_LIMIT = 6000;

function increment(target, key, amount = 1) {
  target[key] = (target[key] ?? 0) + amount;
}

function percentile(values, ratio) {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

function cloneObjectStats(stats = {}) {
  return Object.fromEntries(
    Object.entries(stats).map(([key, value]) => [key, Number.isFinite(value) ? value : 0])
  );
}

export class Telemetry {
  constructor(metadata = {}) {
    this.metadata = { ...metadata };
    this.reset();
  }

  reset() {
    this.events = [];
    this.waveStats = new Map();
    this.enemyLifetimes = new Map();
    this.frameSamples = [];
    this.summary = {
      seed: this.metadata.seed ?? null,
      profile: this.metadata.profile ?? 'manual',
      roosterId: null,
      startedAt: 0,
      endedAt: null,
      frames: 0,
      shots: 0,
      hits: 0,
      kills: 0,
      enemiesSpawned: 0,
      damageDealt: 0,
      effectiveDamage: 0,
      overkillDamage: 0,
      damageBySource: {},
      shotsBySource: {},
      hitsBySource: {},
      effectiveDamageBySource: {},
      overkillBySource: {},
      killsBySource: {},
      damageTaken: 0,
      healingReceived: 0,
      damageTakenBySource: {},
      playerDamageEvents: 0,
      deathCause: null,
      xpCollected: 0,
      levelUps: 0,
      upgradeOffers: 0,
      upgradeChoices: 0,
      upgradePauseMs: 0,
      chestsFound: 0,
      chestChoices: 0,
      chestPauseMs: 0,
      pickupsSpawned: 0,
      pickupsCollected: 0,
      pickupsSpawnedByKind: {},
      pickupsCollectedByKind: {},
      maxEnemiesAlive: 0,
      maxProjectilesAlive: 0,
      peakObjects: {},
      maxIdleMs: 0,
      idleMs: 0,
      maxDangerMs: 0,
      dangerMs: 0,
      minHpRatio: 1,
      droppedObjects: 0,
      lastError: null,
      outcome: 'running'
    };
    this.lastSampleTime = 0;
  }

  record(type, time, payload = {}) {
    if (this.events.length >= EVENT_LIMIT) {
      this.events.shift();
    }
    this.events.push({ type, time, ...payload });

    if (type === 'pickupSpawned') {
      this.summary.pickupsSpawned += 1;
      increment(this.summary.pickupsSpawnedByKind, payload.kind);
    }
    if (type === 'pickupCollected') {
      this.summary.pickupsCollected += 1;
      increment(this.summary.pickupsCollectedByKind, payload.kind);
    }

    if (type === 'waveStarted') {
      this.waveStats.set(payload.wave, {
        wave: payload.wave,
        startedAt: time,
        endedAt: null,
        durationMs: null,
        enemiesSpawned: 0,
        kills: 0,
        shots: 0,
        hits: 0,
        damageDealt: 0,
        damageTaken: 0,
        xpCollected: 0,
        levelUps: 0,
        upgradeOffers: 0,
        upgradeChoices: 0,
        maxEnemiesAlive: 0,
        peakObjects: {},
        minHpRatio: 1,
        outcome: 'running'
      });
    }

    const wave = payload.wave ?? this.currentWave();
    const stat = this.waveStats.get(wave);
    if (!stat) {
      return;
    }
    if (type === 'waveCompleted') {
      stat.endedAt = time;
      stat.durationMs = time - stat.startedAt;
      stat.outcome = 'completed';
    }
    if (type === 'enemySpawned') stat.enemiesSpawned += 1;
    if (type === 'enemyKilled') stat.kills += 1;
    if (type === 'projectileFired') stat.shots += payload.count ?? 1;
    if (type === 'projectileHit') stat.hits += 1;
    if (type === 'damageDealt') stat.damageDealt += payload.effective ?? payload.amount ?? 0;
    if (type === 'playerDamaged') stat.damageTaken += payload.amount ?? 0;
    if (type === 'xpCollected') stat.xpCollected += payload.amount ?? 0;
    if (type === 'levelUp') stat.levelUps += 1;
    if (type === 'upgradeOffered' && payload.selectionType === 'level') stat.upgradeOffers += 1;
    if (type === 'upgradeChosen' && payload.selectionType === 'level') stat.upgradeChoices += 1;
  }

  sample(time, state) {
    const delta = this.lastSampleTime > 0 ? time - this.lastSampleTime : 0;
    this.lastSampleTime = time;
    if (this.summary.startedAt === 0) {
      this.summary.startedAt = time;
    }
    this.summary.frames += 1;
    if (delta > 0 && delta < 1000) {
      if (this.frameSamples.length >= FRAME_SAMPLE_LIMIT) {
        this.frameSamples.shift();
      }
      this.frameSamples.push(delta);
    }
    this.summary.maxEnemiesAlive = Math.max(this.summary.maxEnemiesAlive, state.enemiesAlive);
    this.summary.maxProjectilesAlive = Math.max(this.summary.maxProjectilesAlive, state.projectilesAlive);
    this.summary.minHpRatio = Math.min(this.summary.minHpRatio, state.hpRatio);
    Object.entries(state.objects ?? {}).forEach(([key, value]) => {
      this.summary.peakObjects[key] = Math.max(this.summary.peakObjects[key] ?? 0, value);
    });
    this.summary.droppedObjects = Object.values(state.poolStats ?? {})
      .reduce((total, pool) => total + (pool?.dropped ?? 0), 0);

    const stat = this.waveStats.get(state.wave);
    if (stat) {
      stat.maxEnemiesAlive = Math.max(stat.maxEnemiesAlive, state.enemiesAlive);
      stat.minHpRatio = Math.min(stat.minHpRatio, state.hpRatio);
      Object.entries(state.objects ?? {}).forEach(([key, value]) => {
        stat.peakObjects[key] = Math.max(stat.peakObjects[key] ?? 0, value);
      });
    }

    if (state.enemiesAlive === 0) {
      this.summary.idleMs += delta;
      this.summary.maxIdleMs = Math.max(this.summary.maxIdleMs, this.summary.idleMs);
    } else {
      this.summary.idleMs = 0;
    }

    if (state.nearestEnemyDistance < 120 || state.hpRatio < 0.45) {
      this.summary.dangerMs += delta;
      this.summary.maxDangerMs = Math.max(this.summary.maxDangerMs, this.summary.dangerMs);
    } else {
      this.summary.dangerMs = 0;
    }
  }

  addEnemySpawn(enemy, time, wave) {
    this.summary.enemiesSpawned += 1;
    this.enemyLifetimes.set(enemy.id, {
      id: enemy.id,
      type: enemy.type,
      spawnedAt: time,
      maxHp: enemy.maxHp
    });
    this.record('enemySpawned', time, { wave, id: enemy.id, enemyType: enemy.type });
  }

  addShot(count, time, wave, source = 'base-egg') {
    this.summary.shots += count;
    increment(this.summary.shotsBySource, source, count);
    this.record('projectileFired', time, { count, wave, source });
  }

  addHit(time, wave, source = 'base-egg') {
    this.summary.hits += 1;
    increment(this.summary.hitsBySource, source);
    this.record('projectileHit', time, { wave, source });
  }

  addDamageDealt({ amount, effective, overkill, source = 'base-egg', enemyId, enemyType, time, wave }) {
    this.summary.damageDealt += amount;
    this.summary.effectiveDamage += effective;
    this.summary.overkillDamage += overkill;
    increment(this.summary.damageBySource, source, amount);
    increment(this.summary.effectiveDamageBySource, source, effective);
    increment(this.summary.overkillBySource, source, overkill);
    const lifetime = this.enemyLifetimes.get(enemyId);
    if (lifetime && lifetime.firstDamageAt === undefined && effective > 0) {
      lifetime.firstDamageAt = time;
    }
    this.record('damageDealt', time, {
      wave,
      source,
      amount,
      effective,
      overkill,
      enemyId,
      enemyType
    });
  }

  addKill(time, wave, type, enemyId, source = 'base-egg') {
    this.summary.kills += 1;
    increment(this.summary.killsBySource, source);
    const lifetime = this.enemyLifetimes.get(enemyId);
    const ttkMs = lifetime
      ? Math.max(0, time - (lifetime.firstDamageAt ?? lifetime.spawnedAt))
      : null;
    if (lifetime) {
      this.enemyLifetimes.delete(enemyId);
    }
    this.record('enemyKilled', time, { wave, enemyType: type, enemyId, source, ttkMs });
  }

  addDamageTaken(amount, time, wave, source = 'contact', options = {}) {
    this.summary.damageTaken += amount;
    this.summary.playerDamageEvents += 1;
    increment(this.summary.damageTakenBySource, source, amount);
    if (options.lethal) {
      this.summary.deathCause = source;
    }
    this.record('playerDamaged', time, { amount, wave, source, lethal: options.lethal ?? false });
  }

  addHealing(amount, time, wave, source = 'wave-recovery') {
    this.summary.healingReceived += amount;
    this.record('playerHealed', time, { amount, wave, source });
  }

  addXp(amount, time, wave) {
    this.summary.xpCollected += amount;
    this.record('xpCollected', time, { amount, wave });
  }

  addLevelUp(time, wave, level) {
    this.summary.levelUps += 1;
    this.record('levelUp', time, { wave, level });
  }

  addUpgradeOffer(time, wave, choices, selectionType = 'level') {
    if (selectionType === 'level') {
      this.summary.upgradeOffers += 1;
    }
    this.record('upgradeOffered', time, {
      wave,
      selectionType,
      choices: choices.map((choice) => choice.id)
    });
  }

  addUpgradeChoice(time, wave, upgrade, pauseMs, selectionType = 'level') {
    if (selectionType === 'level') {
      this.summary.upgradeChoices += 1;
      this.summary.upgradePauseMs += pauseMs;
    }
    this.record('upgradeChosen', time, {
      wave,
      upgrade: upgrade.id,
      category: upgrade.category,
      pauseMs,
      selectionType
    });
  }

  addChestFound(time, wave, kind) {
    this.summary.chestsFound += 1;
    this.record('chestFound', time, { wave, kind });
  }

  addChestChoice(time, wave, kind, upgrade, pauseMs) {
    this.summary.chestChoices += 1;
    this.summary.chestPauseMs += pauseMs;
    this.record('chestChosen', time, { wave, kind, upgrade: upgrade.id, pauseMs });
  }

  finish(time, outcome) {
    this.summary.endedAt = time;
    this.summary.outcome = outcome;
    this.record(outcome, time, { deathCause: this.summary.deathCause });
  }

  currentWave() {
    if (this.waveStats.size === 0) {
      return 0;
    }
    return Math.max(...this.waveStats.keys());
  }

  getFrameStats() {
    const total = this.frameSamples.reduce((sum, value) => sum + value, 0);
    return {
      samples: this.frameSamples.length,
      averageMs: this.frameSamples.length ? total / this.frameSamples.length : 0,
      p95Ms: percentile(this.frameSamples, 0.95),
      p99Ms: percentile(this.frameSamples, 0.99),
      maxMs: this.frameSamples.length ? Math.max(...this.frameSamples) : 0,
      over16Ms: this.frameSamples.filter((value) => value > 16.8).length,
      over33Ms: this.frameSamples.filter((value) => value > 33.4).length
    };
  }

  getTtkStats() {
    const killed = this.events.filter((event) => event.type === 'enemyKilled' && event.ttkMs !== null);
    const byType = {};
    killed.forEach((event) => {
      const entry = byType[event.enemyType] ?? { count: 0, totalMs: 0, minMs: Infinity, maxMs: 0 };
      entry.count += 1;
      entry.totalMs += event.ttkMs;
      entry.minMs = Math.min(entry.minMs, event.ttkMs);
      entry.maxMs = Math.max(entry.maxMs, event.ttkMs);
      byType[event.enemyType] = entry;
    });
    return Object.fromEntries(Object.entries(byType).map(([type, entry]) => [type, {
      count: entry.count,
      averageMs: entry.totalMs / entry.count,
      minMs: entry.minMs,
      maxMs: entry.maxMs
    }]));
  }

  getProgressionStats(now = 0) {
    const regularChoices = this.events.filter((event) => (
      event.type === 'upgradeChosen' && event.selectionType === 'level'
    ));
    const choiceTimes = regularChoices.map((event) => Math.max(0, event.time - this.summary.startedAt));
    const intervalsMs = choiceTimes.slice(1).map((time, index) => time - choiceTimes[index]);
    const spectacular = regularChoices.find((event) => (
      ['active', 'orbit', 'summon'].includes(event.category)
    ));
    const elapsedMs = Math.max(1, (this.summary.endedAt ?? now) - this.summary.startedAt);
    const totalPauseMs = this.summary.upgradePauseMs + this.summary.chestPauseMs;
    return {
      choices: regularChoices.map((event) => event.upgrade),
      firstUpgradeAtMs: choiceTimes[0] ?? null,
      firstSpectacleAtMs: spectacular
        ? Math.max(0, spectacular.time - this.summary.startedAt)
        : null,
      intervalsMs,
      averageIntervalMs: intervalsMs.length
        ? intervalsMs.reduce((sum, value) => sum + value, 0) / intervalsMs.length
        : null,
      minIntervalMs: intervalsMs.length ? Math.min(...intervalsMs) : null,
      maxIntervalMs: intervalsMs.length ? Math.max(...intervalsMs) : null,
      totalPauseMs,
      pauseRatio: totalPauseMs / elapsedMs
    };
  }

  getCombatSourceReport() {
    const keys = new Set([
      ...Object.keys(this.summary.damageBySource),
      ...Object.keys(this.summary.shotsBySource),
      ...Object.keys(this.summary.hitsBySource),
      ...Object.keys(this.summary.killsBySource)
    ]);
    const totalEffective = Math.max(1, this.summary.effectiveDamage);
    return [...keys].map((source) => {
      const sourceEvents = this.events.filter((event) => (
        event.source === source
        && ['projectileFired', 'projectileHit', 'damageDealt', 'enemyKilled'].includes(event.type)
      ));
      const firstAt = sourceEvents[0]?.time ?? null;
      const lastAt = sourceEvents[sourceEvents.length - 1]?.time ?? firstAt;
      const shots = this.summary.shotsBySource[source] ?? 0;
      const hits = this.summary.hitsBySource[source] ?? 0;
      const damage = this.summary.damageBySource[source] ?? 0;
      const effectiveDamage = this.summary.effectiveDamageBySource[source] ?? 0;
      const overkill = this.summary.overkillBySource[source] ?? 0;
      return {
        source,
        shots,
        hits,
        hitRate: shots > 0 ? Math.min(1, hits / shots) : null,
        damage,
        effectiveDamage,
        damageShare: effectiveDamage / totalEffective,
        overkill,
        overkillRatio: damage > 0 ? overkill / damage : 0,
        kills: this.summary.killsBySource[source] ?? 0,
        firstAt,
        lastAt,
        usageMs: firstAt === null ? 0 : Math.max(0, lastAt - firstAt)
      };
    }).sort((a, b) => b.effectiveDamage - a.effectiveDamage || b.kills - a.kills);
  }

  getEventSequence(types = []) {
    const accepted = new Set(types);
    return this.events
      .filter((event) => !accepted.size || accepted.has(event.type))
      .map((event) => ({ ...event }));
  }

  getSummary(now = 0) {
    const waveStats = Array.from(this.waveStats.values()).map((wave) => ({
      ...wave,
      peakObjects: cloneObjectStats(wave.peakObjects),
      durationMs: wave.durationMs ?? (wave.startedAt ? now - wave.startedAt : null)
    }));
    return {
      ...this.summary,
      damageBySource: cloneObjectStats(this.summary.damageBySource),
      shotsBySource: cloneObjectStats(this.summary.shotsBySource),
      hitsBySource: cloneObjectStats(this.summary.hitsBySource),
      effectiveDamageBySource: cloneObjectStats(this.summary.effectiveDamageBySource),
      overkillBySource: cloneObjectStats(this.summary.overkillBySource),
      killsBySource: cloneObjectStats(this.summary.killsBySource),
      damageTakenBySource: cloneObjectStats(this.summary.damageTakenBySource),
      pickupsSpawnedByKind: cloneObjectStats(this.summary.pickupsSpawnedByKind),
      pickupsCollectedByKind: cloneObjectStats(this.summary.pickupsCollectedByKind),
      peakObjects: cloneObjectStats(this.summary.peakObjects),
      frameTimes: this.getFrameStats(),
      ttkByEnemyType: this.getTtkStats(),
      progression: this.getProgressionStats(now),
      combatSources: this.getCombatSourceReport(),
      elapsedMs: (this.summary.endedAt ?? now) - this.summary.startedAt,
      waves: waveStats,
      eventCount: this.events.length
    };
  }
}
