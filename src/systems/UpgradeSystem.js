import { UPGRADE_DEFINITIONS } from '../data/upgradeDefinitions.js';
import { RandomSystem } from './RandomSystem.js';

const SPECTACLE_CATEGORIES = ['active', 'orbit', 'area', 'summon'];
const CATEGORY_LABELS = {
  weapon: 'Weapon',
  active: 'Active',
  orbit: 'Orbit',
  summon: 'Summon',
  passive: 'Passive',
  utility: 'Utility',
  evolution: 'EVO'
};

export class UpgradeSystem {
  constructor(upgrades = UPGRADE_DEFINITIONS, rng = new RandomSystem()) {
    this.upgrades = upgrades.map((upgrade) => ({ ...upgrade }));
    this.rng = rng;
  }

  getChoices(count = 3, player) {
    const available = this.upgrades.filter((upgrade) => this.isAvailable(upgrade, player));
    const choices = [];
    const evolution = this.pickWeighted(
      available.filter((upgrade) => upgrade.evolution),
      player
    );
    if (evolution) {
      choices.push(evolution);
    }
    if (this.shouldGuaranteeSpectacle(player)) {
      const spectacle = this.pickWeighted(
        available.filter((upgrade) => (
          SPECTACLE_CATEGORIES.includes(upgrade.category) && !choices.includes(upgrade)
        )),
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

    return this.rng.shuffle(choices, 'upgrade-order')
      .slice(0, count)
      .map((upgrade) => this.presentUpgrade(upgrade, player));
  }

  getRewardChoices(count = 3, player, kind = 'elite') {
    const available = this.upgrades.filter((upgrade) => this.isAvailable(upgrade, player));
    const evolutionReady = available.filter((upgrade) => upgrade.evolution);
    const rankUps = available.filter((upgrade) => (
      !upgrade.consumable
      && player.getUpgradeRank(upgrade.id) > 0
    ));
    const choices = [];
    const priorityGroups = [
      evolutionReady,
      rankUps,
      available.filter((upgrade) => SPECTACLE_CATEGORIES.includes(upgrade.category))
    ];
    for (const group of priorityGroups) {
      if (choices.length >= Math.min(count, kind === 'boss' ? 2 : 1)) {
        break;
      }
      const picked = this.pickWeighted(group.filter((upgrade) => !choices.includes(upgrade)), player);
      if (picked) {
        choices.push(picked);
      }
    }
    while (choices.length < count && choices.length < available.length) {
      const candidates = available.filter((upgrade) => !choices.includes(upgrade));
      const picked = this.pickWeighted(candidates, player);
      if (!picked) {
        break;
      }
      choices.push(picked);
    }
    return this.rng.shuffle(choices, `reward-${kind}`)
      .map((upgrade) => ({
        ...this.presentUpgrade(upgrade, player),
        rewardKind: kind,
        rewardPriority: evolutionReady.includes(upgrade)
          ? 'evolution'
          : rankUps.includes(upgrade) ? 'rank-up' : 'new'
      }));
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
    if (upgrade.requiresMaxRank?.some((id) => {
      const required = this.upgrades.find((candidate) => candidate.id === id);
      return !required?.maxRank || player.getUpgradeRank(id) < required.maxRank;
    })) {
      return false;
    }
    if (upgrade.evolution && this.sceneEvolutionOwned(player, upgrade.id)) {
      return false;
    }
    if (upgrade.condition && !upgrade.condition(player)) {
      return false;
    }
    if (!player.scene?.loadout?.canAcquire(upgrade, player)) {
      return false;
    }
    return true;
  }

  sceneEvolutionOwned(player, id) {
    return player.scene?.loadout?.evolutions?.has(id) || player.getUpgradeRank(id) > 0;
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
    const nextRank = upgrade.consumable || upgrade.evolution
      ? null
      : (player?.getUpgradeRank(upgrade.id) ?? 0) + 1;
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
      rankLabel: upgrade.consumable || upgrade.evolution
        ? upgrade.evolution ? 'EVO' : 'Sofort'
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
    let roll = this.rng.next('upgrade-pick') * total;
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
