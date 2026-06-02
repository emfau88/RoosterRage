import Phaser from 'phaser';

export class UpgradeSystem {
  constructor() {
    this.upgrades = [
      {
        id: 'heal',
        name: 'Heal',
        description: 'Regeneriert sofort 25 HP.',
        apply: (player) => player.heal(25)
      },
      {
        id: 'double-shot',
        name: 'Double Shot',
        description: 'Schiesst 2 Eier gleichzeitig.',
        apply: (player) => {
          player.shotCount = Math.max(player.shotCount, 2);
        }
      },
      {
        id: 'triple-shot',
        name: 'Triple Shot',
        description: 'Schiesst 3 Eier gleichzeitig.',
        apply: (player) => {
          player.shotCount = Math.max(player.shotCount, 3);
        }
      },
      {
        id: 'fire-eggs',
        name: 'Fire Eggs',
        description: 'Eier verursachen mehr Schaden und brennen rot.',
        apply: (player) => {
          player.fireEggs = true;
          player.projectileDamage += 12;
        }
      },
      {
        id: 'faster-eggs',
        name: 'Faster Eggs',
        description: 'Die Schussrate wird deutlich erhoeht.',
        apply: (player) => {
          player.fireRate = Math.max(320, Math.round(player.fireRate * 0.78));
        }
      },
      {
        id: 'max-hp',
        name: 'Max HP',
        description: 'Maximale und aktuelle HP steigen um 25.',
        apply: (player) => player.addMaxHp(25)
      },
      {
        id: 'move-speed',
        name: 'Move Speed',
        description: 'Der Hahn bewegt sich schneller.',
        apply: (player) => {
          player.speed += 28;
        }
      },
      {
        id: 'armor',
        name: 'Armor',
        description: 'Reduziert eingehenden Schaden dauerhaft.',
        apply: (player) => {
          player.armor += 3;
        }
      },
      {
        id: 'regen',
        name: 'Regen',
        description: 'Regeneriert langsam HP.',
        apply: (player) => {
          player.regenPerSecond += 1.4;
        }
      },
      {
        id: 'xp-magnet',
        name: 'XP Magnet',
        description: 'XP-Orbs werden aus groesserer Distanz angezogen.',
        apply: (player) => {
          player.xpMagnetRadius += 55;
        }
      },
      {
        id: 'piercing-eggs',
        name: 'Piercing Eggs',
        description: 'Eier durchschlagen einen weiteren Gegner.',
        apply: (player) => {
          player.projectilePierce += 1;
        }
      },
      {
        id: 'bigger-eggs',
        name: 'Bigger Eggs',
        description: 'Eier treffen mit groesserer Hitbox.',
        apply: (player) => {
          player.projectileSizeBonus += 5;
        }
      }
    ];
  }

  getChoices(count = 3) {
    return Phaser.Utils.Array.Shuffle([...this.upgrades]).slice(0, count);
  }
}
