import Phaser from 'phaser';
import { getOrbitVisualProfile, OrbitEgg } from '../../entities/OrbitEgg.js';
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
    const count = evolved ? 6 : Phaser.Math.Clamp(rank, 1, 4);
    for (let index = 0; index < count; index += 1) {
      this.scene.orbitEggs.push(new OrbitEgg(this.scene, index, count, rank, evolved));
    }
    this.showOrbitUpgradeFx(rank, evolved);
  }

  showOrbitUpgradeFx(rank, evolved) {
    const profile = getOrbitVisualProfile(rank, evolved);
    profile.radii.forEach((radius, index) => {
      const ring = this.scene.add.circle(
        this.scene.player.sprite.x,
        this.scene.player.sprite.y,
        18,
        profile.color,
        0.06
      ).setStrokeStyle(evolved ? 4 : 1.5 + rank * 0.45, profile.color, evolved ? 0.9 : 0.72)
        .setDepth(8)
        .setAlpha(0);
      this.scene.tweens.addCounter({
        from: 18,
        to: radius,
        duration: evolved ? 440 : 300 + rank * 28,
        delay: index * 70,
        ease: 'Quad.Out',
        onUpdate: (tween) => {
          const currentRadius = tween.getValue();
          const progress = (currentRadius - 18) / Math.max(1, radius - 18);
          ring.setRadius(currentRadius).setAlpha(Math.min(0.82, progress * 2.4));
        },
        onComplete: () => this.scene.tweens.add({
          targets: ring,
          alpha: 0,
          duration: 130,
          onComplete: () => ring.destroy()
        })
      });
    });
  }

  setSupportChickenRank(rank) {
    this.supportRank = rank;
    this.scene.supportChickens.forEach((chicken) => chicken.destroy());
    this.scene.supportChickens = [];
    const evolved = Boolean(this.supportEvolutionId);
    const count = evolved ? 4 : rank >= 5 ? 3 : rank >= 4 ? 2 : 1;
    this.scene.audio.play('support-flap');
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
