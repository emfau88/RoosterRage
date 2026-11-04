import test from 'node:test';
import assert from 'node:assert/strict';
import { Y8AdBreakSystem } from '../src/systems/Y8AdBreakSystem.js';
import { Y8System, Y8_SDK_URL, Y8_APP_ID, Y8_GAME_ID, Y8_AD_INTERVAL_MS } from '../src/systems/Y8System.js';

function fixture({ preloaded = false, init = () => undefined } = {}) {
  const events = new EventTarget();
  const calls = [], scripts = [];
  let auth;
  const windowRef = {
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events)
  };
  const documentRef = { body: { dataset: {} }, createElement: () => ({}),
    head: { append: script => scripts.push(script) } };
  const ready = () => events.dispatchEvent(new Event('y8sdk.ready'));
  const load = () => {
    windowRef.y8 = { emitReadyEvent: ready, sdk: () => ({
      init: (...args) => { calls.push(args); return init(); }, onAuth: callback => { auth = callback; }
    }) };
  };
  if (preloaded) load();
  return { system: new Y8System({ windowRef, documentRef, timeoutMs: 30 }),
    scripts, calls, ready, load, auth: (...args) => auth(...args), documentRef };
}

test('late SDK readiness initializes once with the correct ad configuration', async () => {
  const f = fixture();
  const promise = f.system.init();
  assert.strictEqual(f.system.init(), promise);
  assert.equal(f.scripts.length, 1);
  assert.equal(f.scripts[0].src, Y8_SDK_URL);
  assert.equal(f.scripts[0].async, true);
  f.load(); f.ready(); f.ready();
  assert.equal(await promise, true);
  assert.equal(f.calls.length, 1);
  assert.deepEqual(f.calls[0][0], { appId: Y8_APP_ID, autoLogin: true });
  assert.equal(f.calls[0][1].gameId, Y8_GAME_ID);
  assert.equal(f.system.adsReady, false);
  f.calls[0][1].onReady();
  assert.equal(f.system.adsReady, true);
  assert.equal(f.documentRef.body.dataset.y8SdkState, 'ready');
  f.auth(null, new Error('offline'));
  assert.equal(f.system.authState, 'unavailable');
  assert.equal(f.system.state, 'ready');
  f.auth({ nickname: 'Test player' }, null);
  assert.equal(f.system.authState, 'signed-in');
  f.auth(null, null); assert.equal(f.system.authState, 'anonymous');
});

test('already loaded SDK replays readiness and needs no second script', async () => {
  const f = fixture({ preloaded: true });
  assert.equal(await f.system.init(), true);
  assert.equal(f.calls.length, 1); assert.equal(f.scripts.length, 0);
});

test('blocked script and absent ready event settle without throwing', async () => {
  const blocked = fixture(); const promise = blocked.system.init();
  blocked.scripts[0].onerror(); assert.equal(await promise, false);
  const timedOut = fixture(); assert.equal(await timedOut.system.init(), false);
  timedOut.load(); timedOut.ready(); assert.equal(timedOut.calls.length, 0);
  assert.equal(timedOut.system.state, 'unavailable');
});

test('throwing or rejected SDK initialization never escapes to game startup', async () => {
  for (const init of [() => { throw new Error('rejected'); }, () => Promise.reject(new Error('offline'))]) {
    const f = fixture({ preloaded: true, init });
    assert.equal(await f.system.init(), false);
    assert.equal(f.system.state, 'unavailable');
  }
});

function adsFixture() {
  let time = 1000;
  const requests = [];
  const system = new Y8System({ now: () => time, adRequestTimeoutMs: 20, adPlayingTimeoutMs: 40 });
  system.state = 'ready';
  system.adsReady = true;
  system.api = { showAd: options => { requests.push(options); return Promise.resolve(); } };
  const events = [];
  const request = () => system.requestAd({ type: 'next', name: 'wave-transition',
    beforeAd: () => events.push('pause'), afterAd: () => events.push('resume') });
  return { system, requests, events, request, advance: amount => { time += amount; } };
}

test('only actual ads pause; resolved SDK promises do not end ads; cooldown starts at ad end', async () => {
  const f = adsFixture();
  const pending = f.request();
  await Promise.resolve();
  assert.deepEqual(f.events, []);
  assert.equal(await f.request(), 'busy');
  f.requests[0].beforeAd();
  f.requests[0].beforeAd();
  assert.deepEqual(f.events, ['pause']);
  f.advance(30000);
  f.requests[0].afterAd();
  f.requests[0].adBreakDone({ breakStatus: 'viewed' });
  assert.equal(await pending, 'finished');
  assert.deepEqual(f.events, ['pause', 'resume']);
  f.advance(Y8_AD_INTERVAL_MS - 1);
  assert.equal(await f.request(), 'frequencyCapped');
  f.advance(1);
  const next = f.request();
  assert.equal(f.requests.length, 2);
  f.requests[1].adBreakDone({ breakStatus: 'noAdPreloaded' });
  assert.equal(await next, 'noAdPreloaded');
});

test('no fill, platform cap and errors do not pause or start the local cooldown', async () => {
  const f = adsFixture();
  for (const status of ['noAdPreloaded', 'frequencyCapped', 'notReady', 'error']) {
    const pending = f.request();
    f.requests.at(-1).adBreakDone({ breakStatus: status });
    assert.equal(await pending, status);
  }
  f.system.api.showAd = () => { throw new Error('offline'); };
  assert.equal(await f.request(), 'error');
  f.system.api.showAd = () => Promise.reject(new Error('offline'));
  assert.equal(await f.request(), 'error');
  assert.deepEqual(f.events, []);
  assert.equal(f.system.lastAdEndedAt, -Infinity);
});

test('unavailable ads bypass immediately; missing callbacks recover and late callbacks are ignored', async () => {
  const f = adsFixture();
  f.system.adsReady = false;
  assert.equal(await f.request(), 'notReady');
  f.system.adsReady = true;
  assert.equal(await f.request(), 'timeout');
  f.requests[0].beforeAd();
  assert.deepEqual(f.events, []);
  const pending = f.request();
  f.requests[1].beforeAd();
  assert.equal(await pending, 'timeout');
  assert.deepEqual(f.events, ['pause', 'resume']);
  f.requests[1].afterAd();
  assert.deepEqual(f.events, ['pause', 'resume']);
});

test('SDK rejection after an ad starts releases its pause', async () => {
  const f = adsFixture();
  f.system.api.showAd = options => { options.beforeAd(); return Promise.reject(new Error('failed')); };
  assert.equal(await f.request(), 'error');
  assert.deepEqual(f.events, ['pause', 'resume']);
});

test('scene adapter preserves other pauses, mute preferences and only resumes its own sounds', async () => {
  const f = adsFixture();
  const reasons = new Set(['upgrade']);
  const playingSound = { manager: true, isPlaying: true, isPaused: false,
    pause() { this.isPlaying = false; this.isPaused = true; },
    resume() { this.isPlaying = true; this.isPaused = false; } };
  const alreadyPausedSound = { manager: true, isPlaying: false, isPaused: true,
    resume() { throw new Error('Unrelated paused sound must stay paused'); } };
  const scene = {
    hud: { root: { inert: false }, overlay: { inert: true }, joystick: { inert: false } },
    input: { enabled: true },
    sound: { mute: true, sounds: [playingSound, alreadyPausedSound], setMute(value) { this.mute = value; } },
    gamePause: { request: reason => reasons.add(reason), release: reason => reasons.delete(reason) }
  };
  const adapter = new Y8AdBreakSystem(scene, f.system);
  const pending = adapter.run('start', 'run-start');
  assert.equal(scene.hud.root.inert, true);
  f.requests[0].beforeAd();
  assert.deepEqual([...reasons], ['upgrade', 'y8-ad']);
  assert.equal(scene.input.enabled, false);
  assert.equal(playingSound.isPaused, true);
  f.requests[0].afterAd();
  await pending;
  assert.deepEqual([...reasons], ['upgrade']);
  assert.equal(scene.sound.mute, true);
  assert.equal(scene.input.enabled, true);
  assert.equal(playingSound.isPlaying, true);
  assert.equal(scene.hud.root.inert, false);
  assert.equal(scene.hud.overlay.inert, true);
  f.advance(Y8_AD_INTERVAL_MS);
  const cancelled = adapter.run('next', 'wave-transition');
  f.requests[1].beforeAd();
  adapter.destroy();
  await cancelled;
  assert.deepEqual([...reasons], ['upgrade']);
  assert.equal(f.system.pendingAd, null);
});
