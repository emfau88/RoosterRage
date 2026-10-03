import test from 'node:test';
import assert from 'node:assert/strict';
import { isKongregateContext, KongregateSystem, KONGREGATE_API_URL } from '../src/systems/KongregateSystem.js';
import { RunStateSystem } from '../src/systems/RunStateSystem.js';

function fixture({ owner = 42, enabled = true, delayed = false, storage } = {}) {
  const calls = [], scripts = [], listeners = new Map();
  const values = new Map();
  let user = owner, loadCalls = 0, loaded;
  const api = {
    services: { getUserId: () => user, isGuest: () => user === 0, addEventListener: (event, callback) => listeners.set(event, callback) },
    stats: { submit: (name, value) => calls.push([name, value]) }
  };
  const loader = { getAPI: () => api, loadAPI: callback => { loadCalls++; if (delayed) loaded = callback; else callback(); } };
  const windowRef = { location: new URL('https://game325151.konggames.com/game/') };
  const documentRef = { referrer: '', createElement: () => ({}), head: { append: script => scripts.push(script) } };
  const system = new KongregateSystem({ enabled, windowRef, documentRef, timeoutMs: 30,
    storage: storage ?? { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) } });
  return { system, calls, scripts, values, windowRef, loader, api,
    connect: () => { windowRef.kongregateAPI = loader; scripts[0].onload(); },
    completeLoad: () => loaded(), loadCalls: () => loadCalls,
    login: id => { user = id; listeners.get('login')?.(); } };
}

test('only a Kongregate host or embedding referrer enables the SDK', () => {
  assert(isKongregateContext(new URL('https://game325151.konggames.com/game/')));
  assert(isKongregateContext(new URL('https://emfau88.github.io/RoosterRage/kongregate/'), 'https://www.kongregate.com/en/games/emfau/roosterrage-survivor'));
  for (const host of ['kongregate.com.evil.example', 'fakekongregate.com', 'github.io', 'localhost']) {
    assert.equal(isKongregateContext({ hostname: host }, `https://${host}/`), false);
  }
});

test('release integration is optional and never loads off-platform', async () => {
  const f = fixture(); f.windowRef.location = new URL('https://emfau88.github.io/RoosterRage/kongregate/');
  assert.equal(await f.system.init(), false); assert.equal(f.scripts.length, 0);
  const dev = fixture({ enabled: false });
  assert.equal(await dev.system.init(), false); assert.equal(dev.scripts.length, 0);
});

test('SDK initializes once, and completed runs report maximum kills and each win once', async () => {
  const f = fixture();
  const first = f.system.init(); assert.strictEqual(f.system.init(), first);
  assert.equal(f.scripts[0].src, KONGREGATE_API_URL); f.connect(); assert(await first);
  assert.equal(f.loadCalls(), 1);
  const run = f.system.beginRun();
  assert(f.system.finishRun(run, { outcome: 'victory', kills: 127.9 }));
  assert.equal(f.system.finishRun(run, { outcome: 'victory', kills: 999 }), false);
  assert.deepEqual(f.calls, [['Kills', 127], ['RunsWon', 1]]);
  f.system.finishRun(f.system.beginRun(), { outcome: 'gameOver', kills: 24 });
  assert.deepEqual(f.calls.at(-1), ['Kills', 127]);
  f.login(42);
  assert.deepEqual(f.calls.at(-1), ['Kills', 127]);
  assert.equal(f.calls.filter(([name]) => name === 'RunsWon').length, 1, 'Reload/login must not replay additive wins');
});

test('very short runs wait for API readiness without duplicating submissions', async () => {
  const f = fixture({ delayed: true }); const ready = f.system.init(); f.connect();
  const run = f.system.beginRun();
  f.system.finishRun(run, { outcome: 'victory', kills: 88 });
  f.system.finishRun(run, { outcome: 'victory', kills: 88 });
  assert.equal(f.calls.length, 0); f.completeLoad(); assert(await ready);
  assert.deepEqual(f.calls, [['Kills', 88], ['RunsWon', 1]]);
});

test('guest, account-switch, bot and abandoned runs do not pollute scores', async () => {
  const f = fixture(); const ready = f.system.init(); f.connect(); await ready;
  f.system.finishRun(f.system.beginRun('average'), { outcome: 'victory', kills: 999 });
  f.system.finishRun(f.system.beginRun(), { outcome: 'victory', kills: 999 }, { assisted: true });
  f.system.finishRun(f.system.beginRun(), { outcome: 'abandoned', kills: 999 });
  const oldAccountRun = f.system.beginRun(); f.login(99);
  f.system.finishRun(oldAccountRun, { outcome: 'victory', kills: 999 });
  f.login(0); const guestRun = f.system.beginRun(); f.login(42);
  f.system.finishRun(guestRun, { outcome: 'victory', kills: 999 });
  assert.deepEqual(f.calls, []);
});

test('personal kill records restore per account; blocked storage and SDK exceptions stay harmless', async () => {
  const f = fixture(); let ready = f.system.init(); f.connect(); await ready;
  f.system.finishRun(f.system.beginRun(), { outcome: 'gameOver', kills: 90 });
  const saved = f.values;
  const next = fixture({ storage: { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value) } });
  ready = next.system.init(); next.connect(); await ready;
  assert.deepEqual(next.calls, [['Kills', 90]]);
  next.login(99); assert.equal(next.calls.length, 1);
  next.api.stats.submit = () => { throw new Error('Disconnected portal'); };
  assert.doesNotThrow(() => next.system.finishRun(next.system.beginRun(), { outcome: 'victory', kills: 12 }));
  const blocked = fixture({ storage: { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } } });
  ready = blocked.system.init(); blocked.connect(); await ready;
  blocked.system.finishRun(blocked.system.beginRun(), { outcome: 'victory', kills: 45 });
  assert.deepEqual(blocked.calls, [['Kills', 45], ['RunsWon', 1]]);
});

test('missing/blocked/timed-out SDK never blocks gameplay', async () => {
  const f = fixture(); const ready = f.system.init(); f.scripts[0].onerror();
  assert.equal(await ready, false); assert.equal(f.system.state, 'unavailable');
  assert.equal(f.system.finishRun(f.system.beginRun(), { outcome: 'victory', kills: 20 }), false);
  const timeout = fixture(); assert.equal(await timeout.system.init(), false);
  const bad = fixture(); bad.windowRef.kongregateAPI = { loadAPI() { throw Error('broken'); }, getAPI() {} };
  assert.equal(await bad.system.init(), false);
});

test('the real end-of-run hook submits once and abandonment never counts as a win', async () => {
  const f = fixture(); const ready = f.system.init(); f.connect(); await ready;
  const report = { outcome: 'victory', kills: 300 };
  const scene = { kongregate: f.system, bot: { enabled: false }, waveSystem: { totalWaves: 10 }, gamePause: { request() {} },
    audio: { stopAmbience() {}, stopMusic() {} }, time: { now: 1000, delayedCall() {} },
    telemetry: { finish: (_, outcome) => { report.outcome = outcome; }, events: [] },
    productAnalytics: { finishRun() {} }, meta: { recordRun() {}, getLastRunReward() {}, getState() {} },
    hud: { showEndScreen() {} }, scene: { restart() {} } };
  const state = new RunStateSystem(scene); state.getRunReport = () => report;
  state.kongregateRun = f.system.beginRun(); state.victory(); state.victory(); state.gameOver();
  assert.deepEqual(f.calls, [['Kills', 300], ['RunsWon', 1]]);
  const abandoned = new RunStateSystem(scene); abandoned.getRunReport = () => report;
  abandoned.kongregateRun = f.system.beginRun(); abandoned.abandonToHub();
  assert.equal(f.calls.length, 2);
});
