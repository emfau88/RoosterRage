import { applyTargetEggVisual } from './targetEggVisuals.js';
import { applyBlastShellVisual, applyStormEggVisual } from './primaryWeaponVisuals.js';

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
    description: 'Ersetzt Double Shot durch 3 zielsuchende Eier.',
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
    description: '+10 Schaden pro Ei und feurige Projektile.',
    rankDescriptions: [
      'R1: +10 Schaden; kompakte Fire Eggs brennen mit ruhigem, fließendem Flackern.',
      'R2: insgesamt +20 Schaden; größere Flammen pulsieren sichtbar intensiver.',
      'R3: insgesamt +30 Schaden; weißglühende Fire Eggs mit kräftiger, flüssiger Flammenbewegung.'
    ],
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
    id: 'primary-ace-rank',
    name: 'Target Egg',
    description: 'Entwickelt Aces Startwaffe von R1 bis R4.',
    rankDescriptions: [
      'R2 Twin Lock: Größere, hellere Ziel-Eier; jeder 2. Angriff feuert eine Zwillingssalve.',
      'R3 Deadeye Shell: Größere Gold-Eier; jeder 4. Angriff wird zum hellen Pierce-Ricochet-Krit.',
      'R4 Hunter Array: Dauerhafte Doppelsalve aus großen tiefgoldenen Eiern mit dünner Goldfährte.'
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
    description: 'Entwickelt Boombardiers Startwaffe von R1 bis R4.',
    rankDescriptions: [
      'R2 Heavy Load: Größere Granate, stärkere Spur und breiterer Explosionsradius.',
      'R3 Shrapnel Yolk: Der Einschlag erzeugt vier kurze Mini-Blasts.',
      'R4 Siege Load: Massive Granate mit stärkerer zweiter Druckwelle.'
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
    description: 'Entwickelt Stormcrests Startwaffe von R1 bis R4.',
    rankDescriptions: [
      'R2 Static Fork: Ein zusätzlicher, weiter reichender Kettensprung.',
      'R3 Arc Pair: Jeder Angriff feuert zwei versetzte elektrische Impulse.',
      'R4 Storm Circuit: Drei Kettensprünge, größere Reichweite und helle Nachleuchtspuren.'
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
    description: '18 % kürzere Abklingzeit des Basisangriffs.',
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
    description: 'Periodisches großes Ei: 60 Schaden, 3 Durchschläge.',
    rankDescriptions: [
      '60 Schaden, 3 Durchschläge, 4,55 s Abklingzeit.',
      'R2: größeres Ei, breiterer Treffer und stärkere Goldspur.',
      'R3: Solar-Sparks springen beim Durchschlag auf nahe Gegner.',
      'R4: zwei Golden Eggs starten versetzt auf verschiedene Ziele.'
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
    description: 'Ein Ei kreist um den Hahn und verursacht 19 Kontaktschaden.',
    rankDescriptions: [
      '1 größeres Orbit-Ei kreist mit 80er Radius und verursacht 19 Kontaktschaden.',
      '2 größere Orbit-Eier kreisen mit 90er Radius und verursachen je 24 Kontaktschaden.',
      '3 goldleuchtende Orbit-Eier kreisen mit 100er Radius und verursachen je 29 Kontaktschaden.',
      '4 goldene Orbit-Eier kreisen paarweise auf 104er und 130er Umlaufbahnen.'
    ],
    category: 'orbit',
    rarity: 'rare',
    maxRank: 4,
    minLevel: 2,
    weight: 6,
    synergy: { with: 'lightning-comb', description: 'Lightning Comb trifft ein Ziel mehr und verursacht 20% mehr Schaden.' },
    apply: (_player, scene, rank) => scene.setOrbitEggRank(rank)
  },
  {
    id: 'molotov-egg',
    name: 'Molotov Egg',
    description: 'Wirft alle 5,7 s eine brennende Fläche.',
    rankDescriptions: [
      '90 Radius, 10 Schaden pro Tick, 3,0 s Branddauer, 5,7 s Abklingzeit.',
      'R2: 108 Radius, 12 Schaden pro Tick und 3,4 s Branddauer.',
      'R3: 124 Radius, 14 Schaden pro Tick, 3,8 s Dauer und sichtbare Schadenspulse.',
      'R4: zwei kompakte Brandfelder landen um 0,25 s versetzt und halten 4,0 s.'
    ],
    category: 'active',
    tags: ['area'],
    rarity: 'rare',
    maxRank: 4,
    minLevel: 2,
    weight: 6,
    synergy: { with: 'void-nest', description: 'Void Nest zieht Gegner 25 % stärker in die Feuerfläche.' },
    apply: (_player, scene, rank) => scene.unlockMolotovEgg(rank)
  },
  {
    id: 'lightning-comb',
    name: 'Lightning Comb',
    description: 'Kettenblitz auf bis zu 3 Ziele.',
    rankDescriptions: [
      'Bis zu 3 Ziele, 34 Basisschaden, 4,55 s Abklingzeit.',
      'Bis zu 4 Ziele, 44 Basisschaden, 3,90 s Abklingzeit.',
      'R3: bis zu 5 Ziele und ein verzweigter End-Burst.',
      'R4: bis zu 6 Ziele mit zentraler Entladung.'
    ],
    category: 'active',
    rarity: 'rare',
    maxRank: 4,
    minLevel: 2,
    weight: 6,
    synergy: { with: 'orbit-eggs', description: 'Ein zusätzliches Ziel und 20 % mehr Blitzschaden.' },
    apply: (_player, scene, rank) => scene.unlockLightningComb(rank)
  },
  {
    id: 'support-chick',
    name: 'Support Chick',
    description: 'Ein Begleiter startet einen ausbaubaren Projektil- und Debuff-Pfad.',
    rankDescriptions: [
      '1 Begleiter feuert für 17 Schaden.',
      'Der Begleiter feuert eine Zweier-Salve mit 1 Durchschlag.',
      'Treffer verlangsamen Gegner für 0,7 s.',
      'Ein zweiter Begleiter tritt dem Schwarm bei.',
      'Drei Begleiter feuern schneller und verlangsamen stärker.'
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
    description: 'Zielsuchende Rakete mit 48 Flächenschaden.',
    rankDescriptions: [
      '48 Schaden in 82 Radius mit kompakter Eierschalen-Rakete.',
      'R2: 64 Schaden in 100 Radius, verstärkte Rakete und bessere Zielsuche.',
      'R3: 80 Schaden in 118 Radius; drei gestaffelte Cluster-Blasts folgen.',
      'R4: zwei schwere Raketen treffen mit je 96 Schaden in 132 Radius.'
    ],
    category: 'active',
    rarity: 'rare',
    maxRank: 4,
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
      '132 Radius, 11 Schaden pro Tick und 4,2 s Sog: außen sanft, am Kern stark.',
      'R2: 150 Radius, stärkerer Sog und 4,8 s stabile Portalphase.',
      'R3: 170 Radius, kräftiger Nahsog und 5,4 s Wirkungsdauer.',
      'R4: eine große Singularität kontrolliert einen weiten Raum für 6 s.'
    ],
    category: 'active',
    tags: ['area'],
    rarity: 'rare',
    maxRank: 4,
    minLevel: 3,
    weight: 5,
    synergy: { with: 'molotov-egg', description: '25 % stärkerer Sog hält Gegner im Feuer.' },
    apply: (_player, scene, rank) => scene.unlockVoidNest(rank)
  },
  {
    id: 'laser-comb',
    name: 'Laser Comb',
    description: 'Gerader Piercing-Laser mit 48 Schaden.',
    rankDescriptions: [
      '48 Schaden, 610 Reichweite und klar lesbare Lade-, Strahl- und Nachglühphase.',
      'R2: breiterer, helloranger Strahl mit längerem Nachglühen.',
      'R3: ein goldener paralleler Side-Beam begleitet den Hauptstrahl.',
      'R4: fast weißglühender Hauptstrahl mit rund 0,58 s Nachentladung.'
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
    description: '+5 Trefferradius und größere Basis-Eier.',
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
    description: '+70 Fluggeschwindigkeit für Basis-Eier.',
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
    description: 'Basis-Eier stoßen Gegner mit 110 Impuls zurück.',
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
  },
  {
    id: 'ace-deadeye-drill',
    name: 'Deadeye Drill',
    description: 'Ace erhöht Krit-Chance und Krit-Schaden seiner Ziel-Eier.',
    rankDescriptions: [
      '+4% Krit-Chance und +15% Krit-Schaden.',
      'Insgesamt +8% Krit-Chance und +30% Krit-Schaden.',
      'Insgesamt +12% Krit-Chance und +45% Krit-Schaden; EVO-Rezept komplett.'
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
    description: 'Ace-Eier drehen schneller ein und fliegen weiter voraus.',
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
    description: 'Boombardiers Startgranate erzeugt breitere und härtere Druckwellen.',
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
    description: 'Boombardier erhält HP und Panzerung für den Nahbereich seiner Explosionen.',
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
    description: 'Stormcrests Start-Eier springen weiter durch dichte Gruppen.',
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
    description: 'Stormcrest bewegt sich schneller und verkürzt den Startwaffen-Takt.',
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
    description: 'Target Egg wird zur kritischen Dreiersalve mit Durchschlag und Ricochet.',
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
    description: 'Blast Shell wird panzerbrechend und löst eine zweite Druckwelle aus.',
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
    description: 'Storm Egg wird zum Zwillingsschuss mit drei zusätzlichen Kettensprüngen.',
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
    description: 'Golden Egg wird zu einer Dreifach-Salve aus brennenden Sonnen-Eiern.',
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
    description: 'Lightning Comb entlädt einen farblich klaren Sturm über bis zu zehn Ziele.',
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
    description: 'Sechs geladene Orbit-Eier atmen zwischen zwei großen Umlaufbahnen und springen auf ein zweites Ziel.',
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
    description: 'Drei versetzte Broodstorm-Raketen verursachen je 112 Schaden in 158 Radius.',
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
    description: 'Void Nest öffnet eine gewaltige Singularität mit 225 Radius, massivem Nahsog und 7,2 s Dauer.',
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
    description: 'Molotov Egg wirft zwei Feuerpfannen und hinterlässt größere Brandfelder.',
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
    description: 'Laser Comb spaltet sich in drei breite, verschiedenfarbige Strahlen.',
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
    description: 'Vier Support Chicks feuern schnelle Doppelsalven und verlangsamen getroffene Gegner stark.',
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
