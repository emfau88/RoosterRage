import { SUNSHOT_ARRAY_VISUAL, TARGET_EGG_VISUALS } from './targetEggVisuals.js';
import { BLAST_SHELL_VISUALS, STORM_EGG_VISUALS } from './primaryWeaponVisuals.js';
import { STORM_VISUAL_VERSION } from '../config/aceVisual.js';

export const ROOSTER_DEFINITIONS = [
  {
    id: 'ace',
    name: 'Barnyard Ace',
    shortName: 'Ace',
    role: 'Precision All-Rounder',
    icon: 'golden-egg',
    description: 'Homing eggs with a built-in chance to deal critical damage.',
    passive: 'Deadeye: 8% chance to deal double base-egg damage.',
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
      ...TARGET_EGG_VISUALS[1]
    },
    primaryEvolution: {
      id: 'evo-sunshot-array',
      name: 'Sunshot Array',
      texture: 'evo-sunshot-array-projectile',
      passive: 'ace-deadeye-drill',
      description: 'Three radiant target eggs pierce enemies and ricochet to new targets.',
      minimumShots: 3,
      damageMultiplier: 0.82,
      speedBonus: 110,
      pierce: 1,
      ricochet: 1,
      hitRadiusBonus: 5,
      scaleMultiplier: 1.08,
      trailColor: 0xffe16a,
      trailAlpha: 0.42,
      ...SUNSHOT_ARRAY_VISUAL
    },
    classPassives: ['ace-deadeye-drill', 'ace-guidance-fins'],
    archetypes: [
      {
        id: 'ace-bullseye',
        name: 'Bullseye Barrage',
        focus: 'Critical target volleys and ricochets',
        upgrades: ['ace-deadeye-drill', 'ace-guidance-fins', 'critical-yolk', 'ricochet-eggs', 'double-shot']
      },
      {
        id: 'ace-solar-ranger',
        name: 'Solar Ranger',
        focus: 'Piercing sun eggs and burning zones',
        upgrades: ['golden-egg', 'fire-eggs', 'piercing-eggs', 'molotov-egg', 'regen']
      },
      {
        id: 'ace-shell-warden',
        name: 'Shell Warden',
        focus: 'Controlled orbit and safe spacing',
        upgrades: ['orbit-eggs', 'armor', 'lightning-comb', 'move-speed', 'second-wind']
      }
    ],
    upgradeAffinities: {
      'primary-ace-rank': 2.1,
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
    role: 'Heavy Area Damage',
    icon: 'rocket-egg',
    description: 'Slow, heavy eggs explode on impact.',
    passive: 'Blast Shell: Hits deal 55% damage within a 64-unit radius.',
    stats: {
      maxHp: 115,
      speed: 185,
      fireRate: 1050,
      projectileDamage: 30,
      critChance: 0
    },
    primary: {
      name: 'Blast Shell',
      speed: 410,
      homingTurnRate: 0.055,
      hitRadius: 30,
      bodyRadius: 12,
      splashRadius: 64,
      splashDamageRatio: 0.55,
      ...BLAST_SHELL_VISUALS[1]
    },
    primaryEvolution: {
      id: 'evo-siegebreaker-shell',
      name: 'Siegebreaker Shell',
      texture: 'evo-siegebreaker-shell-projectile',
      tint: 0xffffff,
      passive: 'artillery-reinforced-breech',
      description: 'An armor-piercing shell punches through its target and creates a massive double shockwave.',
      damageMultiplier: 1.18,
      speedBonus: 55,
      pierce: 1,
      splashRadiusMultiplier: 1.55,
      splashDamageRatio: 0.88,
      secondaryBlastRatio: 0.45,
      hitRadiusBonus: 8,
      projectileScale: 1.68,
      trailColor: 0xffd35c,
      trailAlpha: 0.46,
      trailVisible: false,
      lineTrailLength: 28,
      lineTrailWidth: 3.4,
      lineTrailColor: 0xffef9f,
      lineTrailAlpha: 0.23,
      spritePulseX: 0.012,
      spritePulseY: 0.022,
      spritePulseMs: 255,
      spriteFlickerAlpha: 0.02,
      impactStyle: 'blast-shell-evo',
      visualRank: 'EVO'
    },
    classPassives: ['artillery-reinforced-breech', 'artillery-blast-plating'],
    archetypes: [
      {
        id: 'artillery-siege-engine',
        name: 'Siege Engine',
        focus: 'Starting-weapon explosions and resilience',
        upgrades: ['artillery-reinforced-breech', 'artillery-blast-plating', 'bigger-eggs', 'armor', 'max-hp']
      },
      {
        id: 'artillery-broodstorm',
        name: 'Broodstorm Gunner',
        focus: 'Rocket chains and wide detonations',
        upgrades: ['rocket-egg', 'bigger-eggs', 'fire-eggs', 'golden-egg', 'piercing-eggs']
      },
      {
        id: 'artillery-firebreak',
        name: 'Firebreak',
        focus: 'Burning fields and crowd control',
        upgrades: ['molotov-egg', 'regen', 'void-nest', 'xp-magnet', 'second-wind']
      }
    ],
    upgradeAffinities: {
      'primary-artillery-rank': 2.1,
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
    role: 'Fast Chain Attacks',
    icon: 'lightning-comb',
    description: 'Very fast storm eggs discharge into a nearby second target.',
    passive: 'Static Chain: Deals 60% damage to 1 additional target within a 190-unit radius.',
    stats: {
      maxHp: 85,
      speed: 245,
      fireRate: 620,
      projectileDamage: 14,
      critChance: 0
    },
    primary: {
      name: 'Storm Egg',
      speed: 650,
      homingTurnRate: 0.12,
      hitRadius: 22,
      chainCount: 1,
      chainRadius: 190,
      chainDamageRatio: 0.6,
      ...STORM_EGG_VISUALS[1]
    },
    primaryEvolution: {
      id: 'evo-tempest-crown',
      name: 'Tempest Crown',
      texture: 'evo-tempest-crown-projectile',
      tint: 0xffffff,
      passive: 'storm-static-plumage',
      description: 'Twin storm eggs tear through the swarm as far-reaching chain lightning.',
      minimumShots: 2,
      damageMultiplier: 0.92,
      speedBonus: 140,
      chainCountBonus: 3,
      chainRadiusBonus: 95,
      chainDamageRatio: 0.78,
      hitRadiusBonus: 3,
      projectileScale: 1.18,
      trailColor: 0xcaa8ff,
      trailAlpha: 0.48,
      trailVisible: false,
      lineTrailLength: 22,
      lineTrailWidth: 2.2,
      lineTrailColor: 0xcaa8ff,
      lineTrailAlpha: 0.21,
      spritePulseX: 0.03,
      spritePulseY: 0.055,
      spritePulseMs: 180,
      spriteFlickerAlpha: 0.035,
      chainOuterWidth: 7,
      chainInnerWidth: 3,
      chainOuterColor: 0xffffff,
      chainInnerColor: 0xcaa8ff,
      chainLife: 190,
      visualRank: 'EVO'
    },
    classPassives: ['storm-static-plumage', 'storm-tailwind-training'],
    archetypes: [
      {
        id: 'storm-crown-circuit',
        name: 'Crown Circuit',
        focus: 'Fast starting-weapon chains and mobility',
        upgrades: ['storm-static-plumage', 'storm-tailwind-training', 'faster-eggs', 'move-speed', 'critical-yolk']
      },
      {
        id: 'storm-thunder-halo',
        name: 'Thunder Halo',
        focus: 'Chain lightning and charged close range',
        upgrades: ['lightning-comb', 'critical-yolk', 'orbit-eggs', 'armor', 'second-wind']
      },
      {
        id: 'storm-dawn-runner',
        name: 'Dawn Runner',
        focus: 'Laser lanes and constant kiting',
        upgrades: ['laser-comb', 'swift-shells', 'move-speed', 'support-chick', 'faster-eggs']
      }
    ],
    upgradeAffinities: {
      'primary-storm-rank': 2.1,
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
      scale: STORM_VISUAL_VERSION === 'final' ? 0.255 : 0.235,
      texture: 'rooster-storm-walk',
      tint: null,
      accent: 0x5ad7ff
    }
  }
];

export function getRoosterDefinition(id) {
  return ROOSTER_DEFINITIONS.find((definition) => definition.id === id) ?? null;
}
