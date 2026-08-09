import Phaser from 'phaser';
import { OrbitEgg } from '../../entities/OrbitEgg.js';
import { SupportChicken } from '../../entities/SupportChicken.js';

export class CompanionAbilitySystem {
  constructor(scene) {
    this.scene = scene;
  }

  setOrbitEggRank(rank) {
    this.scene.orbitEggs.forEach((egg) => egg.destroy());
    this.scene.orbitEggs = [];
    const count = Phaser.Math.Clamp(rank, 1, 3);
    for (let index = 0; index < count; index += 1) {
      this.scene.orbitEggs.push(new OrbitEgg(this.scene, index, count, rank));
    }
  }

  setSupportChickenRank(rank) {
    this.scene.supportChickens.forEach((chicken) => chicken.destroy());
    this.scene.supportChickens = [];
    const count = Phaser.Math.Clamp(rank, 1, 2);
    for (let index = 0; index < count; index += 1) {
      this.scene.supportChickens.push(new SupportChicken(this.scene, index, count, rank));
    }
  }
}
