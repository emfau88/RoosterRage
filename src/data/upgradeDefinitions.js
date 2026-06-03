export const UPGRADE_DEFINITIONS = [
  {
    id: 'heal',
    name: 'Heal',
    description: 'Regeneriert sofort 25 HP.',
    category: 'utility',
    rarity: 'common',
    weight: 5,
    consumable: true,
    apply: (player) => player.heal(25)
  },
  {
    id: 'double-shot',
    name: 'Double Shot',
    description: 'Schiesst 2 Eier mit Zielsuche.',
    category: 'weapon',
    rarity: 'common',
    maxRank: 1,
    weight: 9,
    excludes: ['triple-shot'],
    apply: (player) => {
      player.shotCount = Math.max(player.shotCount, 2);
    }
  },
  {
    id: 'triple-shot',
    name: 'Triple Shot',
    description: 'Schiesst 3 zielsuchende Eier.',
    category: 'weapon',
    rarity: 'rare',
    maxRank: 1,
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
    description: 'Eier verursachen mehr Schaden und brennen rot.',
    category: 'weapon',
    rarity: 'common',
    maxRank: 3,
    weight: 8,
    apply: (player) => {
      player.fireEggs = true;
      player.projectileDamage += 10;
    }
  },
  {
    id: 'faster-eggs',
    name: 'Faster Eggs',
    description: 'Die Schussrate wird erhoeht.',
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
    description: 'Feuert periodisch ein grosses Piercing-Ei.',
    category: 'active',
    rarity: 'rare',
    maxRank: 3,
    minLevel: 2,
    weight: 6,
    apply: (_player, scene, rank) => scene.unlockGoldenEgg(rank)
  },
  {
    id: 'orbit-eggs',
    name: 'Orbit Eggs',
    description: 'Eier wirbeln um den Hahn und treffen Gegner.',
    category: 'orbit',
    rarity: 'rare',
    maxRank: 3,
    minLevel: 2,
    weight: 6,
    apply: (_player, scene, rank) => scene.setOrbitEggRank(rank)
  },
  {
    id: 'molotov-egg',
    name: 'Molotov Egg',
    description: 'Wirft brennende Flaechen auf Gegnergruppen.',
    category: 'area',
    rarity: 'rare',
    maxRank: 3,
    minLevel: 2,
    weight: 6,
    apply: (_player, scene, rank) => scene.unlockMolotovEgg(rank)
  },
  {
    id: 'lightning-comb',
    name: 'Lightning Comb',
    description: 'Kettenblitze springen auf mehrere Gegner.',
    category: 'active',
    rarity: 'rare',
    maxRank: 3,
    minLevel: 2,
    weight: 6,
    apply: (_player, scene, rank) => scene.unlockLightningComb(rank)
  },
  {
    id: 'support-chick',
    name: 'Support Chick',
    description: 'Ein Mini-Huhn begleitet dich und feuert kleine Eier.',
    category: 'summon',
    rarity: 'rare',
    maxRank: 2,
    minLevel: 2,
    weight: 6,
    apply: (_player, scene, rank) => scene.setSupportChickenRank(rank)
  },
  {
    id: 'rocket-egg',
    name: 'Rocket Egg',
    description: 'Feuert periodisch eine zielsuchende Explosiv-Rakete.',
    category: 'active',
    rarity: 'rare',
    maxRank: 3,
    minLevel: 3,
    weight: 5,
    apply: (_player, scene, rank) => scene.unlockRocketEgg(rank)
  },
  {
    id: 'void-nest',
    name: 'Void Nest',
    description: 'Oeffnet eine dunkle Zone, die Gegner zieht und verletzt.',
    category: 'area',
    rarity: 'rare',
    maxRank: 3,
    minLevel: 3,
    weight: 5,
    apply: (_player, scene, rank) => scene.unlockVoidNest(rank)
  },
  {
    id: 'laser-comb',
    name: 'Laser Comb',
    description: 'Feuert periodisch einen geraden Piercing-Laser.',
    category: 'active',
    rarity: 'rare',
    maxRank: 3,
    minLevel: 3,
    weight: 5,
    apply: (_player, scene, rank) => scene.unlockLaserComb(rank)
  },
  {
    id: 'max-hp',
    name: 'Max HP',
    description: 'Maximale und aktuelle HP steigen um 25.',
    category: 'passive',
    rarity: 'common',
    maxRank: 4,
    weight: 7,
    apply: (player) => player.addMaxHp(25)
  },
  {
    id: 'move-speed',
    name: 'Move Speed',
    description: 'Der Hahn bewegt sich schneller.',
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
    description: 'Reduziert eingehenden Schaden dauerhaft.',
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
    description: 'Regeneriert langsam HP.',
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
    description: 'XP-Orbs werden aus groesserer Distanz angezogen.',
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
    description: 'Eier durchschlagen einen weiteren Gegner.',
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
    description: 'Eier treffen mit groesserer Hitbox.',
    category: 'weapon',
    rarity: 'common',
    maxRank: 3,
    weight: 6,
    apply: (player) => {
      player.projectileSizeBonus += 5;
    }
  }
];
