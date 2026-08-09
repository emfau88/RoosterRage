export const UPGRADE_DEFINITIONS = [
  {
    id: 'heal',
    name: 'Heal',
    description: 'Regeneriert sofort 25 HP.',
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
    description: 'Feuert 2 zielsuchende Eier pro Angriff.',
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
    description: 'Ersetzt Double Shot durch 3 zielsuchende Eier.',
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
    description: '+10 Schaden pro Ei und feurige Projektile.',
    category: 'weapon',
    rarity: 'common',
    maxRank: 3,
    weight: 8,
    synergy: { with: 'rocket-egg', description: 'Rocket Egg verursacht 25% mehr Explosionsschaden.' },
    apply: (player) => {
      player.fireEggs = true;
      player.projectileDamage += 10;
    }
  },
  {
    id: 'faster-eggs',
    name: 'Faster Eggs',
    description: '18% kuerzere Abklingzeit des Basisangriffs.',
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
    description: 'Periodisches grosses Ei: 60 Schaden, 3 Durchschlaege.',
    rankDescriptions: [
      '60 Schaden, 3 Durchschlaege, 4,55 s Abklingzeit.',
      '78 Schaden, 4 Durchschlaege, 3,90 s Abklingzeit.',
      '96 Schaden, 5 Durchschlaege, 3,25 s Abklingzeit.'
    ],
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
    description: 'Ein Ei kreist um den Hahn und verursacht 19 Kontaktschaden.',
    rankDescriptions: [
      '1 Orbit-Ei mit 19 Kontaktschaden.',
      '2 Orbit-Eier mit je 24 Kontaktschaden.',
      '3 Orbit-Eier mit je 29 Kontaktschaden.'
    ],
    category: 'orbit',
    rarity: 'rare',
    maxRank: 3,
    minLevel: 2,
    weight: 6,
    synergy: { with: 'lightning-comb', description: 'Lightning Comb trifft ein Ziel mehr und verursacht 20% mehr Schaden.' },
    apply: (_player, scene, rank) => scene.setOrbitEggRank(rank)
  },
  {
    id: 'molotov-egg',
    name: 'Molotov Egg',
    description: 'Wirft alle 5,7 s eine brennende Flaeche.',
    rankDescriptions: [
      '90 Radius, 12 Schaden pro Tick, 5,7 s Abklingzeit.',
      '106 Radius, 16 Schaden pro Tick, 5,0 s Abklingzeit.',
      '122 Radius, 20 Schaden pro Tick, 4,3 s Abklingzeit.'
    ],
    category: 'active',
    tags: ['area'],
    rarity: 'rare',
    maxRank: 3,
    minLevel: 2,
    weight: 6,
    synergy: { with: 'void-nest', description: 'Void Nest zieht Gegner 25% staerker in die Feuerflaeche.' },
    apply: (_player, scene, rank) => scene.unlockMolotovEgg(rank)
  },
  {
    id: 'lightning-comb',
    name: 'Lightning Comb',
    description: 'Kettenblitz auf bis zu 3 Ziele.',
    rankDescriptions: [
      'Bis zu 3 Ziele, 34 Basisschaden, 4,55 s Abklingzeit.',
      'Bis zu 4 Ziele, 44 Basisschaden, 3,90 s Abklingzeit.',
      'Bis zu 5 Ziele, 54 Basisschaden, 3,25 s Abklingzeit.'
    ],
    category: 'active',
    rarity: 'rare',
    maxRank: 3,
    minLevel: 2,
    weight: 6,
    synergy: { with: 'orbit-eggs', description: 'Ein zusaetzliches Ziel und 20% mehr Blitzschaden.' },
    apply: (_player, scene, rank) => scene.unlockLightningComb(rank)
  },
  {
    id: 'support-chick',
    name: 'Support Chick',
    description: '1 Begleiter feuert alle 1,27 s fuer 17 Schaden.',
    rankDescriptions: [
      '1 Begleiter: 17 Schaden, 1,27 s Schussabstand.',
      '2 Begleiter: je 22 Schaden, 1,09 s Schussabstand.'
    ],
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
    description: 'Zielsuchende Rakete mit 48 Flaechenschaden.',
    rankDescriptions: [
      '48 Schaden in 74 Radius, 4,98 s Abklingzeit.',
      '62 Schaden in 86 Radius, 4,36 s Abklingzeit.',
      '76 Schaden in 98 Radius, 3,74 s Abklingzeit.'
    ],
    category: 'active',
    rarity: 'rare',
    maxRank: 3,
    minLevel: 3,
    weight: 5,
    synergy: { with: 'fire-eggs', description: '25% mehr Explosionsschaden.' },
    apply: (_player, scene, rank) => scene.unlockRocketEgg(rank)
  },
  {
    id: 'void-nest',
    name: 'Void Nest',
    description: 'Zieht Gegner in einer Zone zusammen und verursacht Schaden.',
    rankDescriptions: [
      '110 Radius, 11 Schaden pro Tick, 6,8 s Abklingzeit.',
      '128 Radius, 15 Schaden pro Tick, 6,0 s Abklingzeit.',
      '146 Radius, 19 Schaden pro Tick, 5,2 s Abklingzeit.'
    ],
    category: 'active',
    tags: ['area'],
    rarity: 'rare',
    maxRank: 3,
    minLevel: 3,
    weight: 5,
    synergy: { with: 'molotov-egg', description: '25% staerkerer Sog haelt Gegner im Feuer.' },
    apply: (_player, scene, rank) => scene.unlockVoidNest(rank)
  },
  {
    id: 'laser-comb',
    name: 'Laser Comb',
    description: 'Gerader Piercing-Laser mit 48 Schaden.',
    rankDescriptions: [
      '48 Schaden, 610 Reichweite, 5,64 s Abklingzeit.',
      '64 Schaden, 700 Reichweite, 4,88 s Abklingzeit.',
      '80 Schaden, 790 Reichweite, 4,12 s Abklingzeit.'
    ],
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
    description: '+25 maximale und aktuelle HP.',
    category: 'passive',
    rarity: 'common',
    maxRank: 4,
    weight: 7,
    apply: (player) => player.addMaxHp(25)
  },
  {
    id: 'move-speed',
    name: 'Move Speed',
    description: '+24 Bewegungsgeschwindigkeit.',
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
    description: '-3 Schaden pro eingehendem Treffer (Minimum 1).',
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
    description: '+1,25 HP Regeneration pro Sekunde.',
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
    description: '+55 Reichweite zum Anziehen von XP-Orbs.',
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
    description: 'Basis-Eier durchschlagen +1 Gegner.',
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
    description: '+5 Trefferadius und groessere Basis-Eier.',
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
    description: '+70 Fluggeschwindigkeit fuer Basis-Eier.',
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
    description: '+10% Chance auf doppelten Basis-Ei-Schaden.',
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
    description: 'Basis-Eier springen auf +1 nahes, ungetroffenes Ziel.',
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
    description: 'Basis-Eier stossen Gegner um 110 Impuls zurueck.',
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
    description: 'Einmalig: Statt Tod 40% HP und 1,5 s Schutz.',
    category: 'utility',
    rarity: 'rare',
    maxRank: 1,
    minLevel: 3,
    weight: 3,
    apply: (player) => {
      player.secondWindCharges += 1;
    }
  }
];
