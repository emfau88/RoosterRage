export const META_STORAGE_KEY = 'rooster-rage:meta:v2';
export const LEGACY_META_STORAGE_KEYS = ['rooster-rage:meta:v1'];

export const FIRST_CLEAR_REWARDS = Object.freeze({
  standard: 40,
  'rush-hour': 60,
  featherweight: 75,
  'royal-gauntlet': 100
});

export const CHALLENGE_REWARD_MULTIPLIERS = Object.freeze({
  standard: 1,
  'rush-hour': 1.15,
  featherweight: 1.25,
  'royal-gauntlet': 1.35
});

export const TALENT_DEFINITIONS = Object.freeze([
  {
    id: 'sturdy-nest',
    name: 'Stabiles Nest',
    icon: 'max-hp',
    maxRank: 3,
    costs: [12, 22, 36],
    description: '+2 % maximale HP pro Rang.',
    unlockAt: 0
  },
  {
    id: 'swift-spurs',
    name: 'Flotte Sporen',
    icon: 'move-speed',
    maxRank: 3,
    costs: [12, 22, 36],
    description: '+1,5 % Bewegungstempo pro Rang.',
    unlockAt: 0
  },
  {
    id: 'polished-yolk',
    name: 'Polierter Dotter',
    icon: 'bigger-eggs',
    maxRank: 3,
    costs: [12, 22, 36],
    description: '+2 % Startwaffen-Schaden pro Rang.',
    unlockAt: 0
  },
  {
    id: 'wide-wings',
    name: 'Weite Schwingen',
    icon: 'xp-magnet',
    maxRank: 2,
    costs: [35, 55],
    description: '+6 % XP-Magnetradius pro Rang.',
    unlockAt: 3
  },
  {
    id: 'second-choice',
    name: 'Zweiter Blick',
    icon: 'restart',
    maxRank: 1,
    costs: [65],
    description: '+1 Reroll pro Run.',
    unlockAt: 5
  },
  {
    id: 'royal-instinct',
    name: 'Königsinstinkt',
    icon: 'critical-yolk',
    maxRank: 1,
    costs: [90],
    description: '+1 % kritische Trefferchance.',
    unlockAt: 8
  }
]);

export const MASTERY_THRESHOLDS = Object.freeze([0, 120, 320, 600, 950]);
export const MASTERY_KERNEL_REWARDS = Object.freeze({
  2: 15,
  3: 20,
  4: 30,
  5: 45
});

