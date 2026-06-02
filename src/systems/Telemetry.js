export class Telemetry {
  constructor() {
    this.reset();
  }

  reset() {
    this.events = [];
    this.waveStats = new Map();
    this.summary = {
      startedAt: 0,
      endedAt: null,
      frames: 0,
      shots: 0,
      hits: 0,
      kills: 0,
      enemiesSpawned: 0,
      damageTaken: 0,
      playerDamageEvents: 0,
      xpCollected: 0,
      levelUps: 0,
      upgradeOffers: 0,
      upgradeChoices: 0,
      upgradePauseMs: 0,
      maxEnemiesAlive: 0,
      maxProjectilesAlive: 0,
      maxIdleMs: 0,
      idleMs: 0,
      maxDangerMs: 0,
      dangerMs: 0,
      minHpRatio: 1,
      lastError: null,
      outcome: 'running'
    };
    this.lastSampleTime = 0;
  }

  record(type, time, payload = {}) {
    this.events.push({ type, time, ...payload });

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
        damageTaken: 0,
        xpCollected: 0,
        levelUps: 0,
        upgradeOffers: 0,
        upgradeChoices: 0,
        maxEnemiesAlive: 0,
        minHpRatio: 1,
        outcome: 'running'
      });
    }

    const wave = payload.wave ?? this.currentWave();
    const stat = this.waveStats.get(wave);
    if (stat) {
      if (type === 'waveCompleted') {
        stat.endedAt = time;
        stat.durationMs = time - stat.startedAt;
        stat.outcome = 'completed';
      }
      if (type === 'enemySpawned') stat.enemiesSpawned += 1;
      if (type === 'enemyKilled') stat.kills += 1;
      if (type === 'projectileFired') stat.shots += payload.count ?? 1;
      if (type === 'projectileHit') stat.hits += 1;
      if (type === 'playerDamaged') stat.damageTaken += payload.amount ?? 0;
      if (type === 'xpCollected') stat.xpCollected += payload.amount ?? 0;
      if (type === 'levelUp') stat.levelUps += 1;
      if (type === 'upgradeOffered') stat.upgradeOffers += 1;
      if (type === 'upgradeChosen') stat.upgradeChoices += 1;
    }
  }

  sample(time, state) {
    const delta = this.lastSampleTime > 0 ? time - this.lastSampleTime : 0;
    this.lastSampleTime = time;
    this.summary.frames += 1;
    this.summary.maxEnemiesAlive = Math.max(this.summary.maxEnemiesAlive, state.enemiesAlive);
    this.summary.maxProjectilesAlive = Math.max(this.summary.maxProjectilesAlive, state.projectilesAlive);
    this.summary.minHpRatio = Math.min(this.summary.minHpRatio, state.hpRatio);

    const stat = this.waveStats.get(state.wave);
    if (stat) {
      stat.maxEnemiesAlive = Math.max(stat.maxEnemiesAlive, state.enemiesAlive);
      stat.minHpRatio = Math.min(stat.minHpRatio, state.hpRatio);
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

  addShot(count, time, wave) {
    this.summary.shots += count;
    this.record('projectileFired', time, { count, wave });
  }

  addHit(time, wave) {
    this.summary.hits += 1;
    this.record('projectileHit', time, { wave });
  }

  addKill(time, wave, type) {
    this.summary.kills += 1;
    this.record('enemyKilled', time, { wave, type });
  }

  addDamageTaken(amount, time, wave) {
    this.summary.damageTaken += amount;
    this.summary.playerDamageEvents += 1;
    this.record('playerDamaged', time, { amount, wave });
  }

  addXp(amount, time, wave) {
    this.summary.xpCollected += amount;
    this.record('xpCollected', time, { amount, wave });
  }

  addLevelUp(time, wave, level) {
    this.summary.levelUps += 1;
    this.record('levelUp', time, { wave, level });
  }

  addUpgradeOffer(time, wave, choices) {
    this.summary.upgradeOffers += 1;
    this.record('upgradeOffered', time, { wave, choices: choices.map((choice) => choice.id) });
  }

  addUpgradeChoice(time, wave, upgrade, pauseMs) {
    this.summary.upgradeChoices += 1;
    this.summary.upgradePauseMs += pauseMs;
    this.record('upgradeChosen', time, { wave, upgrade: upgrade.id, pauseMs });
  }

  finish(time, outcome) {
    this.summary.endedAt = time;
    this.summary.outcome = outcome;
    this.record(outcome, time);
  }

  currentWave() {
    if (this.waveStats.size === 0) {
      return 0;
    }
    return Math.max(...this.waveStats.keys());
  }

  getSummary(now = 0) {
    const waveStats = Array.from(this.waveStats.values()).map((wave) => ({
      ...wave,
      durationMs: wave.durationMs ?? (wave.startedAt ? now - wave.startedAt : null)
    }));
    return {
      ...this.summary,
      elapsedMs: this.summary.endedAt ?? now,
      waves: waveStats,
      eventCount: this.events.length
    };
  }
}
