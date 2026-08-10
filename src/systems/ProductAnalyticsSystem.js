const CONSENT_KEY = 'rooster-rage-product-analytics-v1';
const SESSION_KEY = '__ROOSTER_PRODUCT_SESSION__';
const ALLOWED_EVENTS = new Set([
  'consent_granted',
  'consent_revoked',
  'hub_viewed',
  'rooster_selected',
  'run_started',
  'first_upgrade',
  'evo_obtained',
  'elite_chest_opened',
  'boss_reached',
  'run_finished',
  'second_run_started',
  'wishlist_clicked'
]);

function createSession() {
  const randomId = globalThis.crypto?.randomUUID?.()
    ?? `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return {
    id: randomId,
    sequence: 0,
    runStarts: 0,
    runId: null,
    firstUpgradeTracked: false
  };
}

function getSession() {
  globalThis[SESSION_KEY] ??= createSession();
  return globalThis[SESSION_KEY];
}

function sanitizeProperties(properties = {}) {
  return Object.fromEntries(Object.entries(properties)
    .filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value))
    .slice(0, 16)
    .map(([key, value]) => [
      String(key).slice(0, 40),
      typeof value === 'string' ? value.slice(0, 80) : value
    ]));
}

export class ProductAnalyticsSystem {
  constructor({
    endpoint = import.meta.env.VITE_TELEMETRY_ENDPOINT ?? '',
    storage = globalThis.localStorage,
    navigatorRef = globalThis.navigator
  } = {}) {
    this.storage = storage;
    this.navigator = navigatorRef;
    this.session = getSession();
    this.endpoint = this.resolveEndpoint(endpoint);
    this.events = [];
    this.consent = this.readConsent();
  }

  resolveEndpoint(endpoint) {
    if (!endpoint || !globalThis.location) return null;
    try {
      const url = new URL(endpoint, globalThis.location.href);
      if (url.origin !== globalThis.location.origin && url.protocol !== 'https:') return null;
      return url.toString();
    } catch {
      return null;
    }
  }

  readConsent() {
    try {
      return this.storage?.getItem(CONSENT_KEY) === 'granted';
    } catch {
      return false;
    }
  }

  setConsent(enabled) {
    const next = Boolean(enabled);
    if (!next && this.consent) this.track('consent_revoked');
    this.consent = next;
    try {
      this.storage?.setItem(CONSENT_KEY, next ? 'granted' : 'denied');
    } catch {
      // Privacy modes may deny storage; consent still applies to this page session.
    }
    if (next) this.track('consent_granted');
    return this.getState();
  }

  getContext() {
    const width = globalThis.innerWidth ?? 0;
    const height = globalThis.innerHeight ?? 0;
    return {
      device: width <= 760 ? 'mobile' : width <= 1100 ? 'tablet' : 'desktop',
      orientation: height > width ? 'portrait' : 'landscape',
      language: String(globalThis.navigator?.language ?? 'unknown').split('-')[0].slice(0, 8)
    };
  }

  track(event, properties = {}) {
    if (!this.consent || !ALLOWED_EVENTS.has(event)) return false;
    this.session.sequence += 1;
    const payload = {
      version: 1,
      event,
      occurredAt: new Date().toISOString(),
      sessionId: this.session.id,
      runId: this.session.runId,
      sequence: this.session.sequence,
      context: this.getContext(),
      properties: sanitizeProperties(properties)
    };
    this.events.push(payload);
    if (this.events.length > 100) this.events.shift();
    this.send(payload);
    return true;
  }

  send(payload) {
    if (!this.endpoint) return false;
    const body = JSON.stringify(payload);
    try {
      if (this.navigator?.sendBeacon?.(
        this.endpoint,
        new Blob([body], { type: 'application/json' })
      )) return true;
    } catch {
      // A keepalive request below is the bounded fallback.
    }
    globalThis.fetch?.(this.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
      credentials: 'omit'
    }).catch(() => {});
    return true;
  }

  viewHub() {
    this.track('hub_viewed');
  }

  startRun({ roosterId, challengeId, arenaId }) {
    this.session.runStarts += 1;
    this.session.runId = `${this.session.id}:${this.session.runStarts}`;
    this.session.firstUpgradeTracked = false;
    const properties = { roosterId, challengeId, arenaId };
    this.track('rooster_selected', properties);
    this.track('run_started', properties);
    if (this.session.runStarts === 2) this.track('second_run_started', properties);
  }

  trackUpgrade(upgrade, selection = {}) {
    if (!this.session.firstUpgradeTracked && selection.type === 'level') {
      this.session.firstUpgradeTracked = true;
      this.track('first_upgrade', { upgradeId: upgrade.id, wave: selection.wave });
    }
    if (upgrade.id?.startsWith('evo-')) {
      this.track('evo_obtained', { upgradeId: upgrade.id, wave: selection.wave });
    }
    if (selection.type === 'chest' && selection.kind === 'elite') {
      this.track('elite_chest_opened', { upgradeId: upgrade.id, wave: selection.wave });
    }
  }

  trackBossReached(wave) {
    this.track('boss_reached', { wave });
  }

  finishRun(report) {
    this.track('run_finished', {
      outcome: report.outcome,
      wave: report.waves?.at(-1)?.wave ?? 0,
      roosterId: report.rooster?.id ?? 'unknown',
      challengeId: report.challenge?.id ?? 'standard',
      arenaId: report.arena?.id ?? 'unknown',
      durationBucketSeconds: Math.max(0, Math.round((report.elapsedMs ?? 0) / 30000) * 30)
    });
  }

  getState() {
    return {
      enabled: this.consent,
      endpointConfigured: Boolean(this.endpoint),
      capturedEvents: this.events.map(({ event, properties }) => ({ event, properties }))
    };
  }
}
