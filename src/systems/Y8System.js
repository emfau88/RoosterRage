export const Y8_SDK_URL = 'https://cdn.y8.com/minimal-sdk/2-0/y8.min.js';
export const Y8_APP_ID = '6ab6d722bed188670528ad4a';
export const Y8_GAME_ID = '284511';
export const Y8_AD_INTERVAL_MS = 180000;

// Only the Y8 entry point imports this module. SDK/auth availability never gates
// Phaser startup, local saves or gameplay.
export class Y8System {
  constructor({ windowRef = globalThis.window, documentRef = globalThis.document,
    timeoutMs = 8000, adRequestTimeoutMs = 8000, adPlayingTimeoutMs = 180000,
    now = () => globalThis.performance.now() } = {}) {
    this.window = windowRef;
    this.document = documentRef;
    this.timeoutMs = timeoutMs;
    this.state = 'idle';
    this.authState = 'anonymous';
    this.api = null;
    this.initialization = null;
    this.adsReady = false;
    this.adRequestTimeoutMs = adRequestTimeoutMs;
    this.adPlayingTimeoutMs = adPlayingTimeoutMs;
    this.now = now;
    this.lastAdEndedAt = -Infinity;
    this.pendingAd = null;
  }

  init() {
    if (this.initialization) return this.initialization;
    this.setState('loading');
    this.initialization = new Promise(resolve => {
      let settled = false;
      let connected = false;
      const finish = ok => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.window.removeEventListener('y8sdk.ready', connect);
        this.setState(ok ? 'ready' : 'unavailable');
        resolve(ok);
      };
      const connect = () => {
        if (connected || settled) return;
        connected = true;
        try {
          this.api = this.window.y8.sdk();
          const initialized = this.api.init({ appId: Y8_APP_ID, autoLogin: true }, {
            gameId: Y8_GAME_ID,
            onReady: () => { this.adsReady = true; }
          });
          this.api.onAuth((user, error) => {
            this.authState = error ? 'unavailable' : user ? 'signed-in' : 'anonymous';
          });
          Promise.resolve(initialized).then(() => finish(true), () => finish(false));
        } catch { finish(false); }
      };
      const timer = setTimeout(() => finish(false), this.timeoutMs);
      this.window.addEventListener('y8sdk.ready', connect);
      try {
        // Cover the SDK loading before our listener (the official ready replay).
        if (this.window.y8?.emitReadyEvent) this.window.y8.emitReadyEvent();
        else {
          const script = this.document.createElement('script');
          script.src = Y8_SDK_URL;
          script.async = true;
          script.onerror = () => finish(false);
          this.document.head.append(script);
        }
      } catch { finish(false); }
    });
    return this.initialization;
  }

  setState(state) {
    this.state = state;
    if (this.document?.body) this.document.body.dataset.y8SdkState = state;
  }

  // SDK callbacks, not its returned promise, delimit an actual advertisement.
  // No-fill, caps, blockers and missing callbacks must never strand a transition.
  requestAd({ type, name, beforeAd = () => {}, afterAd = () => {} }) {
    if (this.state !== 'ready' || !this.adsReady || !this.api?.showAd) {
      return Promise.resolve('notReady');
    }
    if (this.pendingAd) return Promise.resolve('busy');
    if (this.now() - this.lastAdEndedAt < Y8_AD_INTERVAL_MS) {
      return Promise.resolve('frequencyCapped');
    }
    let resolve;
    const result = new Promise(done => { resolve = done; });
    let started = false, settled = false;
    let timer;
    const finish = status => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      this.pendingAd = null;
      if (started) {
        this.lastAdEndedAt = this.now();
        afterAd();
      }
      resolve(status);
    };
    this.pendingAd = { cancel: () => finish('cancelled') };
    timer = setTimeout(() => finish('timeout'), this.adRequestTimeoutMs);
    try {
      Promise.resolve(this.api.showAd({
        type, name,
        beforeAd: () => {
          if (settled || started) return;
          started = true;
          clearTimeout(timer);
          timer = setTimeout(() => finish('timeout'), this.adPlayingTimeoutMs);
          beforeAd();
        },
        afterAd: () => finish('finished'),
        adBreakDone: info => finish(info?.breakStatus ?? 'other')
      })).catch(() => finish('error'));
    } catch { finish('error'); }
    return result;
  }
}

export const y8Portal = import.meta.env?.MODE === 'y8' ? new Y8System() : null;
