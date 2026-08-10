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
    primaryEvolution: {
      id: 'evo-sunshot-array',
      name: 'Sunshot Array',
      passive: 'ace-deadeye-drill',
      description: 'Drei leuchtende Ziel-Eier durchschlagen und springen auf neue Ziele.',
      minimumShots: 3,
      damageMultiplier: 0.82,
      speedBonus: 110,
      pierce: 1,
      ricochet: 1,
      hitRadiusBonus: 5,
      scaleMultiplier: 1.08,
      trailColor: 0xffe16a,
      trailAlpha: 0.42
    },
    classPassives: ['ace-deadeye-drill', 'ace-guidance-fins'],
    archetypes: [
      {
        id: 'ace-bullseye',
        name: 'Bullseye Barrage',
        focus: 'Kritische Zielsalven und Ricochets',
        upgrades: ['ace-deadeye-drill', 'ace-guidance-fins', 'critical-yolk', 'ricochet-eggs', 'double-shot']
      },
      {
        id: 'ace-solar-ranger',
        name: 'Solar Ranger',
        focus: 'Piercing-Sonnen-Eier und Brandzonen',
        upgrades: ['golden-egg', 'fire-eggs', 'piercing-eggs', 'molotov-egg', 'regen']
      },
      {
        id: 'ace-shell-warden',
        name: 'Shell Warden',
        focus: 'Kontrollierter Orbit und sichere Distanz',
        upgrades: ['orbit-eggs', 'armor', 'lightning-comb', 'move-speed', 'second-wind']
      }
    ],
    upgradeAffinities: {
      'ace-deadeye-drill': 1.8,
      'ace-guidance-fins': 1.55,
      'critical-yolk': 1.25,
      'ricochet-eggs': 1.2,
      'double-shot': 1.12,
      'golden-egg': 1.22,
      'fire-eggs': 1.1,
      'piercing-eggs': 1.12,
      'molotov-egg': 1.08,
      'regen': 1.05,
      'orbit-eggs': 1.18,
      'armor': 1.08,
      'lightning-comb': 1.08,
      'move-speed': 1.05,
      'second-wind': 1.05
    },
    visual: {
      scale: 0.25,
      texture: 'rooster-ace-walk',
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
    primaryEvolution: {
      id: 'evo-siegebreaker-shell',
      name: 'Siegebreaker Shell',
      passive: 'artillery-reinforced-breech',
      description: 'Eine panzerbrechende Granate durchschlaegt ihr Ziel und erzeugt eine massive Doppelwelle.',
      damageMultiplier: 1.18,
      speedBonus: 55,
      pierce: 1,
      splashRadiusMultiplier: 1.55,
      splashDamageRatio: 0.88,
      secondaryBlastRatio: 0.45,
      hitRadiusBonus: 8,
      scaleMultiplier: 1.22,
      trailColor: 0xffd35c,
      trailAlpha: 0.46
    },
    classPassives: ['artillery-reinforced-breech', 'artillery-blast-plating'],
    archetypes: [
      {
        id: 'artillery-siege-engine',
        name: 'Siege Engine',
        focus: 'Startwaffen-Explosionen und Standfestigkeit',
        upgrades: ['artillery-reinforced-breech', 'artillery-blast-plating', 'bigger-eggs', 'armor', 'max-hp']
      },
      {
        id: 'artillery-broodstorm',
        name: 'Broodstorm Gunner',
        focus: 'Raketenketten und breite Detonationen',
        upgrades: ['rocket-egg', 'bigger-eggs', 'fire-eggs', 'golden-egg', 'piercing-eggs']
      },
      {
        id: 'artillery-firebreak',
        name: 'Firebreak',
        focus: 'Brandfelder und Gruppenkontrolle',
        upgrades: ['molotov-egg', 'regen', 'void-nest', 'xp-magnet', 'second-wind']
      }
    ],
    upgradeAffinities: {
      'artillery-reinforced-breech': 1.8,
      'artillery-blast-plating': 1.55,
      'fire-eggs': 1.35,
      'rocket-egg': 1.65,
      'molotov-egg': 1.35,
      'bigger-eggs': 1.28,
      'armor': 1.16,
      'max-hp': 1.12,
      'golden-egg': 1.12,
      'piercing-eggs': 1.1,
      'regen': 1.12,
      'void-nest': 1.18,
      'xp-magnet': 1.08,
      'second-wind': 1.06
    },
    visual: {
      scale: 0.275,
      texture: 'rooster-artillery-walk',
      tint: null,
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
    primaryEvolution: {
      id: 'evo-tempest-crown',
      name: 'Tempest Crown',
      passive: 'storm-static-plumage',
      description: 'Zwillings-Sturmeier jagen als weit springende Blitze durch den Schwarm.',
      minimumShots: 2,
      damageMultiplier: 0.92,
      speedBonus: 140,
      chainCountBonus: 3,
      chainRadiusBonus: 95,
      chainDamageRatio: 0.78,
      hitRadiusBonus: 3,
      scaleMultiplier: 1.05,
      trailColor: 0xcaa8ff,
      trailAlpha: 0.48
    },
    classPassives: ['storm-static-plumage', 'storm-tailwind-training'],
    archetypes: [
      {
        id: 'storm-crown-circuit',
        name: 'Crown Circuit',
        focus: 'Schnelle Startwaffen-Ketten und Mobilitaet',
        upgrades: ['storm-static-plumage', 'storm-tailwind-training', 'faster-eggs', 'move-speed', 'critical-yolk']
      },
      {
        id: 'storm-thunder-halo',
        name: 'Thunder Halo',
        focus: 'Kettenblitze und geladener Nahbereich',
        upgrades: ['lightning-comb', 'critical-yolk', 'orbit-eggs', 'armor', 'second-wind']
      },
      {
        id: 'storm-dawn-runner',
        name: 'Dawn Runner',
        focus: 'Laserlinien und permanentes Kiten',
        upgrades: ['laser-comb', 'swift-shells', 'move-speed', 'support-chick', 'faster-eggs']
      }
    ],
    upgradeAffinities: {
      'storm-static-plumage': 1.8,
      'storm-tailwind-training': 1.55,
      'lightning-comb': 1.65,
      'laser-comb': 1.45,
      'orbit-eggs': 1.4,
      'faster-eggs': 1.28,
      'move-speed': 1.18,
      'critical-yolk': 1.16,
      'armor': 1.06,
      'second-wind': 1.05,
      'swift-shells': 1.2,
      'support-chick': 1.18
    },
    visual: {
      scale: 0.235,
      texture: 'rooster-storm-walk',
      tint: null,
      accent: 0x5ad7ff
    }
  }
];

export function getRoosterDefinition(id) {
  return ROOSTER_DEFINITIONS.find((definition) => definition.id === id) ?? null;
}
