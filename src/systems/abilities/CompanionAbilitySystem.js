import Phaser from 'phaser';
import { OrbitEgg } from '../../entities/OrbitEgg.js';
import { SupportChicken } from '../../entities/SupportChicken.js';

export class CompanionAbilitySystem {
  constructor(scene) {
    this.scene = scene;
    this.orbitRank = 0;
    this.supportRank = 0;
    this.orbitEvolutionId = null;
    this.supportEvolutionId = null;
  }

  setOrbitEggRank(rank) {
    this.orbitRank = rank;
    this.scene.orbitEggs.forEach((egg) => egg.destroy());
    this.scene.orbitEggs = [];
    const evolved = Boolean(this.orbitEvolutionId);
    const count = evolved ? 4 : Phaser.Math.Clamp(rank, 1, 3);
    for (let index = 0; index < count; index += 1) {
      this.scene.orbitEggs.push(new OrbitEgg(this.scene, index, count, rank, evolved));
    }
  }

  setSupportChickenRank(rank) {
    this.supportRank = rank;
    this.scene.supportChickens.forEach((chicken) => chicken.destroy());
    this.scene.supportChickens = [];
    const evolved = Boolean(this.supportEvolutionId);
    const count = evolved ? 4 : rank >= 5 ? 3 : rank >= 4 ? 2 : 1;
    for (let index = 0; index < count; index += 1) {
      this.scene.supportChickens.push(new SupportChicken(this.scene, index, count, rank, evolved));
    }
  }

  evolve(baseId, evolutionId) {
    if (baseId === 'orbit-eggs') {
      this.orbitEvolutionId = evolutionId;
      this.setOrbitEggRank(this.orbitRank);
      return true;
    }
    if (baseId === 'support-chick') {
      this.supportEvolutionId = evolutionId;
      this.setSupportChickenRank(this.supportRank);
      return true;
    }
    return false;
  }
}
