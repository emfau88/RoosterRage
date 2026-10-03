const DEFAULT_OPTIONS = Object.freeze({
  freezeTime: true,
  freezeTweens: true,
  pausePhysics: true,
  clearInput: true
});

/**
 * Coordinates every state that temporarily stops an active run. A reason can
 * only release the pause it created, so closing one overlay cannot restart
 * combat while another overlay is still active.
 */
export class GamePauseSystem {
  constructor(scene) {
    this.scene = scene;
    this.reasons = new Map();
    this.simulationTime = scene.time.now;
    this.lastClockTime = scene.time.now;
    this.installSimulationClock();
  }

  installSimulationClock() {
    Object.defineProperty(this.scene.time, 'now', {
      configurable: true,
      get: () => this.simulationTime,
      set: (clockTime) => {
        const elapsed = Math.max(0, clockTime - this.lastClockTime);
        this.lastClockTime = clockTime;
        if (!this.should('freezeTime')) {
          this.simulationTime += elapsed;
        }
      }
    });
  }

  request(reason, options = {}) {
    if (!reason || this.reasons.has(reason)) {
      return false;
    }
    this.reasons.set(reason, { ...DEFAULT_OPTIONS, ...options });
    this.sync();
    return true;
  }

  release(reason) {
    if (!this.reasons.delete(reason)) {
      return false;
    }
    this.sync();
    return true;
  }

  has(reason) {
    return this.reasons.has(reason);
  }

  get isPaused() {
    return this.reasons.size > 0;
  }

  getState() {
    return {
      paused: this.isPaused,
      reasons: [...this.reasons.keys()],
      freezesTime: this.should('freezeTime'),
      freezesTweens: this.should('freezeTweens'),
      pausesPhysics: this.should('pausePhysics')
    };
  }

  should(option) {
    return [...this.reasons.values()].some((settings) => settings[option]);
  }

  sync() {
    const shouldPausePhysics = this.should('pausePhysics');
    const shouldFreezeTime = this.should('freezeTime');
    const shouldFreezeTweens = this.should('freezeTweens');

    if (shouldPausePhysics) {
      this.scene.physics.pause();
    } else {
      this.scene.physics.resume();
    }

    this.scene.time.paused = shouldFreezeTime;
    // New elite attack poses must hold with their telegraph, rather than
    // advancing to the impact frame while the simulation clock is frozen.
    for (const enemy of this.scene.enemies ?? []) {
      for (const flame of enemy.burnFlames ?? []) {
        if (shouldFreezeTime) flame.anims.pause();
        else flame.anims.resume();
      }
      if (!enemy.directionalStateAnimations || !enemy.sprite.active) continue;
      if (shouldFreezeTime && !enemy.sprite.anims.isPaused) {
        enemy.sprite.anims.pause();
        enemy.animationPausedByGame = true;
      } else if (!shouldFreezeTime && enemy.animationPausedByGame) {
        enemy.sprite.anims.resume();
        enemy.animationPausedByGame = false;
      }
    }
    if (shouldFreezeTweens) {
      this.scene.tweens.pauseAll();
    } else {
      this.scene.tweens.resumeAll();
    }

    if (this.isPaused && this.should('clearInput')) {
      this.scene.playerInput?.clearInput();
    }
  }

  destroy() {
    this.reasons.clear();
    Object.defineProperty(this.scene.time, 'now', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: this.simulationTime
    });
  }
}
