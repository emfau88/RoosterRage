import Phaser from 'phaser';
import { UPGRADE_DEFINITIONS } from '../data/upgradeDefinitions.js';

const SPECTACLE_CATEGORIES = ['active', 'orbit', 'area', 'summon'];

export class UpgradeSystem {
  constructor(upgrades = UPGRADE_DEFINITIONS) {
    this.upgrades = upgrades.map((upgrade) => ({ ...upgrade }));
  }

  getChoices(count = 3, player) {
    const available = this.upgrades.filter((upgrade) => this.isAvailable(upgrade, player));
    const choices = [];
    const spectacle = this.pickWeighted(
      available.filter((upgrade) => SPECTACLE_CATEGORIES.includes(upgrade.category)),
      player
    );
    if (spectacle) {
      choices.push(spectacle);
    }

    ['weapon', 'passive'].forEach((category) => {
      const picked = this.pickWeighted(
        available.filter((upgrade) => upgrade.category === category && !choices.includes(upgrade)),
        player
      );
      if (picked) {
        choices.push(picked);
      }
    });

    while (choices.length < count && choices.length < available.length) {
      const picked = this.pickWeighted(available.filter((upgrade) => !choices.includes(upgrade)), player);
      if (!picked) {
        break;
      }
      choices.push(picked);
    }

    return Phaser.Utils.Array.Shuffle(choices).slice(0, count);
  }

  isAvailable(upgrade, player) {
    if (!player) {
      return true;
    }
    if (upgrade.minLevel && player.level < upgrade.minLevel) {
      return false;
    }
    if (!upgrade.consumable && upgrade.maxRank && player.getUpgradeRank(upgrade.id) >= upgrade.maxRank) {
      return false;
    }
    if (upgrade.requires?.some((id) => player.getUpgradeRank(id) <= 0)) {
      return false;
    }
    if (upgrade.excludes?.some((id) => player.getUpgradeRank(id) > 0)) {
      return false;
    }
    return true;
  }

  pickWeighted(upgrades, player) {
    if (!upgrades.length) {
      return null;
    }

    const weighted = upgrades.map((upgrade) => ({
      upgrade,
      weight: this.getDynamicWeight(upgrade, player)
    }));
    const total = weighted.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;
    for (const item of weighted) {
      roll -= item.weight;
      if (roll <= 0) {
        return item.upgrade;
      }
    }
    return weighted[weighted.length - 1].upgrade;
  }

  getDynamicWeight(upgrade, player) {
    let weight = upgrade.weight ?? 1;
    if (!player) {
      return weight;
    }
    if (upgrade.id === 'heal' && player.hp >= player.maxHp * 0.85) {
      weight *= 0.25;
    }
    if (SPECTACLE_CATEGORIES.includes(upgrade.category)) {
      weight *= player.level <= 5 ? 2.15 : 1.15;
    }
    if (upgrade.rarity === 'rare') {
      weight *= 0.8;
    }
    return Math.max(0.1, weight);
  }
}
