import { CHALLENGE_DEFINITIONS } from '../data/challengeDefinitions.js';
import { ENEMY_ROLE_MATRIX } from '../data/enemyRoleDefinitions.js';
import { UPGRADE_DEFINITIONS } from '../data/upgradeDefinitions.js';

const STORAGE_KEY = 'rooster-rage:meta:v1';
const MAX_HISTORY = 8;

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
  { id: 'elite-runner', purpose: 'Gilded Talon: Haste-Aura und Dash', counterplay: 'Dash-Linie frueh verlassen' },
  { id: 'elite-brute', purpose: 'Iron Brooder: Panzer-Aura und Slam', counterplay: 'Slam-Ring raeumen' },
  { id: 'elite-spitter', purpose: 'Violet Matron: Regeneration und Faecher', counterplay: 'Matron priorisieren' },
  { id: 'boss', purpose: 'THE BROOD KING: drei Phasen', counterplay: 'Faecher lesen, Feuerball weit fuehren' }
];

function defaultState() {
  return {
    version: 1,
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

export class MetaProgressionSystem {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.state = this.load();
    this.evaluateUnlocks();
  }

  load() {
    try {
      const stored = JSON.parse(this.storage?.getItem(STORAGE_KEY) ?? 'null');
      if (!stored || stored.version !== 1) return defaultState();
      const defaults = defaultState();
      return {
        ...defaults,
        ...stored,
        roosterRuns: { ...defaults.roosterRuns, ...stored.roosterRuns },
        roosterWins: { ...defaults.roosterWins, ...stored.roosterWins },
        selectedCosmetics: { ...defaults.selectedCosmetics, ...stored.selectedCosmetics },
        bests: { ...defaults.bests, ...stored.bests },
        history: Array.isArray(stored.history) ? stored.history.slice(0, MAX_HISTORY) : []
      };
    } catch {
      return defaultState();
    }
  }

  save() {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.state));
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

  recordRun(report, events = []) {
    const previous = {
      roosters: new Set(this.state.unlockedRoosters),
      challenges: new Set(this.state.unlockedChallenges),
      cosmetics: new Set(this.state.unlockedCosmetics)
    };
    const roosterId = report.rooster?.id ?? 'ace';
    const victory = report.outcome === 'victory';
    this.state.totalRuns += 1;
    this.state.totalKills += report.kills ?? 0;
    this.state.victories += victory ? 1 : 0;
    this.state.bossDefeats += victory ? 1 : 0;
    this.state.roosterRuns[roosterId] = (this.state.roosterRuns[roosterId] ?? 0) + 1;
    this.state.roosterWins[roosterId] = (this.state.roosterWins[roosterId] ?? 0) + (victory ? 1 : 0);
    this.state.bests.highestKills = Math.max(this.state.bests.highestKills, report.kills ?? 0);
    this.state.bests.longestRunMs = Math.max(this.state.bests.longestRunMs, report.elapsedMs ?? 0);
    if (victory) {
      const current = this.state.bests.fastestVictoryMs;
      this.state.bests.fastestVictoryMs = current === null
        ? report.elapsedMs
        : Math.min(current, report.elapsedMs);
    }
    this.state.discoveredEnemies = unique([
      ...this.state.discoveredEnemies,
      ...events.filter((event) => event.type === 'enemySpawned').map((event) => event.enemyType)
    ]);
    this.state.discoveredEvolutions = unique([
      ...this.state.discoveredEvolutions,
      ...(report.build?.evolutions ?? []).map((evolution) => evolution.id)
    ]);
    this.state.history.unshift({
      id: `${Date.now()}-${this.state.totalRuns}`,
      playedAt: new Date().toISOString(),
      outcome: report.outcome,
      roosterId,
      roosterName: report.rooster?.name ?? roosterId,
      challengeId: report.challenge?.id ?? 'standard',
      arenaName: report.arena?.name ?? '',
      elapsedMs: report.elapsedMs ?? 0,
      kills: report.kills ?? 0,
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
    return unlocked;
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

  unlockRoosterForTesting(id) {
    this.state.unlockedRoosters = unique([...this.state.unlockedRoosters, id]);
    this.save();
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
    this.save();
    return this.getState();
  }

  getHubState(roosters) {
    const evolutionDefinitions = UPGRADE_DEFINITIONS.filter((upgrade) => upgrade.evolution);
    return {
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
        selectedCosmetic: this.state.selectedCosmetics[rooster.id] ?? null,
        cosmetics: COSMETICS.filter((cosmetic) => cosmetic.roosterId === rooster.id).map((cosmetic) => ({
          id: cosmetic.id,
          name: cosmetic.name,
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
