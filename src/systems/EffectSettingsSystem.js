import { EFFECT_DEFAULTS } from '../data/presentationStandards.js';

const STORAGE_KEY = 'rooster-rage:effects:v1';

export class EffectSettingsSystem {
  constructor() {
    this.settings = { ...EFFECT_DEFAULTS, ...this.load() };
  }

  load() {
    try {
      return JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) ?? '{}');
    } catch {
      return {};
    }
  }

  set(key, value) {
    if (!(key in EFFECT_DEFAULTS)) return false;
    this.settings[key] = Boolean(value);
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Storage is an optional convenience; gameplay settings still apply in-memory.
    }
    return true;
  }

  toggle(key) {
    return this.set(key, !this.settings[key]);
  }

  enabled(key) {
    return this.settings[key] ?? true;
  }

  getState() {
    return { ...this.settings };
  }
}
