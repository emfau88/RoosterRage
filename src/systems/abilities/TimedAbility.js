export class TimedAbility {
  constructor(scene, unlockDelay) {
    this.scene = scene;
    this.unlockDelay = unlockDelay;
    this.rank = 0;
    this.evolved = false;
    this.evolutionId = null;
    this.nextAt = 0;
    this.lastActivatedAt = null;
  }

  update(time) {
    if (this.rank > 0 && time >= this.nextAt) {
      this.lastActivatedAt = time;
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

  getCooldownState(time = this.scene.time.now) {
    if (this.rank <= 0) return { ratio: 0, remainingMs: 0, durationMs: 0 };
    const durationMs = Math.max(
      1,
      this.lastActivatedAt === null ? this.unlockDelay : this.nextAt - this.lastActivatedAt
    );
    const remainingMs = Math.max(0, this.nextAt - time);
    return {
      ratio: Math.min(1, remainingMs / durationMs),
      remainingMs,
      durationMs
    };
  }
}
