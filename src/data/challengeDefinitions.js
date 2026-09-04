export const CHALLENGE_DEFINITIONS = [
  {
    id: 'standard',
    name: 'Standard Run',
    description: 'Survive ten escalating waves and defeat the Brood King.',
    arenaId: null,
    unlock: { type: 'default', target: 0, label: 'Always available' },
    modifiers: {}
  },
  {
    id: 'rush-hour',
    name: 'Rush Hour',
    description: 'A vertical arena with faster enemies and shorter pressure phases.',
    arenaId: 'vertical-run',
    unlock: { type: 'victories', target: 1, label: 'Win 1 Standard Run' },
    modifiers: {
      targetDurationScale: 0.82,
      enemySpeedMultiplier: 1.12,
      xpMultiplier: 1.08
    }
  },
  {
    id: 'featherweight',
    name: 'Featherweight',
    description: 'A tight square with less HP, more speed, and higher player damage.',
    arenaId: 'square-coop',
    unlock: { type: 'totalKills', target: 150, label: 'Defeat 150 enemies' },
    modifiers: {
      playerHpMultiplier: 0.72,
      playerSpeedMultiplier: 1.12,
      playerDamageMultiplier: 1.15,
      enemyDamageMultiplier: 1.15
    }
  },
  {
    id: 'royal-gauntlet',
    name: 'Royal Gauntlet',
    description: 'An open yard with a tougher royal court and more valuable XP.',
    arenaId: 'open-yard',
    unlock: { type: 'bossDefeats', target: 1, label: 'Defeat THE BROOD KING' },
    modifiers: {
      targetDurationScale: 0.92,
      enemyHpMultiplier: 1.18,
      enemyDamageMultiplier: 1.12,
      eliteHpMultiplier: 1.22,
      xpMultiplier: 1.18
    }
  }
];

export function getChallengeDefinition(id = 'standard') {
  return CHALLENGE_DEFINITIONS.find((challenge) => challenge.id === id)
    ?? CHALLENGE_DEFINITIONS[0];
}
