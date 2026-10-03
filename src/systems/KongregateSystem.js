import { safeStorage } from './SafeStorage.js';

export const KONGREGATE_API_URL = 'https://cdn1.kongregate.com/javascripts/kongregate_api.js';
export const KONGREGATE_STATS = Object.freeze({ kills: 'Kills', wins: 'RunsWon' });
const STORAGE_PREFIX = 'rooster-rage:kongregate:kills:v1:';

function isKongregateHost(host) {
  return host === 'kongregate.com' || host?.endsWith('.kongregate.com')
    || host === 'konggames.com' || host?.endsWith('.konggames.com');
}

export function isKongregateContext(location, referrer = '') {
  if (isKongregateHost(location?.hostname)) return true;
  try {
    return isKongregateHost(new URL(referrer).hostname);
  } catch {
    return false;
  }
}

function nonNegativeInteger(value) {
  return Number.isFinite(value) && value >= 0 ? Math.min(Math.floor(value), 2147483647) : 0;
}

// Optional portal integration. One instance survives scene restarts; ordinary
// GitHub/local/other-portal visits never request the external SDK.
export class KongregateSystem {
  constructor({ enabled = false, windowRef = globalThis.window, documentRef = globalThis.document,
    storage = safeStorage, timeoutMs = 8000 } = {}) {
    this.enabled = enabled;
    this.window = windowRef;
    this.document = documentRef;
    this.storage = storage;
    this.timeoutMs = timeoutMs;
    this.state = 'disabled';
    this.api = null;
    this.initialization = null;
    this.runs = new Set();
    this.pending = [];
    this.bestKills = new Map();
  }

  init() {
    if (this.initialization) return this.initialization;
    if (!this.enabled || !isKongregateContext(this.window?.location, this.document?.referrer)) {
      return Promise.resolve(false);
    }
    this.state = 'loading';
    this.initialization = new Promise((resolve) => {
      let settled = false;
      let initialized = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.state = ok ? 'ready' : 'unavailable';
        resolve(ok);
      };
      const timer = setTimeout(() => finish(false), this.timeoutMs);
      const connect = () => {
        if (settled || initialized) return;
        initialized = true;
        try {
          const loader = this.window.kongregateAPI;
          if (!loader?.loadAPI || !loader?.getAPI) { finish(false); return; }
          loader.loadAPI(() => {
            if (settled) return;
            try {
              this.api = loader.getAPI();
              if (!this.api?.stats?.submit || !this.api?.services?.getUserId) { finish(false); return; }
              const owner = this.userId();
              for (const run of this.runs) if (run.owner === null) run.owner = owner;
              for (const result of this.pending) if (result.run.owner === null) result.run.owner = owner;
              this.api.services.addEventListener?.('login', () => this.restoreKills());
              finish(true);
              this.restoreKills();
              const pending = this.pending.splice(0);
              pending.forEach(({ run, report }) => this.submitRun(run, report));
            } catch { finish(false); }
          });
        } catch { finish(false); }
      };
      if (this.window.kongregateAPI) { connect(); return; }
      try {
        const script = this.document.createElement('script');
        script.src = KONGREGATE_API_URL;
        script.async = true;
        script.onload = connect;
        script.onerror = () => finish(false);
        this.document.head.append(script);
      } catch { finish(false); }
    });
    return this.initialization;
  }

  userId() {
    if (!this.api) return null;
    try {
      if (this.api.services.isGuest?.()) return 0;
      return nonNegativeInteger(Number(this.api.services.getUserId()));
    } catch { return 0; }
  }

  beginRun(profile = 'manual') {
    const run = { owner: this.userId(), finished: false, eligible: profile === 'manual' };
    if (this.state === 'loading' || this.state === 'ready') this.runs.add(run);
    return run;
  }

  finishRun(run, report, { assisted = false } = {}) {
    if (!run || run.finished) return false;
    run.finished = true;
    this.runs.delete(run);
    if (!this.enabled || !run.eligible || assisted || !['gameOver', 'victory'].includes(report.outcome)) return false;
    const result = { kills: nonNegativeInteger(report.kills), outcome: report.outcome };
    if (this.state === 'loading') {
      // A very short run may end before the optional SDK has connected.
      if (this.pending.length < 8) this.pending.push({ run, report: result });
      return false;
    }
    return this.submitRun(run, result);
  }

  submitRun(run, report) {
    const owner = this.userId();
    // Guest runs and runs spanning an account change must never be credited
    // to a different logged-in player.
    if (this.state !== 'ready' || !owner || run.owner !== owner) return false;
    const kills = Math.max(report.kills, this.loadKills(owner));
    this.saveKills(owner, kills);
    this.submit(KONGREGATE_STATS.kills, kills);
    // RunsWon is an ADD stat: only send a new win once. Never replay wins on
    // reload/login; the SDK has no acknowledgement for safely retrying ADD.
    if (report.outcome === 'victory') this.submit(KONGREGATE_STATS.wins, 1);
    return true;
  }

  submit(name, value) {
    try { this.api.stats.submit(name, value); } catch { /* Portal outages never stop gameplay. */ }
  }

  loadKills(owner) {
    if (this.bestKills.has(owner)) return this.bestKills.get(owner);
    let value = 0;
    try { value = nonNegativeInteger(Number(this.storage.getItem(`${STORAGE_PREFIX}${owner}`))); } catch { /* Optional save. */ }
    this.bestKills.set(owner, value);
    return value;
  }

  saveKills(owner, kills) {
    this.bestKills.set(owner, kills);
    try { this.storage.setItem(`${STORAGE_PREFIX}${owner}`, String(kills)); } catch { /* Optional save. */ }
  }

  restoreKills() {
    const owner = this.userId();
    if (this.state !== 'ready' || !owner) return;
    const kills = this.loadKills(owner);
    if (kills > 0) this.submit(KONGREGATE_STATS.kills, kills);
  }
}

export const kongregate = new KongregateSystem({ enabled: import.meta.env?.MODE === 'release' });
