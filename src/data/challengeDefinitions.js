export const CHALLENGE_DEFINITIONS = [
  {
    id: 'standard',
    name: 'Standard Run',
    description: 'Der unveraenderte, vollstaendig gewinnbare Kern-Run.',
    arenaId: null,
    unlock: { type: 'default', target: 0, label: 'Immer verfuegbar' },
    modifiers: {}
  },
  {
    id: 'rush-hour',
    name: 'Rush Hour',
    description: 'Vertical Run, schnellere Gegner und kuerzere Druckphasen.',
    arenaId: 'vertical-run',
    unlock: { type: 'victories', target: 1, label: '1 Standard-Run gewinnen' },
    modifiers: {
      targetDurationScale: 0.82,
      enemySpeedMultiplier: 1.12,
      xpMultiplier: 1.08
    }
  },
  {
    id: 'featherweight',
    name: 'Featherweight',
    description: 'Coop Square mit weniger HP, mehr Tempo und hoeherem Eigenschaden.',
    arenaId: 'square-coop',
    unlock: { type: 'totalKills', target: 150, label: '150 Gegner besiegen' },
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
    description: 'Open Yard mit zaeherem Hofstaat und wertvollerer XP.',
    arenaId: 'open-yard',
    unlock: { type: 'bossDefeats', target: 1, label: 'THE BROOD KING besiegen' },
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
