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

  createRocketExplosion(x, y, damage, radius) {
    this.rocketEgg.createExplosion(x, y, damage, radius);
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
}
