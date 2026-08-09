export const ROOSTER_DEFINITIONS = [
  {
    id: 'ace',
    name: 'Barnyard Ace',
    shortName: 'Ace',
    role: 'Praeziser Allrounder',
    icon: 'golden-egg',
    description: 'Zielsuchende Eier und eine eingebaute Chance auf kritische Treffer.',
    passive: 'Deadeye: 8% Chance auf doppelten Basis-Ei-Schaden.',
    stats: {
      maxHp: 100,
      speed: 210,
      fireRate: 800,
      projectileDamage: 20,
      critChance: 0.08
    },
    primary: {
      name: 'Target Egg',
      speed: 520,
      homingTurnRate: 0.1,
      trailColor: 0xfffbef,
      trailAlpha: 0.2
    },
    upgradeAffinities: {},
    visual: {
      scale: 0.25,
      tint: null,
      accent: 0xffd35c
    }
  },
  {
    id: 'artillery',
    name: 'Boombardier',
    shortName: 'Boom',
    role: 'Schwerer Flaechenschaden',
    icon: 'rocket-egg',
    description: 'Langsame, schwere Eier explodieren beim Einschlag.',
    passive: 'Blast Shell: Treffer verursachen 55% Schaden in 64 Radius.',
    stats: {
      maxHp: 115,
      speed: 185,
      fireRate: 1050,
      projectileDamage: 30,
      critChance: 0
    },
    primary: {
      name: 'Blast Shell',
      texture: 'heavy-egg',
      speed: 410,
      homingTurnRate: 0.055,
      scale: 1.34,
      hitRadius: 30,
      bodyRadius: 12,
      trailRadius: 12,
      trailColor: 0xff8a35,
      trailAlpha: 0.28,
      splashRadius: 64,
      splashDamageRatio: 0.55
    },
    upgradeAffinities: {
      'fire-eggs': 1.35,
      'rocket-egg': 1.65,
      'molotov-egg': 1.35,
      'bigger-eggs': 1.2
    },
    visual: {
      scale: 0.275,
      tint: 0xffc19b,
      accent: 0xff6a28
    }
  },
  {
    id: 'storm',
    name: 'Stormcrest',
    shortName: 'Storm',
    role: 'Schneller Kettenangriff',
    icon: 'lightning-comb',
    description: 'Sehr schnelle Sturm-Eier entladen sich auf ein nahes zweites Ziel.',
    passive: 'Static Chain: 60% Schaden auf 1 weiteres Ziel in 190 Radius.',
    stats: {
      maxHp: 85,
      speed: 245,
      fireRate: 620,
      projectileDamage: 14,
      critChance: 0
    },
    primary: {
      name: 'Storm Egg',
      texture: 'storm-egg',
      speed: 650,
      homingTurnRate: 0.12,
      scale: 0.94,
      hitRadius: 22,
      trailRadius: 10,
      trailColor: 0x5ad7ff,
      trailAlpha: 0.32,
      chainCount: 1,
      chainRadius: 190,
      chainDamageRatio: 0.6
    },
    upgradeAffinities: {
      'lightning-comb': 1.65,
      'laser-comb': 1.45,
      'orbit-eggs': 1.4,
      'faster-eggs': 1.2
    },
    visual: {
      scale: 0.235,
      tint: 0x9feaff,
      accent: 0x5ad7ff
    }
  }
];

export function getRoosterDefinition(id) {
  return ROOSTER_DEFINITIONS.find((definition) => definition.id === id) ?? null;
}
