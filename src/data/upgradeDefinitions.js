import { applyTargetEggVisual } from './targetEggVisuals.js';
import { applyBlastShellVisual, applyStormEggVisual } from './primaryWeaponVisuals.js';

export const UPGRADE_DEFINITIONS = [
  {
    id: 'heal',
    name: 'Heal',
    description: 'Restores 25 HP immediately.',
    category: 'utility',
    rarity: 'common',
    weight: 5,
    consumable: true,
    condition: (player) => player.hp < player.maxHp,
    apply: (player) => player.heal(25)
  },
  {
    id: 'double-shot',
    name: 'Double Shot',
    description: 'Fires 2 homing eggs per attack.',
    category: 'weapon',
    rarity: 'common',
    maxRank: 1,
    slotKey: 'multi-shot',
    weight: 9,
    excludes: ['triple-shot'],
    apply: (player) => {
      player.shotCount = Math.max(player.shotCount, 2);
    }
  },
  {
    id: 'triple-shot',
    name: 'Triple Shot',
    description: 'Replaces Double Shot with 3 homing eggs.',
    category: 'weapon',
    rarity: 'rare',
    maxRank: 1,
    slotKey: 'multi-shot',
    minLevel: 3,
    requires: ['double-shot'],
    weight: 7,
    apply: (player) => {
      player.shotCount = Math.max(player.shotCount, 3);
    }
  },
  {
    id: 'fire-eggs',
    name: 'Fire Eggs',
    description: '+10 damage per egg and fiery projectiles.',
    rankDescriptions: [
      'R1: +10 damage; compact Fire Eggs burn with a smooth, steady flicker.',
      'R2: +20 total damage; larger flames pulse with greater intensity.',
      'R3: +30 total damage; white-hot Fire Eggs with bold, fluid flame motion.'
    ],
    category: 'weapon',
    rarity: 'common',
    maxRank: 3,
    weight: 8,
    synergy: { with: 'rocket-egg', description: 'Rocket Egg deals 25% more explosion damage.' },
    apply: (player) => {
      player.fireEggs = true;
      player.projectileDamage += 10;
    }
  },
  {
    id: 'primary-ace-rank',
    name: 'Target Egg',
    description: "Develops Ace's starting weapon from R1 to R4.",
    rankDescriptions: [
      'R2 Twin Lock: Larger, brighter target eggs; every 2nd attack fires a twin volley.',
      'R3 Deadeye Shell: Larger golden eggs; every 4th attack becomes a bright piercing ricochet critical.',
      'R4 Hunter Array: Permanent twin volley of large deep-gold eggs with a fine golden trail.'
    ],
    category: 'weapon',
    rarity: 'uncommon',
    maxRank: 3,
    displayMaxRank: 4,
    rankOffset: 1,
    baseWeaponId: 'primary-ace',
    startWeaponUpgrade: true,
    minLevel: 2,
    rankMinLevels: [2, 4, 6],
    weight: 8,
    classId: 'ace',
    condition: (player) => player.roosterId === 'ace',
    apply: (player, _scene, rank) => {
      player.primaryAttack.rank = rank + 1;
      applyTargetEggVisual(player.primaryAttack, rank + 1);
      if (rank === 1) {
        player.primaryAttack.twinCadence = 2;
        player.primaryAttack.homingTurnRate = (player.primaryAttack.homingTurnRate ?? 0.08) + 0.02;
      } else if (rank === 2) {
        player.primaryAttack.deadeyeCadence = 4;
        player.primaryAttack.criticalPierceBonus = 1;
        player.primaryAttack.criticalRicochetBonus = 1;
      } else {
        player.primaryAttack.minimumShots = 2;
        player.primaryAttack.homingTurnRate = (player.primaryAttack.homingTurnRate ?? 0.08) + 0.025;
      }
    }
  },
  {
    id: 'primary-artillery-rank',
    name: 'Blast Shell',
    description: "Develops Boombardier's starting weapon from R1 to R4.",
    rankDescriptions: [
      'R2 Heavy Load: Larger shell, stronger trail, and wider explosion radius.',
      'R3 Shrapnel Yolk: The impact creates four short mini-blasts.',
      'R4 Siege Load: Massive shell with a stronger second shockwave.'
    ],
    category: 'weapon',
    rarity: 'uncommon',
    maxRank: 3,
    displayMaxRank: 4,
    rankOffset: 1,
    baseWeaponId: 'primary-artillery',
    startWeaponUpgrade: true,
    minLevel: 2,
    rankMinLevels: [2, 4, 6],
    weight: 8,
    classId: 'artillery',
    condition: (player) => player.roosterId === 'artillery',
    apply: (player, _scene, rank) => {
      player.primaryAttack.rank = rank + 1;
      applyBlastShellVisual(player.primaryAttack, rank + 1);
      if (rank === 1) {
        player.primaryAttack.splashRadius = (player.primaryAttack.splashRadius ?? 56) + 12;
      } else if (rank === 2) {
        player.primaryAttack.shrapnelCount = 4;
        player.primaryAttack.shrapnelDamageRatio = 0.22;
      } else {
        player.primaryAttack.splashRadius = (player.primaryAttack.splashRadius ?? 68) + 16;
        player.primaryAttack.secondaryBlastRatio = Math.max(0.28, player.primaryAttack.secondaryBlastRatio ?? 0);
      }
    }
  },
  {
    id: 'primary-storm-rank',
    name: 'Storm Egg',
    description: "Develops Stormcrest's starting weapon from R1 to R4.",
    rankDescriptions: [
      'R2 Static Fork: One additional chain jump with increased range.',
      'R3 Arc Pair: Every attack fires two staggered electrical pulses.',
      'R4 Storm Circuit: Three chain jumps, greater range, and bright afterglow trails.'
    ],
    category: 'weapon',
    rarity: 'uncommon',
    maxRank: 3,
    displayMaxRank: 4,
    rankOffset: 1,
    baseWeaponId: 'primary-storm',
    startWeaponUpgrade: true,
    minLevel: 2,
    rankMinLevels: [2, 4, 6],
    weight: 8,
    classId: 'storm',
    condition: (player) => player.roosterId === 'storm',
    apply: (player, _scene, rank) => {
      player.primaryAttack.rank = rank + 1;
      applyStormEggVisual(player.primaryAttack, rank + 1);
      if (rank === 1) {
        player.primaryAttack.chainCount = (player.primaryAttack.chainCount ?? 1) + 1;
        player.primaryAttack.chainRadius = (player.primaryAttack.chainRadius ?? 190) + 35;
      } else if (rank === 2) {
        player.primaryAttack.minimumShots = 2;
      } else {
        player.primaryAttack.chainCount = Math.max(3, player.primaryAttack.chainCount ?? 0);
        player.primaryAttack.chainRadius = (player.primaryAttack.chainRadius ?? 225) + 55;
      }
    }
  },
  {
    id: 'faster-eggs',
    name: 'Faster Eggs',
    description: '18% shorter primary-attack cooldown.',
    category: 'weapon',
    rarity: 'common',
    maxRank: 4,
    weight: 8,
    apply: (player) => {
      player.fireRate = Math.max(300, Math.round(player.fireRate * 0.82));
    }
  },
  {
    id: 'golden-egg',
    name: 'Golden Egg',
    description: 'Periodic heavy egg: 60 damage, 3 pierces.',
    rankDescriptions: [
      '60 damage, 3 pierces, 4.55 s cooldown.',
      'R2: larger egg, wider hit, and stronger golden trail.',
      'R3: Solar Sparks jump to nearby enemies on a pierce.',
      'R4: two Golden Eggs launch with a stagger toward separate targets.'
    ],
    category: 'active',
    rarity: 'rare',
    maxRank: 4,
    minLevel: 2,
    weight: 6,
    apply: (_player, scene, rank) => scene.unlockGoldenEgg(rank)
  },
  {
    id: 'orbit-eggs',
    name: 'Orbit Eggs',
    description: 'An egg orbits the rooster and deals 19 contact damage.',
    rankDescriptions: [
      '1 larger Orbit Egg circles at 80 radius and deals 19 contact damage.',
      '2 larger Orbit Eggs circle at 90 radius and deal 24 contact damage each.',
      '3 glowing golden Orbit Eggs circle at 100 radius and deal 29 contact damage each.',
      '4 golden Orbit Eggs circle in pairs on 104- and 130-radius orbits.'
    ],
    category: 'orbit',
    rarity: 'rare',
    maxRank: 4,
    minLevel: 2,
    weight: 6,
    synergy: { with: 'lightning-comb', description: 'Lightning Comb hits one additional target and deals 20% more damage.' },
    apply: (_player, scene, rank) => scene.setOrbitEggRank(rank)
  },
  {
    id: 'molotov-egg',
    name: 'Molotov Egg',
    description: 'Throws a burning area every 5.7 s.',
    rankDescriptions: [
      '90 radius, 10 damage per tick, 3.0 s burn duration, 5.7 s cooldown.',
      'R2: 108 radius, 12 damage per tick, and 3.4 s burn duration.',
      'R3: 124 radius, 14 damage per tick, 3.8 s duration, and visible damage pulses.',
      'R4: two compact fire patches land 0.25 s apart and last 4.0 s.'
    ],
    category: 'active',
    tags: ['area'],
    rarity: 'rare',
    maxRank: 4,
    minLevel: 2,
    weight: 6,
    synergy: { with: 'void-nest', description: 'Void Nest pulls enemies 25% harder into the fire.' },
    apply: (_player, scene, rank) => scene.unlockMolotovEgg(rank)
  },
  {
    id: 'lightning-comb',
    name: 'Lightning Comb',
    description: 'Chain lightning across up to 3 targets.',
    rankDescriptions: [
      'Up to 3 targets, 34 base damage, 4.55 s cooldown.',
      'Up to 4 targets, 44 base damage, 3.90 s cooldown.',
      'R3: up to 5 targets and a branching final burst.',
      'R4: up to 6 targets with a central discharge.'
    ],
    category: 'active',
    rarity: 'rare',
    maxRank: 4,
    minLevel: 2,
    weight: 6,
    synergy: { with: 'orbit-eggs', description: 'One additional target and 20% more lightning damage.' },
    apply: (_player, scene, rank) => scene.unlockLightningComb(rank)
  },
  {
    id: 'support-chick',
    name: 'Support Chick',
    description: 'A companion starts an upgradeable projectile and debuff path.',
    rankDescriptions: [
      '1 companion fires for 17 damage.',
      'The companion fires a two-shot volley with 1 pierce.',
      'Hits slow enemies for 0.7 s.',
      'A second companion joins the flock.',
      'Three companions fire faster and apply a stronger slow.'
    ],
    category: 'summon',
    rarity: 'rare',
    maxRank: 5,
    minLevel: 2,
    weight: 6,
    apply: (_player, scene, rank) => scene.setSupportChickenRank(rank)
  },
  {
    id: 'rocket-egg',
    name: 'Rocket Egg',
    description: 'Homing rocket with 48 area damage.',
    rankDescriptions: [
      '48 damage in an 82 radius with a compact eggshell rocket.',
      'R2: 64 damage in a 100 radius, reinforced rocket, and better homing.',
      'R3: 80 damage in a 118 radius; three staggered cluster blasts follow.',
      'R4: two heavy rockets hit for 96 damage each in a 132 radius.'
    ],
    category: 'active',
    rarity: 'rare',
    maxRank: 4,
    minLevel: 3,
    weight: 5,
    synergy: { with: 'fire-eggs', description: '25% more explosion damage.' },
    apply: (_player, scene, rank) => scene.unlockRocketEgg(rank)
  },
  {
    id: 'void-nest',
    name: 'Void Nest',
    description: 'Pulls enemies together in a damaging zone.',
    rankDescriptions: [
      '132 radius, 11 damage per tick, and 4.2 s pull: gentle outside, strong at the core.',
      'R2: 150 radius, stronger pull, and a stable 4.8 s portal phase.',
      'R3: 170 radius, powerful close pull, and 5.4 s duration.',
      'R4: a large singularity controls a wide area for 6 s.'
    ],
    category: 'active',
    tags: ['area'],
    rarity: 'rare',
    maxRank: 4,
    minLevel: 3,
    weight: 5,
    synergy: { with: 'molotov-egg', description: '25% stronger pull keeps enemies in the fire.' },
    apply: (_player, scene, rank) => scene.unlockVoidNest(rank)
  },
  {
    id: 'laser-comb',
    name: 'Laser Comb',
    description: 'Straight piercing laser with 48 damage.',
    rankDescriptions: [
      '48 damage, 610 range, and clearly readable charge, beam, and afterglow phases.',
      'R2: wider, bright-orange beam with a longer afterglow.',
      'R3: a golden parallel side beam accompanies the main beam.',
      'R4: near-white-hot main beam with about 0.58 s of afterglow discharge.'
    ],
    category: 'active',
    rarity: 'rare',
    maxRank: 4,
    minLevel: 3,
    weight: 5,
    apply: (_player, scene, rank) => scene.unlockLaserComb(rank)
  },
  {
    id: 'max-hp',
    name: 'Max HP',
    description: '+25 maximum and current HP.',
    category: 'passive',
    rarity: 'common',
    maxRank: 4,
    weight: 7,
    apply: (player) => player.addMaxHp(25)
  },
  {
    id: 'move-speed',
    name: 'Move Speed',
    description: '+24 movement speed.',
    category: 'passive',
    rarity: 'common',
    maxRank: 4,
    weight: 6,
    apply: (player) => {
      player.speed += 24;
    }
  },
  {
    id: 'armor',
    name: 'Armor',
    description: '-3 damage per incoming hit (minimum 1).',
    category: 'passive',
    rarity: 'common',
    maxRank: 4,
    weight: 5,
    apply: (player) => {
      player.armor += 3;
    }
  },
  {
    id: 'regen',
    name: 'Regen',
    description: '+1.25 HP regeneration per second.',
    category: 'passive',
    rarity: 'uncommon',
    maxRank: 3,
    weight: 5,
    apply: (player) => {
      player.regenPerSecond += 1.25;
    }
  },
  {
    id: 'xp-magnet',
    name: 'XP Magnet',
    description: '+55 XP orb pickup radius.',
    category: 'utility',
    rarity: 'common',
    maxRank: 3,
    weight: 5,
    apply: (player) => {
      player.xpMagnetRadius += 55;
    }
  },
  {
    id: 'piercing-eggs',
    name: 'Piercing Eggs',
    description: 'Primary eggs pierce +1 enemy.',
    category: 'weapon',
    rarity: 'uncommon',
    maxRank: 3,
    weight: 6,
    apply: (player) => {
      player.projectilePierce += 1;
    }
  },
  {
    id: 'bigger-eggs',
    name: 'Bigger Eggs',
    description: '+5 hit radius and larger primary eggs.',
    category: 'weapon',
    rarity: 'common',
    maxRank: 3,
    weight: 6,
    apply: (player) => {
      player.projectileSizeBonus += 5;
    }
  },
  {
    id: 'swift-shells',
    name: 'Swift Shells',
    description: '+70 flight speed for primary eggs.',
    category: 'weapon',
    rarity: 'common',
    maxRank: 3,
    weight: 6,
    apply: (player) => {
      player.projectileSpeedBonus += 70;
    }
  },
  {
    id: 'critical-yolk',
    name: 'Critical Yolk',
    description: '+10% chance to deal double primary-egg damage.',
    category: 'weapon',
    rarity: 'uncommon',
    maxRank: 3,
    minLevel: 2,
    weight: 5,
    apply: (player) => {
      player.critChance = Math.min(0.3, player.critChance + 0.1);
    }
  },
  {
    id: 'ricochet-eggs',
    name: 'Ricochet Eggs',
    description: 'Primary eggs bounce to +1 nearby unhit target.',
    category: 'weapon',
    rarity: 'rare',
    maxRank: 2,
    minLevel: 3,
    weight: 4,
    apply: (player, _scene, rank) => {
      player.projectileRicochets = rank;
    }
  },
  {
    id: 'shell-shock',
    name: 'Shell Shock',
    description: 'Primary eggs knock enemies back with 110 force.',
    category: 'weapon',
    rarity: 'uncommon',
    maxRank: 3,
    minLevel: 2,
    weight: 5,
    apply: (player, _scene, rank) => {
      player.projectileKnockback = rank;
    }
  },
  {
    id: 'second-wind',
    name: 'Second Wind',
    description: 'Once per run: survive death with 40% HP and 1.5 s protection.',
    category: 'utility',
    rarity: 'rare',
    maxRank: 1,
    minLevel: 3,
    weight: 3,
    apply: (player) => {
      player.secondWindCharges += 1;
    }
  },
  {
    id: 'ace-deadeye-drill',
    name: 'Deadeye Drill',
    description: 'Ace increases the critical chance and damage of his target eggs.',
    rankDescriptions: [
      '+4% critical chance and +15% critical damage.',
      '+8% total critical chance and +30% total critical damage.',
      '+12% total critical chance and +45% total critical damage; EVO recipe complete.'
    ],
    category: 'passive',
    rarity: 'uncommon',
    maxRank: 3,
    minLevel: 2,
    weight: 7,
    classId: 'ace',
    condition: (player) => player.roosterId === 'ace',
    apply: (player) => {
      player.critChance = Math.min(0.5, player.critChance + 0.04);
      player.critMultiplier += 0.15;
    }
  },
  {
    id: 'ace-guidance-fins',
    name: 'Guidance Fins',
    description: "Ace's eggs turn faster and lead targets farther ahead.",
    category: 'passive',
    rarity: 'uncommon',
    maxRank: 3,
    minLevel: 2,
    weight: 6,
    classId: 'ace',
    condition: (player) => player.roosterId === 'ace',
    apply: (player) => {
      player.primaryAttack.homingTurnRate = (player.primaryAttack.homingTurnRate ?? 0.08) + 0.025;
      player.projectileSpeedBonus += 25;
    }
  },
  {
    id: 'artillery-reinforced-breech',
    name: 'Reinforced Breech',
    description: "Boombardier's starting shell creates wider, harder shockwaves.",
    category: 'passive',
    rarity: 'uncommon',
    maxRank: 3,
    minLevel: 2,
    weight: 7,
    classId: 'artillery',
    condition: (player) => player.roosterId === 'artillery',
    apply: (player) => {
      player.primaryAttack.splashRadius = (player.primaryAttack.splashRadius ?? 0) + 10;
      player.primaryAttack.splashDamageRatio = Math.min(0.82, (player.primaryAttack.splashDamageRatio ?? 0) + 0.06);
    }
  },
  {
    id: 'artillery-blast-plating',
    name: 'Blast Plating',
    description: 'Boombardier gains HP and armor for fighting near his explosions.',
    category: 'passive',
    rarity: 'uncommon',
    maxRank: 3,
    minLevel: 2,
    weight: 6,
    classId: 'artillery',
    condition: (player) => player.roosterId === 'artillery',
    apply: (player) => {
      player.addMaxHp(8);
      player.armor += 2;
    }
  },
  {
    id: 'storm-static-plumage',
    name: 'Static Plumage',
    description: "Stormcrest's starting eggs chain farther through dense groups.",
    category: 'passive',
    rarity: 'uncommon',
    maxRank: 3,
    minLevel: 2,
    weight: 7,
    classId: 'storm',
    condition: (player) => player.roosterId === 'storm',
    apply: (player) => {
      player.primaryAttack.chainCount = (player.primaryAttack.chainCount ?? 0) + 1;
      player.primaryAttack.chainDamageRatio = Math.min(0.82, (player.primaryAttack.chainDamageRatio ?? 0) + 0.06);
      player.primaryAttack.chainRadius = (player.primaryAttack.chainRadius ?? 160) + 18;
    }
  },
  {
    id: 'storm-tailwind-training',
    name: 'Tailwind Training',
    description: 'Stormcrest moves faster and shortens his starting-weapon cycle.',
    category: 'passive',
    rarity: 'uncommon',
    maxRank: 3,
    minLevel: 2,
    weight: 6,
    classId: 'storm',
    condition: (player) => player.roosterId === 'storm',
    apply: (player) => {
      player.speed += 12;
      player.fireRate = Math.max(300, Math.round(player.fireRate * 0.93));
    }
  },
  {
    id: 'evo-sunshot-array',
    name: 'Sunshot Array',
    description: 'Target Egg becomes a critical triple volley with pierce and ricochet.',
    category: 'evolution',
    rarity: 'evolution',
    maxRank: 1,
    weight: 100,
    classId: 'ace',
    requires: ['primary-ace-rank', 'ace-deadeye-drill'],
    requiresMaxRank: ['primary-ace-rank'],
    condition: (player) => player.roosterId === 'ace',
    evolution: { base: 'primary-ace', passive: 'ace-deadeye-drill' },
    apply: (_player, scene) => scene.evolveAbility('primary-ace', 'evo-sunshot-array')
  },
  {
    id: 'evo-siegebreaker-shell',
    name: 'Siegebreaker Shell',
    description: 'Blast Shell becomes armor-piercing and releases a second shockwave.',
    category: 'evolution',
    rarity: 'evolution',
    maxRank: 1,
    weight: 100,
    classId: 'artillery',
    requires: ['primary-artillery-rank', 'artillery-reinforced-breech'],
    requiresMaxRank: ['primary-artillery-rank'],
    condition: (player) => player.roosterId === 'artillery',
    evolution: { base: 'primary-artillery', passive: 'artillery-reinforced-breech' },
    apply: (_player, scene) => scene.evolveAbility('primary-artillery', 'evo-siegebreaker-shell')
  },
  {
    id: 'evo-tempest-crown',
    name: 'Tempest Crown',
    description: 'Storm Egg becomes a twin shot with three additional chain jumps.',
    category: 'evolution',
    rarity: 'evolution',
    maxRank: 1,
    weight: 100,
    classId: 'storm',
    requires: ['primary-storm-rank', 'storm-static-plumage'],
    requiresMaxRank: ['primary-storm-rank'],
    condition: (player) => player.roosterId === 'storm',
    evolution: { base: 'primary-storm', passive: 'storm-static-plumage' },
    apply: (_player, scene) => scene.evolveAbility('primary-storm', 'evo-tempest-crown')
  },
  {
    id: 'evo-solar-scramble',
    name: 'Solar Scramble',
    description: 'Golden Egg becomes a triple volley of burning sun eggs.',
    category: 'evolution',
    rarity: 'evolution',
    maxRank: 1,
    weight: 100,
    requires: ['fire-eggs'],
    requiresMaxRank: ['golden-egg'],
    evolution: { base: 'golden-egg', passive: 'fire-eggs' },
    apply: (_player, scene) => scene.evolveAbility('golden-egg', 'evo-solar-scramble')
  },
  {
    id: 'evo-thunder-roost',
    name: 'Thunder Roost',
    description: 'Lightning Comb discharges a color-coded storm across up to ten targets.',
    category: 'evolution',
    rarity: 'evolution',
    maxRank: 1,
    weight: 100,
    requires: ['critical-yolk'],
    requiresMaxRank: ['lightning-comb'],
    evolution: { base: 'lightning-comb', passive: 'critical-yolk' },
    apply: (_player, scene) => scene.evolveAbility('lightning-comb', 'evo-thunder-roost')
  },
  {
    id: 'evo-shell-halo',
    name: 'Shell Halo',
    description: 'Six charged Orbit Eggs breathe between two large orbits and jump to a second target.',
    category: 'evolution',
    rarity: 'evolution',
    maxRank: 1,
    weight: 100,
    requires: ['armor'],
    requiresMaxRank: ['orbit-eggs'],
    evolution: { base: 'orbit-eggs', passive: 'armor' },
    apply: (_player, scene) => scene.evolveAbility('orbit-eggs', 'evo-shell-halo')
  },
  {
    id: 'evo-broodstorm',
    name: 'Broodstorm Battery',
    description: 'Three staggered Broodstorm rockets each deal 112 damage in a 158 radius.',
    category: 'evolution',
    rarity: 'evolution',
    maxRank: 1,
    weight: 100,
    requires: ['bigger-eggs'],
    requiresMaxRank: ['rocket-egg'],
    evolution: { base: 'rocket-egg', passive: 'bigger-eggs' },
    apply: (_player, scene) => scene.evolveAbility('rocket-egg', 'evo-broodstorm')
  },
  {
    id: 'evo-singularity-nest',
    name: 'Singularity Nest',
    description: 'Void Nest opens a massive singularity with 225 radius, powerful close pull, and 7.2 s duration.',
    category: 'evolution',
    rarity: 'evolution',
    maxRank: 1,
    weight: 100,
    requires: ['xp-magnet'],
    requiresMaxRank: ['void-nest'],
    evolution: { base: 'void-nest', passive: 'xp-magnet' },
    apply: (_player, scene) => scene.evolveAbility('void-nest', 'evo-singularity-nest')
  },
  {
    id: 'evo-phoenix-pan',
    name: 'Phoenix Pan',
    description: 'Molotov Egg throws two fire pans and leaves larger burning areas.',
    category: 'evolution',
    rarity: 'evolution',
    maxRank: 1,
    weight: 100,
    requires: ['regen'],
    requiresMaxRank: ['molotov-egg'],
    evolution: { base: 'molotov-egg', passive: 'regen' },
    apply: (_player, scene) => scene.evolveAbility('molotov-egg', 'evo-phoenix-pan')
  },
  {
    id: 'evo-dawn-laser',
    name: 'Dawn Prism',
    description: 'Laser Comb splits into three wide, differently colored beams.',
    category: 'evolution',
    rarity: 'evolution',
    maxRank: 1,
    weight: 100,
    requires: ['swift-shells'],
    requiresMaxRank: ['laser-comb'],
    evolution: { base: 'laser-comb', passive: 'swift-shells' },
    apply: (_player, scene) => scene.evolveAbility('laser-comb', 'evo-dawn-laser')
  },
  {
    id: 'evo-chick-squadron',
    name: 'Chick Squadron',
    description: 'Four Support Chicks fire rapid twin volleys and heavily slow enemies they hit.',
    category: 'evolution',
    rarity: 'evolution',
    maxRank: 1,
    weight: 100,
    requires: ['faster-eggs'],
    requiresMaxRank: ['support-chick'],
    evolution: { base: 'support-chick', passive: 'faster-eggs' },
    apply: (_player, scene) => scene.evolveAbility('support-chick', 'evo-chick-squadron')
  }
];
