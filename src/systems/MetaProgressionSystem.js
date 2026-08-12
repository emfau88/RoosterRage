import { CHALLENGE_DEFINITIONS } from '../data/challengeDefinitions.js';
import { ENEMY_ROLE_MATRIX } from '../data/enemyRoleDefinitions.js';
import {
  CHALLENGE_REWARD_MULTIPLIERS,
  FIRST_CLEAR_REWARDS,
  LEGACY_META_STORAGE_KEYS,
  MASTERY_KERNEL_REWARDS,
  MASTERY_THRESHOLDS,
  META_STORAGE_KEY,
  TALENT_DEFINITIONS
} from '../data/metaProgressionDefinitions.js';
import { UPGRADE_DEFINITIONS } from '../data/upgradeDefinitions.js';

const MAX_HISTORY = 10;
const ROOSTER_IDS = ['ace', 'artillery', 'storm'];

const ROOSTER_UNLOCKS = {
  ace: { type: 'default', target: 0, label: 'Start-Rooster' },
  artillery: { type: 'totalKills', target: 75, label: '75 Gegner besiegen' },
  storm: { type: 'victories', target: 1, label: 'Einen Run gewinnen' }
};

const COSMETICS = [
  {
    id: 'ace-sunrise',
    roosterId: 'ace',
    name: 'Sunrise Comb',
    tint: 0xffe29a,
    unlock: { type: 'totalKills', target: 100, label: '100 Gegner besiegen' }
  },
  {
    id: 'artillery-ironclad',
    roosterId: 'artillery',
    name: 'Ironclad Plating',
    tint: 0xc7d9e5,
    unlock: { type: 'roosterWins', roosterId: 'artillery', target: 1, label: 'Mit Boombardier gewinnen' }
  },
  {
    id: 'storm-violet',
    roosterId: 'storm',
    name: 'Violet Arc',
    tint: 0xd3a8ff,
    unlock: { type: 'roosterWins', roosterId: 'storm', target: 1, label: 'Mit Stormcrest gewinnen' }
  }
];

const EXTRA_ENEMIES = [
  { id: 'elite-runner', purpose: 'Gilded Talon: Tempo-Aura und Dash', counterplay: 'Dash-Linie früh verlassen' },
  { id: 'elite-brute', purpose: 'Iron Brooder: Panzer-Aura und Slam', counterplay: 'Slam-Ring räumen' },
  { id: 'elite-spitter', purpose: 'Violet Matron: Regeneration und Fächer', counterplay: 'Matron priorisieren' },
  { id: 'boss', purpose: 'THE BROOD KING: drei Phasen', counterplay: 'Fächer lesen, Feuerball weit führen' }
];

function defaultState() {
  return {
    version: 2,
    kernels: 0,
    lifetimeKernels: 0,
    talentRanks: {},
    roosterMastery: {},
    firstClearClaims: [],
    totalRuns: 0,
    victories: 0,
    totalKills: 0,
    bossDefeats: 0,
    roosterRuns: {},
    roosterWins: {},
    unlockedRoosters: ['ace'],
    unlockedChallenges: ['standard'],
    unlockedCosmetics: [],
    selectedChallenge: 'standard',
    selectedCosmetics: {},
    discoveredEnemies: [],
    discoveredEvolutions: [],
    bests: {
      highestKills: 0,
      longestRunMs: 0,
      fastestVictoryMs: null
    },
    history: []
  };
}

function unique(values) {
  return [...new Set(values)];
}

function finiteInteger(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : fallback;
}

function masteryLevelForXp(xp) {
  let level = 1;
  MASTERY_THRESHOLDS.forEach((threshold, index) => {
    if (xp >= threshold) level = index + 1;
  });
  return Math.min(MASTERY_THRESHOLDS.length, level);
}

function sanitizeState(input, migrationGrant = 0) {
  const defaults = defaultState();
  const validChallenges = new Set(CHALLENGE_DEFINITIONS.map((challenge) => challenge.id));
  const validCosmetics = new Set(COSMETICS.map((cosmetic) => cosmetic.id));
  const validTalents = new Map(TALENT_DEFINITIONS.map((talent) => [talent.id, talent]));
  const state = {
    ...defaults,
    ...input,
    version: 2,
    kernels: finiteInteger(input?.kernels, migrationGrant),
    lifetimeKernels: finiteInteger(input?.lifetimeKernels, migrationGrant),
    totalRuns: finiteInteger(input?.totalRuns),
    victories: finiteInteger(input?.victories),
    totalKills: finiteInteger(input?.totalKills),
    bossDefeats: finiteInteger(input?.bossDefeats),
    roosterRuns: {},
    roosterWins: {},
    talentRanks: {},
    roosterMastery: {},
    selectedCosmetics: {},
    bests: {
      highestKills: finiteInteger(input?.bests?.highestKills),
      longestRunMs: finiteInteger(input?.bests?.longestRunMs),
      fastestVictoryMs: input?.bests?.fastestVictoryMs === null
        ? null
        : finiteInteger(input?.bests?.fastestVictoryMs, null)
    },
    history: Array.isArray(input?.history) ? input.history.slice(0, MAX_HISTORY) : []
  };
  ROOSTER_IDS.forEach((id) => {
    state.roosterRuns[id] = finiteInteger(input?.roosterRuns?.[id]);
    state.roosterWins[id] = finiteInteger(input?.roosterWins?.[id]);
    state.roosterMastery[id] = { xp: finiteInteger(input?.roosterMastery?.[id]?.xp) };
    const cosmeticId = input?.selectedCosmetics?.[id];
    state.selectedCosmetics[id] = validCosmetics.has(cosmeticId) ? cosmeticId : null;
  });
  Object.entries(input?.talentRanks ?? {}).forEach(([id, rank]) => {
    const talent = validTalents.get(id);
    if (talent) state.talentRanks[id] = Math.min(talent.maxRank, finiteInteger(rank));
  });
  state.firstClearClaims = unique(Array.isArray(input?.firstClearClaims)
    ? input.firstClearClaims.filter((id) => validChallenges.has(id))
    : []);
  state.unlockedRoosters = unique(Array.isArray(input?.unlockedRoosters)
    ? input.unlockedRoosters.filter((id) => ROOSTER_IDS.includes(id))
    : defaults.unlockedRoosters);
  state.unlockedChallenges = unique(Array.isArray(input?.unlockedChallenges)
    ? input.unlockedChallenges.filter((id) => validChallenges.has(id))
    : defaults.unlockedChallenges);
  state.unlockedCosmetics = unique(Array.isArray(input?.unlockedCosmetics)
    ? input.unlockedCosmetics.filter((id) => validCosmetics.has(id))
    : []);
  state.discoveredEnemies = unique(Array.isArray(input?.discoveredEnemies) ? input.discoveredEnemies : []);
  state.discoveredEvolutions = unique(Array.isArray(input?.discoveredEvolutions) ? input.discoveredEvolutions : []);
  state.selectedChallenge = validChallenges.has(input?.selectedChallenge)
    ? input.selectedChallenge
    : 'standard';
  return state;
}

function legacyMigrationGrant(state) {
  return Math.min(220,
    finiteInteger(state?.totalRuns) * 8
    + finiteInteger(state?.victories) * 12
    + Math.floor(finiteInteger(state?.totalKills) / 50) * 2);
}

export class MetaProgressionSystem {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.lastRunReward = null;
    this.state = this.load();
    this.evaluateUnlocks();
  }

  parseStored(key) {
    try {
      const raw = this.storage?.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  load() {
    const current = this.parseStored(META_STORAGE_KEY);
    if (current) return sanitizeState(current);
    for (const key of LEGACY_META_STORAGE_KEYS) {
      const legacy = this.parseStored(key);
      if (legacy) return sanitizeState(legacy, legacyMigrationGrant(legacy));
    }
    return defaultState();
  }

  save() {
    try {
      this.storage?.setItem(META_STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Storage can be unavailable in privacy modes; the current session remains playable.
    }
  }

  meets(requirement) {
    if (!requirement || requirement.type === 'default') return true;
    if (requirement.type === 'roosterWins') {
      return (this.state.roosterWins[requirement.roosterId] ?? 0) >= requirement.target;
    }
    return (this.state[requirement.type] ?? 0) >= requirement.target;
  }

  evaluateUnlocks() {
    this.state.unlockedRoosters = unique([
      ...this.state.unlockedRoosters,
      ...Object.entries(ROOSTER_UNLOCKS)
        .filter(([, requirement]) => this.meets(requirement))
        .map(([id]) => id)
    ]);
    this.state.unlockedChallenges = unique([
      ...this.state.unlockedChallenges,
      ...CHALLENGE_DEFINITIONS
        .filter((challenge) => this.meets(challenge.unlock))
        .map((challenge) => challenge.id)
    ]);
    this.state.unlockedCosmetics = unique([
      ...this.state.unlockedCosmetics,
      ...COSMETICS.filter((cosmetic) => this.meets(cosmetic.unlock)).map((cosmetic) => cosmetic.id)
    ]);
    if (!this.state.unlockedChallenges.includes(this.state.selectedChallenge)) {
      this.state.selectedChallenge = 'standard';
    }
    this.save();
  }

  getRunKernelReward(report) {
    const kills = finiteInteger(report.kills);
    const victory = report.outcome === 'victory';
    const challengeId = report.challenge?.id ?? 'standard';
    const raw = 3 + Math.min(10, Math.floor(kills / 20)) + (victory ? 8 : 0);
    return Math.max(3, Math.round(raw * (CHALLENGE_REWARD_MULTIPLIERS[challengeId] ?? 1)));
  }

  getMasteryXpReward(report) {
    return Math.round(25 + Math.min(200, finiteInteger(report.kills)) * 0.45
      + (report.outcome === 'victory' ? 60 : 0));
  }

  addKernels(amount) {
    const safeAmount = finiteInteger(amount);
    this.state.kernels += safeAmount;
    this.state.lifetimeKernels += safeAmount;
    return safeAmount;
  }

  recordRun(report, events = []) {
    const previous = {
      roosters: new Set(this.state.unlockedRoosters),
      challenges: new Set(this.state.unlockedChallenges),
      cosmetics: new Set(this.state.unlockedCosmetics)
    };
    const roosterId = ROOSTER_IDS.includes(report.rooster?.id) ? report.rooster.id : 'ace';
    const challengeId = report.challenge?.id ?? 'standard';
    const victory = report.outcome === 'victory';
    const masteryBefore = masteryLevelForXp(this.state.roosterMastery[roosterId]?.xp ?? 0);
    this.state.totalRuns += 1;
    this.state.totalKills += finiteInteger(report.kills);
    this.state.victories += victory ? 1 : 0;
    this.state.bossDefeats += victory ? 1 : 0;
    this.state.roosterRuns[roosterId] = (this.state.roosterRuns[roosterId] ?? 0) + 1;
    this.state.roosterWins[roosterId] = (this.state.roosterWins[roosterId] ?? 0) + (victory ? 1 : 0);
    this.state.bests.highestKills = Math.max(this.state.bests.highestKills, finiteInteger(report.kills));
    this.state.bests.longestRunMs = Math.max(this.state.bests.longestRunMs, finiteInteger(report.elapsedMs));
    if (victory) {
      const current = this.state.bests.fastestVictoryMs;
      this.state.bests.fastestVictoryMs = current === null
        ? finiteInteger(report.elapsedMs)
        : Math.min(current, finiteInteger(report.elapsedMs));
    }
    this.state.discoveredEnemies = unique([
      ...this.state.discoveredEnemies,
      ...events.filter((event) => event.type === 'enemySpawned').map((event) => event.enemyType)
    ]);
    this.state.discoveredEvolutions = unique([
      ...this.state.discoveredEvolutions,
      ...(report.build?.evolutions ?? []).map((evolution) => evolution.id)
    ]);

    const masteryXp = this.getMasteryXpReward(report);
    const mastery = this.state.roosterMastery[roosterId] ?? { xp: 0 };
    mastery.xp += masteryXp;
    this.state.roosterMastery[roosterId] = mastery;
    const masteryAfter = masteryLevelForXp(mastery.xp);
    const masteryMilestones = [];
    let masteryKernels = 0;
    for (let level = masteryBefore + 1; level <= masteryAfter; level += 1) {
      const amount = MASTERY_KERNEL_REWARDS[level] ?? 0;
      masteryKernels += amount;
      masteryMilestones.push({ level, amount });
    }

    const runKernels = this.getRunKernelReward(report);
    const isFirstClear = victory
      && Object.hasOwn(FIRST_CLEAR_REWARDS, challengeId)
      && !this.state.firstClearClaims.includes(challengeId);
    const firstClearKernels = isFirstClear ? FIRST_CLEAR_REWARDS[challengeId] : 0;
    if (isFirstClear) this.state.firstClearClaims.push(challengeId);
    const earnedKernels = this.addKernels(runKernels + firstClearKernels + masteryKernels);

    this.state.history.unshift({
      id: `${Date.now()}-${this.state.totalRuns}`,
      playedAt: new Date().toISOString(),
      outcome: report.outcome,
      roosterId,
      roosterName: report.rooster?.name ?? roosterId,
      challengeId,
      arenaName: report.arena?.name ?? '',
      elapsedMs: finiteInteger(report.elapsedMs),
      kills: finiteInteger(report.kills),
      kernels: earnedKernels,
      evolutions: (report.build?.evolutions ?? []).map((evolution) => evolution.name)
    });
    this.state.history = this.state.history.slice(0, MAX_HISTORY);
    this.evaluateUnlocks();

    const unlocked = [];
    this.state.unlockedRoosters
      .filter((id) => !previous.roosters.has(id))
      .forEach((id) => unlocked.push({ type: 'rooster', id }));
    this.state.unlockedChallenges
      .filter((id) => !previous.challenges.has(id))
      .forEach((id) => unlocked.push({ type: 'challenge', id }));
    this.state.unlockedCosmetics
      .filter((id) => !previous.cosmetics.has(id))
      .forEach((id) => unlocked.push({ type: 'cosmetic', id }));
    masteryMilestones.forEach(({ level, amount }) => unlocked.push({
      type: 'mastery',
      id: `${roosterId}-${level}`,
      roosterId,
      level,
      amount
    }));
    if (isFirstClear) {
      unlocked.push({ type: 'first-clear', id: challengeId, amount: firstClearKernels });
    }
    this.lastRunReward = {
      runKernels,
      firstClearKernels,
      masteryKernels,
      earnedKernels,
      masteryXp,
      masteryLevel: masteryAfter,
      balance: this.state.kernels
    };
    return unlocked;
  }

  getLastRunReward() {
    return this.lastRunReward ? { ...this.lastRunReward } : null;
  }

  getTalentRank(id) {
    return this.state.talentRanks[id] ?? 0;
  }

  getTotalTalentRanks() {
    return Object.values(this.state.talentRanks).reduce((total, rank) => total + rank, 0);
  }

  getTalentTree() {
    const totalRanks = this.getTotalTalentRanks();
    return TALENT_DEFINITIONS.map((talent) => {
      const rank = this.getTalentRank(talent.id);
      const complete = rank >= talent.maxRank;
      const unlocked = totalRanks >= talent.unlockAt;
      return {
        ...talent,
        costs: [...talent.costs],
        rank,
        complete,
        unlocked,
        nextCost: complete ? null : talent.costs[rank],
        affordable: !complete && unlocked && this.state.kernels >= talent.costs[rank],
        unlockLabel: unlocked ? '' : `${talent.unlockAt} Talent-Ränge benötigt`
      };
    });
  }

  purchaseTalent(id) {
    const talent = TALENT_DEFINITIONS.find((entry) => entry.id === id);
    if (!talent) return { ok: false, reason: 'unknown' };
    const rank = this.getTalentRank(id);
    if (rank >= talent.maxRank) return { ok: false, reason: 'complete' };
    if (this.getTotalTalentRanks() < talent.unlockAt) return { ok: false, reason: 'locked' };
    const cost = talent.costs[rank];
    if (this.state.kernels < cost) return { ok: false, reason: 'funds', cost };
    this.state.kernels -= cost;
    this.state.talentRanks[id] = rank + 1;
    this.save();
    return { ok: true, id, rank: rank + 1, cost, balance: this.state.kernels };
  }

  getRunBonuses() {
    return {
      maxHpMultiplier: 1 + this.getTalentRank('sturdy-nest') * 0.02,
      speedMultiplier: 1 + this.getTalentRank('swift-spurs') * 0.015,
      damageMultiplier: 1 + this.getTalentRank('polished-yolk') * 0.02,
      xpMagnetMultiplier: 1 + this.getTalentRank('wide-wings') * 0.06,
      rerolls: this.getTalentRank('second-choice'),
      critChance: this.getTalentRank('royal-instinct') * 0.01
    };
  }

  applyRunBonuses(player, runState) {
    const bonuses = this.getRunBonuses();
    player.maxHp = Math.max(1, Math.round(player.maxHp * bonuses.maxHpMultiplier));
    player.hp = player.maxHp;
    player.speed = Math.max(1, Math.round(player.speed * bonuses.speedMultiplier));
    player.projectileDamage = Math.max(1, Math.round(player.projectileDamage * bonuses.damageMultiplier));
    player.xpMagnetRadius = Math.round(player.xpMagnetRadius * bonuses.xpMagnetMultiplier);
    player.critChance = Math.min(0.5, player.critChance + bonuses.critChance);
    runState.rerollsRemaining += bonuses.rerolls;
    player.updateHealthBar();
    return bonuses;
  }

  selectChallenge(id) {
    if (!this.state.unlockedChallenges.includes(id)) return false;
    this.state.selectedChallenge = id;
    this.save();
    return true;
  }

  selectCosmetic(roosterId, cosmeticId = null) {
    if (cosmeticId && !this.state.unlockedCosmetics.includes(cosmeticId)) return false;
    const cosmetic = COSMETICS.find((entry) => entry.id === cosmeticId);
    if (cosmetic && cosmetic.roosterId !== roosterId) return false;
    this.state.selectedCosmetics[roosterId] = cosmeticId;
    this.save();
    return true;
  }

  getSelectedCosmetic(roosterId) {
    const id = this.state.selectedCosmetics[roosterId];
    return COSMETICS.find((cosmetic) => cosmetic.id === id) ?? null;
  }

  isRoosterUnlocked(id) {
    return this.state.unlockedRoosters.includes(id);
  }

  getMastery(id) {
    const xp = this.state.roosterMastery[id]?.xp ?? 0;
    const level = masteryLevelForXp(xp);
    const floor = MASTERY_THRESHOLDS[level - 1] ?? 0;
    const next = MASTERY_THRESHOLDS[level] ?? floor;
    return {
      xp,
      level,
      maxLevel: MASTERY_THRESHOLDS.length,
      currentFloor: floor,
      nextTarget: level >= MASTERY_THRESHOLDS.length ? null : next,
      progress: level >= MASTERY_THRESHOLDS.length ? 1 : (xp - floor) / Math.max(1, next - floor),
      badgeUnlocked: level >= 2
    };
  }

  unlockRoosterForTesting(id) {
    this.state.unlockedRoosters = unique([...this.state.unlockedRoosters, id]);
    this.save();
  }

  grantKernelsForTesting(amount) {
    this.addKernels(amount);
    this.save();
    return this.state.kernels;
  }

  unlockAllForTesting() {
    this.state.unlockedRoosters = unique(Object.keys(ROOSTER_UNLOCKS));
    this.state.unlockedChallenges = unique(CHALLENGE_DEFINITIONS.map((challenge) => challenge.id));
    this.state.unlockedCosmetics = unique(COSMETICS.map((cosmetic) => cosmetic.id));
    this.save();
    return this.getState();
  }

  reset() {
    this.state = defaultState();
    this.lastRunReward = null;
    this.save();
    return this.getState();
  }

  getHubState(roosters) {
    const evolutionDefinitions = UPGRADE_DEFINITIONS.filter((upgrade) => upgrade.evolution);
    return {
      currency: {
        kernels: this.state.kernels,
        lifetimeKernels: this.state.lifetimeKernels
      },
      talents: {
        totalRanks: this.getTotalTalentRanks(),
        nodes: this.getTalentTree(),
        bonuses: this.getRunBonuses()
      },
      progress: {
        totalRuns: this.state.totalRuns,
        victories: this.state.victories,
        totalKills: this.state.totalKills,
        bossDefeats: this.state.bossDefeats
      },
      bests: { ...this.state.bests },
      selectedChallenge: this.state.selectedChallenge,
      roosters: roosters.map((rooster) => ({
        id: rooster.id,
        unlocked: this.isRoosterUnlocked(rooster.id),
        unlockLabel: ROOSTER_UNLOCKS[rooster.id]?.label ?? '',
        runs: this.state.roosterRuns[rooster.id] ?? 0,
        wins: this.state.roosterWins[rooster.id] ?? 0,
        mastery: this.getMastery(rooster.id),
        selectedCosmetic: this.state.selectedCosmetics[rooster.id] ?? null,
        cosmetics: COSMETICS.filter((cosmetic) => cosmetic.roosterId === rooster.id).map((cosmetic) => ({
          id: cosmetic.id,
          name: cosmetic.name,
          tint: cosmetic.tint,
          unlocked: this.state.unlockedCosmetics.includes(cosmetic.id),
          unlockLabel: cosmetic.unlock.label
        }))
      })),
      challenges: CHALLENGE_DEFINITIONS.map((challenge) => ({
        id: challenge.id,
        name: challenge.name,
        description: challenge.description,
        arenaId: challenge.arenaId,
        unlocked: this.state.unlockedChallenges.includes(challenge.id),
        unlockLabel: challenge.unlock.label,
        firstClearReward: FIRST_CLEAR_REWARDS[challenge.id] ?? 0,
        firstClearClaimed: this.state.firstClearClaims.includes(challenge.id),
        rewardMultiplier: CHALLENGE_REWARD_MULTIPLIERS[challenge.id] ?? 1,
        modifiers: { ...challenge.modifiers }
      })),
      lexicon: {
        enemies: [
          ...ENEMY_ROLE_MATRIX.map((role) => ({ ...role, seen: true })),
          ...EXTRA_ENEMIES.map((enemy) => ({
            ...enemy,
            seen: this.state.discoveredEnemies.includes(enemy.id)
          }))
        ],
        evolutions: evolutionDefinitions.map((upgrade) => ({
          id: upgrade.id,
          name: upgrade.name,
          base: upgrade.evolution.base,
          passive: upgrade.evolution.passive,
          discovered: this.state.discoveredEvolutions.includes(upgrade.id)
        }))
      },
      history: this.state.history.map((run) => ({ ...run }))
    };
  }

  getState() {
    return structuredClone(this.state);
  }
}
