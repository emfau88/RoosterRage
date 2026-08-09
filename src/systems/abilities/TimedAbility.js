export class TimedAbility {
  constructor(scene, unlockDelay) {
    this.scene = scene;
    this.unlockDelay = unlockDelay;
    this.rank = 0;
    this.evolved = false;
    this.evolutionId = null;
    this.nextAt = 0;
  }

  update(time) {
    if (this.rank > 0 && time >= this.nextAt) {
      this.activate(time);
    }
  }

  unlock(rank) {
    this.rank = rank;
    this.nextAt = Math.min(this.nextAt || Infinity, this.scene.time.now + this.unlockDelay);
  }

  evolve(id) {
    this.evolved = true;
    this.evolutionId = id;
    this.nextAt = Math.min(this.nextAt || Infinity, this.scene.time.now + 220);
  }
}
