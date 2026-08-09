const SFX_CONFIG = {
  'egg-shot': { volume: 0.23, cooldown: 70, maxVoices: 3, rateJitter: 0.035 },
  'enemy-hit': { volume: 0.16, cooldown: 45, maxVoices: 4, rateJitter: 0.05 },
  'enemy-pop': { volume: 0.2, cooldown: 80, maxVoices: 3, rateJitter: 0.035 },
  'xp-pickup': { volume: 0.13, cooldown: 75, maxVoices: 2, rateJitter: 0.04 },
  'level-up': { volume: 0.28, cooldown: 350, maxVoices: 1, rateJitter: 0, priority: true },
  'player-hit': { volume: 0.24, cooldown: 260, maxVoices: 1, rateJitter: 0.025, priority: true },
  'molotov-impact': { volume: 0.22, cooldown: 180, maxVoices: 2, rateJitter: 0.025 },
  'rocket-explosion': { volume: 0.26, cooldown: 220, maxVoices: 2, rateJitter: 0.02 },
  lightning: { volume: 0.2, cooldown: 150, maxVoices: 2, rateJitter: 0.035 },
  laser: { volume: 0.17, cooldown: 130, maxVoices: 2, rateJitter: 0.02 },
  'void-open': { volume: 0.2, cooldown: 300, maxVoices: 1, rateJitter: 0.02 }
};

export class AudioSystem {
  constructor(scene) {
    this.scene = scene;
    this.enabled = true;
    this.masterVolume = 0.72;
    this.maxGlobalVoices = 7;
    this.lastPlayedAt = new Map();
    this.activeVoices = new Map();
    this.activeSounds = new Set();
  }

  play(key, options = {}) {
    if (!this.enabled || !this.scene.cache.audio.exists(key)) {
      return;
    }

    const config = SFX_CONFIG[key] ?? {};
    const now = this.scene.time.now;
    const cooldown = options.cooldown ?? config.cooldown ?? 80;
    const lastPlayedAt = this.lastPlayedAt.get(key) ?? -Infinity;
    if (now - lastPlayedAt < cooldown) {
      return;
    }

    const voices = this.activeVoices.get(key) ?? 0;
    const maxVoices = options.maxVoices ?? config.maxVoices ?? 2;
    if (voices >= maxVoices) {
      return;
    }
    const priority = options.priority ?? config.priority ?? false;
    const globalLimit = this.maxGlobalVoices + (priority ? 2 : 0);
    if (this.activeSounds.size >= globalLimit) {
      return;
    }

    const rateJitter = options.rateJitter ?? config.rateJitter ?? 0;
    const rate = (options.rate ?? 1) + (Math.random() * 2 - 1) * rateJitter;
    const volume = (options.volume ?? config.volume ?? 0.18) * this.masterVolume;
    const sound = this.scene.sound.add(key, { volume, rate });

    this.lastPlayedAt.set(key, now);
    this.activeVoices.set(key, voices + 1);
    this.activeSounds.add(sound);
    let released = false;
    const release = () => {
      if (released) {
        return;
      }
      released = true;
      this.activeVoices.set(key, Math.max(0, (this.activeVoices.get(key) ?? 1) - 1));
      this.activeSounds.delete(sound);
      if (sound.isPlaying) {
        sound.stop();
      }
      if (sound.manager) {
        sound.destroy();
      }
    };
    sound.once('complete', release);
    sound.once('stop', release);
    sound.play();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.scene.sound.stopAll();
      this.activeVoices.clear();
      this.activeSounds.clear();
    }
  }

  getState() {
    return {
      enabled: this.enabled,
      activeVoices: this.activeSounds.size,
      maxGlobalVoices: this.maxGlobalVoices
    };
  }
}
