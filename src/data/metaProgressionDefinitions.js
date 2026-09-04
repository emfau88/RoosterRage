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
    name: 'Sturdy Nest',
    icon: 'max-hp',
    maxRank: 3,
    costs: [12, 22, 36],
    description: '+2% maximum HP per rank.',
    effect: { label: 'Maximum HP', perRank: 2, unit: '%' },
    unlockAt: 0
  },
  {
    id: 'swift-spurs',
    name: 'Swift Spurs',
    icon: 'move-speed',
    maxRank: 3,
    costs: [12, 22, 36],
    description: '+1.5% movement speed per rank.',
    effect: { label: 'Movement speed', perRank: 1.5, unit: '%' },
    unlockAt: 0
  },
  {
    id: 'polished-yolk',
    name: 'Polished Yolk',
    icon: 'bigger-eggs',
    maxRank: 3,
    costs: [12, 22, 36],
    description: '+2% starting weapon damage per rank.',
    effect: { label: 'Starting weapon damage', perRank: 2, unit: '%' },
    unlockAt: 0
  },
  {
    id: 'wide-wings',
    name: 'Wide Wings',
    icon: 'xp-magnet',
    maxRank: 2,
    costs: [35, 55],
    description: '+6% XP magnet radius per rank.',
    effect: { label: 'XP magnet radius', perRank: 6, unit: '%' },
    unlockAt: 3
  },
  {
    id: 'second-choice',
    name: 'Second Choice',
    icon: 'restart',
    maxRank: 1,
    costs: [65],
    description: '+1 reroll per run.',
    effect: { label: 'Rerolls per run', perRank: 1, unit: '' },
    unlockAt: 5
  },
  {
    id: 'royal-instinct',
    name: 'Royal Instinct',
    icon: 'critical-yolk',
    maxRank: 1,
    costs: [90],
    description: '+1% critical hit chance.',
    effect: { label: 'Critical hit chance', perRank: 1, unit: '%' },
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
