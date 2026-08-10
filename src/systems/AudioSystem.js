import { AUDIO_PRIORITIES } from '../data/presentationStandards.js';

const STORAGE_KEY = 'rooster-rage:audio:v1';
const AUDIO_CATEGORIES = Object.freeze(['sfx', 'ui', 'music', 'ambience']);
const LOOP_CATEGORIES = new Set(['music', 'ambience']);
const DEFAULT_AUDIO_SETTINGS = Object.freeze({
  enabled: true,
  master: 0.8,
  sfx: 0.9,
  ui: 0.85,
  music: 0.65,
  ambience: 0.35
});
const CATEGORY_VOICE_LIMITS = Object.freeze({ sfx: 7, ui: 3 });

const AUDIO_TIER_BY_KEY = Object.fromEntries(
  Object.entries(AUDIO_PRIORITIES).flatMap(([tier, keys]) => keys.map((key) => [key, tier]))
);

const SFX_CONFIG = {
  'egg-launch-ace': { volume: 0.16, cooldown: 70, maxVoices: 2, rateJitter: 0.025 },
  'egg-launch-artillery': { volume: 0.2, cooldown: 100, maxVoices: 2, rateJitter: 0.018 },
  'egg-launch-storm': { volume: 0.13, cooldown: 55, maxVoices: 2, rateJitter: 0.045 },
  'egg-impact-1': { volume: 0.16, cooldown: 55, maxVoices: 3, rateJitter: 0.04 },
  'egg-impact-2': { volume: 0.16, cooldown: 55, maxVoices: 3, rateJitter: 0.04 },
  'egg-impact-3': { volume: 0.16, cooldown: 55, maxVoices: 3, rateJitter: 0.04 },
  'egg-impact-4': { volume: 0.16, cooldown: 55, maxVoices: 3, rateJitter: 0.04 },
  'enemy-hit': { volume: 0.11, cooldown: 70, maxVoices: 2, rateJitter: 0.045 },
  'enemy-pop': { volume: 0.14, cooldown: 90, maxVoices: 2, rateJitter: 0.035 },
  'xp-pickup': { volume: 0.11, cooldown: 95, maxVoices: 1, rateJitter: 0.035 },
  'level-up': { volume: 0.42, cooldown: 500, maxVoices: 1, rateJitter: 0, priority: true },
  evolution: { volume: 0.5, cooldown: 700, maxVoices: 1, rateJitter: 0, priority: true },
  'upgrade-select': { volume: 0.28, cooldown: 100, maxVoices: 1, rateJitter: 0.015, priority: true },
  'player-hurt': { volume: 0.3, cooldown: 300, maxVoices: 1, rateJitter: 0.018, priority: true },
  'second-wind': { volume: 0.42, cooldown: 600, maxVoices: 1, rateJitter: 0, priority: true },
  'rooster-crow': { volume: 0.26, cooldown: 1800, maxVoices: 1, rateJitter: 0.015 },
  'support-flap': { volume: 0.15, cooldown: 450, maxVoices: 1, rateJitter: 0.035 },
  'chest-spawn': { volume: 0.17, cooldown: 400, maxVoices: 1, rateJitter: 0.02 },
  'chest-latch': { volume: 0.24, cooldown: 250, maxVoices: 1, rateJitter: 0.015 },
  'chest-open': { volume: 0.28, cooldown: 300, maxVoices: 1, rateJitter: 0.012 },
  'chest-reward': { volume: 0.34, cooldown: 350, maxVoices: 1, rateJitter: 0, priority: true },
  'pickup-heal': { volume: 0.3, cooldown: 250, maxVoices: 1, rateJitter: 0.02 },
  'pickup-magnet': { volume: 0.24, cooldown: 300, maxVoices: 1, rateJitter: 0.025 },
  'pickup-bomb': { volume: 0.38, cooldown: 500, maxVoices: 1, rateJitter: 0.012, priority: true },
  victory: { volume: 0.5, cooldown: 1500, maxVoices: 1, rateJitter: 0, priority: true },
  'ui-navigate': { category: 'ui', volume: 0.22, cooldown: 45, maxVoices: 1, rateJitter: 0.018 },
  'ui-confirm': { category: 'ui', volume: 0.3, cooldown: 80, maxVoices: 1, rateJitter: 0.012 },
  'ui-back': { category: 'ui', volume: 0.25, cooldown: 80, maxVoices: 1, rateJitter: 0.015 },
  'ui-denied': { category: 'ui', volume: 0.3, cooldown: 180, maxVoices: 1, rateJitter: 0 },
  'ui-toggle': { category: 'ui', volume: 0.22, cooldown: 70, maxVoices: 1, rateJitter: 0.015 },
  'ui-reroll': { category: 'ui', volume: 0.32, cooldown: 220, maxVoices: 1, rateJitter: 0.018 },
  'spitter-shot': { volume: 0.18, cooldown: 170, maxVoices: 2, rateJitter: 0.04 },
  'brute-stomp': { volume: 0.28, cooldown: 420, maxVoices: 2, rateJitter: 0.025 },
  'bomber-explosion': { volume: 0.25, cooldown: 260, maxVoices: 2, rateJitter: 0.035 },
  'summoner-charge': { volume: 0.2, cooldown: 450, maxVoices: 1, rateJitter: 0.02 },
  'summoner-spawn': { volume: 0.24, cooldown: 450, maxVoices: 1, rateJitter: 0.025 },
  'elite-entry': { volume: 0.28, cooldown: 900, maxVoices: 1, rateJitter: 0, priority: true },
  'boss-roar': { volume: 0.42, cooldown: 1600, maxVoices: 1, rateJitter: 0.01, priority: true },
  'boss-phase': { volume: 0.4, cooldown: 1000, maxVoices: 1, rateJitter: 0, priority: true },
  'boss-fireball': { volume: 0.3, cooldown: 500, maxVoices: 1, rateJitter: 0.02, priority: true },
  'molotov-impact': { volume: 0.22, cooldown: 180, maxVoices: 2, rateJitter: 0.025 },
  'rocket-launch': { volume: 0.2, cooldown: 180, maxVoices: 1, rateJitter: 0.025 },
  'rocket-explosion': { volume: 0.28, cooldown: 240, maxVoices: 2, rateJitter: 0.02 },
  lightning: { volume: 0.22, cooldown: 170, maxVoices: 2, rateJitter: 0.03 },
  'lightning-chain': { volume: 0.1, cooldown: 90, maxVoices: 1, rateJitter: 0.04 },
  laser: { volume: 0.18, cooldown: 150, maxVoices: 2, rateJitter: 0.02 },
  'void-open': { volume: 0.22, cooldown: 320, maxVoices: 1, rateJitter: 0.02 },
  'crate-break': { volume: 0.22, cooldown: 140, maxVoices: 2, rateJitter: 0.04 },
  'bale-break': { volume: 0.16, cooldown: 140, maxVoices: 2, rateJitter: 0.05 }
};

const VARIANT_SETS = Object.freeze({
  'egg-impact': ['egg-impact-1', 'egg-impact-2', 'egg-impact-3', 'egg-impact-4']
});

function clampVolume(value, fallback = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(1, number));
}

export class AudioSystem {
  constructor(scene) {
    this.scene = scene;
    this.settings = { ...DEFAULT_AUDIO_SETTINGS, ...this.loadSettings() };
    this.enabled = this.settings.enabled;
    this.masterVolume = this.settings.master;
    this.maxGlobalVoices = CATEGORY_VOICE_LIMITS.sfx;
    this.lastPlayedAt = new Map();
    this.activeVoices = new Map();
    this.activeCategoryVoices = new Map();
    this.activeSounds = new Set();
    this.activeSoundMeta = new Map();
    this.loops = new Map();
    this.unlocked = !this.scene.sound.locked;
    this.installUnlockTracking();
  }

  loadSettings() {
    try {
      const stored = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) ?? '{}');
      return {
        enabled: typeof stored.enabled === 'boolean' ? stored.enabled : DEFAULT_AUDIO_SETTINGS.enabled,
        ...Object.fromEntries(['master', ...AUDIO_CATEGORIES].map((key) => [
          key,
          clampVolume(stored[key], DEFAULT_AUDIO_SETTINGS[key])
        ]))
      };
    } catch {
      return {};
    }
  }

  saveSettings() {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(this.getSettings()));
    } catch {
      // Storage is optional; settings still apply for the current session.
    }
  }

  installUnlockTracking() {
    this.onUnlocked = () => {
      this.unlocked = true;
    };
    this.scene.sound.on('unlocked', this.onUnlocked);
    this.unlockHandler = () => {
      const context = this.scene.sound.context;
      if (context && ['suspended', 'interrupted'].includes(context.state)) {
        Promise.resolve(context.resume()).catch(() => {});
      }
    };
    globalThis.document?.addEventListener('pointerdown', this.unlockHandler, { passive: true });
    globalThis.document?.addEventListener('touchend', this.unlockHandler, { passive: true });
    globalThis.document?.addEventListener('keydown', this.unlockHandler);
  }

  play(key, options = {}) {
    const config = SFX_CONFIG[key] ?? {};
    const category = AUDIO_CATEGORIES.includes(options.category ?? config.category)
      ? options.category ?? config.category
      : 'sfx';
    if (
      !this.enabled
      || this.settings[category] <= 0
      || !this.scene.cache.audio.exists(key)
    ) {
      return null;
    }

    const now = this.scene.time.now;
    const cooldown = options.cooldown ?? config.cooldown ?? 80;
    const cooldownKey = options.cooldownKey ?? key;
    const voiceKey = options.voiceKey ?? key;
    const lastPlayedAt = this.lastPlayedAt.get(cooldownKey) ?? -Infinity;
    if (now - lastPlayedAt < cooldown) {
      return null;
    }

    const voices = this.activeVoices.get(voiceKey) ?? 0;
    const maxVoices = options.maxVoices ?? config.maxVoices ?? 2;
    if (voices >= maxVoices) {
      return null;
    }
    const tier = options.tier ?? AUDIO_TIER_BY_KEY[key] ?? 'impact';
    const priority = options.priority ?? config.priority ?? ['critical', 'reward'].includes(tier);
    const categoryVoices = this.activeCategoryVoices.get(category) ?? 0;
    const baseLimit = CATEGORY_VOICE_LIMITS[category] ?? 2;
    const categoryLimit = baseLimit + (category === 'sfx' && priority ? 2 : category === 'sfx' && tier === 'ability' ? 1 : 0);
    if (categoryVoices >= categoryLimit) {
      return null;
    }

    const rateJitter = options.rateJitter ?? config.rateJitter ?? 0;
    const rate = (options.rate ?? 1) + (this.scene.rng.float(-1, 1, 'audio') * rateJitter);
    const baseVolume = options.volume ?? config.volume ?? 0.18;
    const sound = this.scene.sound.add(key, {
      volume: this.resolveVolume(category, baseVolume),
      rate
    });

    this.lastPlayedAt.set(cooldownKey, now);
    this.activeVoices.set(voiceKey, voices + 1);
    this.activeCategoryVoices.set(category, categoryVoices + 1);
    this.activeSounds.add(sound);
    this.activeSoundMeta.set(sound, { category, baseVolume });
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      this.activeVoices.set(voiceKey, Math.max(0, (this.activeVoices.get(voiceKey) ?? 1) - 1));
      this.activeCategoryVoices.set(category, Math.max(0, (this.activeCategoryVoices.get(category) ?? 1) - 1));
      this.activeSounds.delete(sound);
      this.activeSoundMeta.delete(sound);
      if (sound.isPlaying) sound.stop();
      if (sound.manager) sound.destroy();
    };
    sound.once('complete', release);
    sound.once('stop', release);
    if (!sound.play()) {
      release();
      return null;
    }
    return sound;
  }

  playVariant(setKey, options = {}) {
    const variants = VARIANT_SETS[setKey];
    if (!variants?.length) return null;
    const index = this.scene.rng.int(0, variants.length - 1, `audio:${setKey}`);
    return this.play(variants[index], {
      ...options,
      cooldownKey: options.cooldownKey ?? setKey,
      voiceKey: options.voiceKey ?? setKey
    });
  }

  playMusic(key, options = {}) {
    return this.playLoop('music', key, options);
  }

  playAmbience(key, options = {}) {
    return this.playLoop('ambience', key, options);
  }

  playLoop(category, key, options = {}) {
    if (
      !LOOP_CATEGORIES.has(category)
      || !this.enabled
      || this.settings[category] <= 0
      || !this.scene.cache.audio.exists(key)
    ) {
      return null;
    }
    const current = this.loops.get(category);
    if (current?.key === key && current.sound.isPlaying) return current.sound;

    const baseVolume = options.volume ?? 1;
    const fadeMs = Math.max(0, options.fadeMs ?? 500);
    const targetVolume = this.resolveVolume(category, baseVolume);
    const sound = this.scene.sound.add(key, {
      loop: options.loop ?? true,
      volume: fadeMs > 0 ? 0 : targetVolume
    });
    this.loops.set(category, { key, sound, baseVolume });
    if (!sound.play()) {
      this.loops.delete(category);
      sound.destroy();
      return null;
    }
    if (fadeMs > 0) {
      this.scene.tweens.add({ targets: sound, volume: targetVolume, duration: fadeMs });
    }
    if (current) this.releaseLoop(current, fadeMs);
    return sound;
  }

  stopMusic(fadeMs = 350) {
    this.stopLoop('music', fadeMs);
  }

  stopAmbience(fadeMs = 350) {
    this.stopLoop('ambience', fadeMs);
  }

  stopLoop(category, fadeMs = 0) {
    const current = this.loops.get(category);
    if (!current) return;
    this.loops.delete(category);
    this.releaseLoop(current, Math.max(0, fadeMs));
  }

  releaseLoop(loop, fadeMs) {
    this.scene.tweens.killTweensOf(loop.sound);
    const release = () => {
      this.scene.tweens.killTweensOf(loop.sound);
      if (loop.sound.isPlaying) loop.sound.stop();
      if (loop.sound.manager) loop.sound.destroy();
    };
    if (fadeMs > 0 && loop.sound.isPlaying) {
      this.scene.tweens.add({ targets: loop.sound, volume: 0, duration: fadeMs, onComplete: release });
    } else {
      release();
    }
  }

  resolveVolume(category, baseVolume) {
    return clampVolume(baseVolume) * this.settings.master * this.settings[category];
  }

  setVolume(key, value) {
    if (key !== 'master' && !AUDIO_CATEGORIES.includes(key)) return false;
    this.settings[key] = clampVolume(value, this.settings[key]);
    this.masterVolume = this.settings.master;
    this.refreshActiveVolumes();
    this.saveSettings();
    return true;
  }

  refreshActiveVolumes() {
    this.activeSoundMeta.forEach(({ category, baseVolume }, sound) => {
      if (sound.manager) sound.setVolume(this.resolveVolume(category, baseVolume));
    });
    this.loops.forEach(({ sound, baseVolume }, category) => {
      if (sound.manager) sound.setVolume(this.resolveVolume(category, baseVolume));
    });
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    this.settings.enabled = this.enabled;
    if (!this.enabled) this.stopAll();
    this.saveSettings();
  }

  stopAll() {
    [...this.activeSounds].forEach((sound) => sound.stop());
    [...this.loops.keys()].forEach((category) => this.stopLoop(category));
    this.activeVoices.clear();
    this.activeCategoryVoices.clear();
    this.activeSounds.clear();
    this.activeSoundMeta.clear();
  }

  getSettings() {
    return {
      enabled: this.enabled,
      master: this.settings.master,
      ...Object.fromEntries(AUDIO_CATEGORIES.map((category) => [category, this.settings[category]]))
    };
  }

  getState() {
    return {
      enabled: this.enabled,
      unlocked: this.unlocked || !this.scene.sound.locked,
      activeVoices: this.activeSounds.size,
      activeVoicesByCategory: Object.fromEntries(this.activeCategoryVoices),
      maxGlobalVoices: this.maxGlobalVoices,
      loops: Object.fromEntries([...this.loops].map(([category, loop]) => [category, loop.key])),
      volumes: this.getSettings(),
      priorities: Object.fromEntries(
        Object.entries(AUDIO_PRIORITIES).map(([tier, keys]) => [tier, [...keys]])
      )
    };
  }

  destroy() {
    this.stopAll();
    this.scene.sound.off('unlocked', this.onUnlocked);
    globalThis.document?.removeEventListener('pointerdown', this.unlockHandler);
    globalThis.document?.removeEventListener('touchend', this.unlockHandler);
    globalThis.document?.removeEventListener('keydown', this.unlockHandler);
  }
}
