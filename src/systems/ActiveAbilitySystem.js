import { CompanionAbilitySystem } from './abilities/CompanionAbilitySystem.js';
import { GoldenEggAbility } from './abilities/GoldenEggAbility.js';
import { LaserCombAbility } from './abilities/LaserCombAbility.js';
import { LightningCombAbility } from './abilities/LightningCombAbility.js';
import { MolotovEggAbility } from './abilities/MolotovEggAbility.js';
import { RocketEggAbility } from './abilities/RocketEggAbility.js';
import { VoidNestAbility } from './abilities/VoidNestAbility.js';

export class ActiveAbilitySystem {
  constructor(scene) {
    this.goldenEgg = new GoldenEggAbility(scene);
    this.molotovEgg = new MolotovEggAbility(scene);
    this.lightningComb = new LightningCombAbility(scene);
    this.voidNest = new VoidNestAbility(scene);
    this.rocketEgg = new RocketEggAbility(scene);
    this.laserComb = new LaserCombAbility(scene);
    this.companions = new CompanionAbilitySystem(scene);
    this.timedAbilities = [
      this.goldenEgg,
      this.molotovEgg,
      this.lightningComb,
      this.voidNest,
      this.rocketEgg,
      this.laserComb
    ];
  }

  update(time) {
    this.timedAbilities.forEach((ability) => ability.update(time));
  }

  createRocketExplosion(x, y, damage, radius, evolved = false) {
    this.rocketEgg.createExplosion(x, y, damage, radius, evolved);
  }

  createMolotovImpact(x, y) {
    this.molotovEgg.createImpact(x, y);
  }

  setOrbitEggRank(rank) {
    this.companions.setOrbitEggRank(rank);
  }

  setSupportChickenRank(rank) {
    this.companions.setSupportChickenRank(rank);
  }

  unlockGoldenEgg(rank) {
    this.goldenEgg.unlock(rank);
  }

  unlockMolotovEgg(rank) {
    this.molotovEgg.unlock(rank);
  }

  unlockLightningComb(rank) {
    this.lightningComb.unlock(rank);
  }

  unlockVoidNest(rank) {
    this.voidNest.unlock(rank);
  }

  unlockRocketEgg(rank) {
    this.rocketEgg.unlock(rank);
  }

  unlockLaserComb(rank) {
    this.laserComb.unlock(rank);
  }

  evolve(baseId, evolutionId) {
    const timed = {
      'golden-egg': this.goldenEgg,
      'molotov-egg': this.molotovEgg,
      'lightning-comb': this.lightningComb,
      'void-nest': this.voidNest,
      'rocket-egg': this.rocketEgg,
      'laser-comb': this.laserComb
    }[baseId];
    if (timed) {
      timed.evolve(evolutionId);
      return true;
    }
    return this.companions.evolve(baseId, evolutionId);
  }

  getCooldownStates(time = this.goldenEgg.scene.time.now) {
    return {
      'golden-egg': this.goldenEgg.getCooldownState(time),
      'molotov-egg': this.molotovEgg.getCooldownState(time),
      'lightning-comb': this.lightningComb.getCooldownState(time),
      'void-nest': this.voidNest.getCooldownState(time),
      'rocket-egg': this.rocketEgg.getCooldownState(time),
      'laser-comb': this.laserComb.getCooldownState(time),
      'orbit-eggs': { ratio: 0, remainingMs: 0, durationMs: 0 },
      'support-chick': { ratio: 0, remainingMs: 0, durationMs: 0 }
    };
  }
}
