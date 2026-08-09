import Phaser from 'phaser';
import { UPGRADE_DEFINITIONS } from '../data/upgradeDefinitions.js';

const SPECTACLE_CATEGORIES = ['active', 'orbit', 'area', 'summon'];
const CATEGORY_LABELS = {
  weapon: 'Weapon',
  active: 'Active',
  orbit: 'Orbit',
  summon: 'Summon',
  passive: 'Passive',
  utility: 'Utility'
};

export class UpgradeSystem {
  constructor(upgrades = UPGRADE_DEFINITIONS) {
    this.upgrades = upgrades.map((upgrade) => ({ ...upgrade }));
  }

  getChoices(count = 3, player) {
    const available = this.upgrades.filter((upgrade) => this.isAvailable(upgrade, player));
    const choices = [];
    if (this.shouldGuaranteeSpectacle(player)) {
      const spectacle = this.pickWeighted(
        available.filter((upgrade) => SPECTACLE_CATEGORIES.includes(upgrade.category)),
        player
      );
      if (spectacle) {
        choices.push(spectacle);
      }
    }

    const weapon = this.pickWeighted(
      available.filter((upgrade) => upgrade.category === 'weapon' && !choices.includes(upgrade)),
      player
    );
    if (weapon) {
      choices.push(weapon);
    }

    while (choices.length < count && choices.length < available.length) {
      const picked = this.pickWeighted(available.filter((upgrade) => !choices.includes(upgrade)), player);
      if (!picked) {
        break;
      }
      choices.push(picked);
    }

    return Phaser.Utils.Array.Shuffle(choices)
      .slice(0, count)
      .map((upgrade) => this.presentUpgrade(upgrade, player));
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
    if (upgrade.condition && !upgrade.condition(player)) {
      return false;
    }
    return true;
  }

  shouldGuaranteeSpectacle(player) {
    if (!player || player.level > 5) {
      return false;
    }
    return !this.upgrades.some((upgrade) => (
      SPECTACLE_CATEGORIES.includes(upgrade.category)
      && player.getUpgradeRank(upgrade.id) > 0
    ));
  }

  presentUpgrade(upgrade, player) {
    const nextRank = upgrade.consumable ? null : (player?.getUpgradeRank(upgrade.id) ?? 0) + 1;
    const rankDescription = nextRank ? upgrade.rankDescriptions?.[nextRank - 1] : null;
    const synergyActive = Boolean(
      player
      && upgrade.synergy
      && player.getUpgradeRank(upgrade.synergy.with) > 0
    );
    return {
      ...upgrade,
      description: rankDescription ?? upgrade.description,
      nextRank,
      rankLabel: upgrade.consumable
        ? 'Sofort'
        : `Rang ${nextRank}/${upgrade.maxRank}`,
      categoryLabel: CATEGORY_LABELS[upgrade.category] ?? upgrade.category,
      synergyActive,
      synergyDescription: synergyActive ? upgrade.synergy.description : null
    };
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
    if (upgrade.id === 'heal' && player.hp <= player.maxHp * 0.35) {
      weight *= 1.8;
    }
    if (SPECTACLE_CATEGORIES.includes(upgrade.category)) {
      weight *= player.level <= 5 ? 1.35 : 1.05;
    }
    if (upgrade.rarity === 'rare') {
      weight *= 0.8;
    }
    if (!upgrade.consumable && player.getUpgradeRank(upgrade.id) > 0) {
      weight *= 1.12;
    }
    weight *= player.upgradeAffinities?.[upgrade.id] ?? 1;
    return Math.max(0.1, weight);
  }
}
