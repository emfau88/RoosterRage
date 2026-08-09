export const PLAYER_PROFILES = {
  novice: {
    id: 'novice',
    label: 'Novice',
    dangerRadius: 175,
    evadeWeight: 0.72,
    pickupWeight: 0.62,
    pressureWeight: 0,
    edgeWeight: 0.7,
    projectileDangerRadius: 165,
    projectileEvadeWeight: 0.45,
    upgradePriorities: [
      'heal', 'max-hp', 'move-speed', 'armor', 'regen', 'faster-eggs', 'fire-eggs',
      'double-shot', 'xp-magnet'
    ]
  },
  average: {
    id: 'average',
    label: 'Average',
    dangerRadius: 220,
    evadeWeight: 1.18,
    pickupWeight: 0.92,
    pressureWeight: 0.08,
    edgeWeight: 0.95,
    projectileDangerRadius: 285,
    projectileEvadeWeight: 1.55,
    upgradePriorities: [
      'faster-eggs', 'fire-eggs', 'golden-egg', 'orbit-eggs', 'lightning-comb',
      'support-chick', 'max-hp', 'move-speed', 'double-shot', 'armor',
      'piercing-eggs', 'regen', 'heal'
    ]
  },
  offense: {
    id: 'offense',
    label: 'Offense',
    dangerRadius: 185,
    evadeWeight: 0.86,
    pickupWeight: 0.72,
    pressureWeight: 0.34,
    edgeWeight: 0.82,
    projectileDangerRadius: 235,
    projectileEvadeWeight: 1.05,
    upgradePriorities: [
      'faster-eggs', 'fire-eggs', 'triple-shot', 'piercing-eggs', 'bigger-eggs',
      'double-shot', 'critical-yolk', 'ricochet-eggs', 'move-speed', 'max-hp', 'heal'
    ]
  },
  evasive: {
    id: 'evasive',
    label: 'Evasive',
    dangerRadius: 285,
    evadeWeight: 1.62,
    pickupWeight: 0.78,
    pressureWeight: 0,
    edgeWeight: 1.2,
    projectileDangerRadius: 350,
    projectileEvadeWeight: 1.95,
    upgradePriorities: [
      'move-speed', 'armor', 'regen', 'max-hp', 'second-wind', 'xp-magnet', 'heal',
      'faster-eggs', 'fire-eggs'
    ]
  }
};

const LEGACY_PROFILE_ALIASES = {
  defense: 'evasive',
  random: 'average',
  'bad-but-valid': 'novice'
};

export function getPlayerProfile(id = 'average') {
  const resolvedId = LEGACY_PROFILE_ALIASES[id] ?? id;
  return PLAYER_PROFILES[resolvedId] ?? PLAYER_PROFILES.average;
}
