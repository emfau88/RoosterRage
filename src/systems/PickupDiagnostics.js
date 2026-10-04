const MAX_SAMPLES = 360;
const MAX_EVENTS = 500;
const session = { nextRun: 0, nextPickup: 0, samples: [], events: [] };

const rounded = (value) => Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
const point = (object) => object ? { x: rounded(object.x), y: rounded(object.y) } : null;

function appendBounded(target, entry, limit) {
  target.push(entry);
  if (target.length > limit) target.splice(0, target.length - limit);
}

export class PickupDiagnostics {
  constructor(scene) {
    this.scene = scene;
    this.run = ++session.nextRun;
    this.ids = new WeakMap();
    this.lastSampleAt = -Infinity;
    this.lastDeferredAt = new Map();
    this.lastContactAt = new Map();
    this.onError = (event) => this.record('browser-error', {
      message: String(event.message ?? event.error ?? 'Unknown browser error').slice(0, 500)
    });
    window.addEventListener('error', this.onError);
    this.record('scene-created');
  }

  id(pickup) {
    if (!pickup) return null;
    if (!this.ids.has(pickup)) this.ids.set(pickup, ++session.nextPickup);
    return this.ids.get(pickup);
  }

  record(type, details = {}) {
    try {
      appendBounded(session.events, {
        type, run: this.run, time: rounded(this.scene.time?.now),
        wave: this.scene.waveSystem?.currentWave ?? 0,
        arena: this.scene.arena?.id ?? null,
        seed: this.scene.rng?.seed ?? null,
        zoom: rounded(this.scene.logicalCameraZoom),
        ...details
      }, MAX_EVENTS);
    } catch {
      // A diagnostic must never affect gameplay.
    }
  }

  pickupState(pickup) {
    if (!pickup) return null;
    const { scene } = this;
    const body = pickup.sprite?.body;
    const playerBody = scene.player?.sprite?.body;
    const foot = scene.player?.groundMarker;
    const ground = pickup.getGroundPosition?.();
    const reach = (pickup.contactRadius ?? 0) + (playerBody?.halfWidth ?? 0);
    return {
      id: this.id(pickup), kind: pickup.kind, fromProp: Boolean(pickup.fromProp),
      originId: pickup.originId ?? null, active: Boolean(pickup.sprite?.active),
      artActive: Boolean(pickup.visual?.active), bodyEnabled: Boolean(body?.enable),
      inPhysicsGroup: Boolean(scene.pickups?.group?.contains(pickup.sprite)),
      icon: point(pickup.sprite), ground: point(ground), field: point(pickup.field),
      physicsCenter: point(body?.center), radius: rounded(pickup.contactRadius),
      footDistance: foot && ground ? rounded(Math.hypot(foot.x - ground.x, foot.y - ground.y)) : null,
      bodyDistance: playerBody && body ? rounded(Math.hypot(
        playerBody.center.x - body.center.x, playerBody.center.y - body.center.y)) : null,
      allowedDistance: rounded(reach),
      overlappingObstacles: scene.arena?.obstacles?.filter(obstacle => obstacle.sprite.active
        && ground
        && Math.abs(obstacle.x - ground.x) <= obstacle.width / 2 + pickup.contactRadius
        && Math.abs(obstacle.y - ground.y) <= obstacle.height / 2 + pickup.contactRadius)
        .map(obstacle => ({ id: obstacle.id, kind: obstacle.kind,
          bodyEnabled: Boolean(obstacle.sprite.body?.enable), hp: rounded(obstacle.hp),
          x: rounded(obstacle.x), y: rounded(obstacle.y), width: obstacle.width, height: obstacle.height })) ?? []
    };
  }

  recordPickup(type, pickup, details = {}) {
    try {
      const id = this.id(pickup);
      if (type === 'contact') {
        const last = this.lastContactAt.get(id) ?? -Infinity;
        if (this.scene.time.now - last < 1000) return;
        this.lastContactAt.set(id, this.scene.time.now);
      }
      if (type === 'deferred-full-health') {
        const last = this.lastDeferredAt.get(id) ?? -Infinity;
        if (this.scene.time.now - last < 1000) return;
        this.lastDeferredAt.set(id, this.scene.time.now);
      }
      this.record(type, { pickup: this.pickupState(pickup), hp: rounded(this.scene.player?.hp),
        maxHp: rounded(this.scene.player?.maxHp), magnetUntil: rounded(this.scene.pickups?.magnetUntil),
        xpCollected: this.scene.debugStats?.xpCollected ?? 0, ...details });
    } catch {
      // Diagnostics are read-only, including when the world is shutting down.
    }
  }

  snapshot() {
    const { scene } = this;
    const body = scene.player?.sprite?.body;
    const camera = scene.cameras?.main;
    const canvas = scene.game?.canvas;
    return {
      run: this.run, time: rounded(scene.time?.now), wave: scene.waveSystem?.currentWave ?? 0,
      arena: scene.arena?.id ?? null, seed: scene.rng?.seed ?? null,
      rooster: scene.player?.roosterId ?? null,
      canvas: canvas ? { width: canvas.width, height: canvas.height } : null,
      viewport: { width: window.innerWidth, height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio },
      zoom: rounded(camera?.zoom), logicalZoom: rounded(scene.logicalCameraZoom),
      renderScale: rounded(scene.game?.roosterDisplay?.renderScale),
      camera: camera ? { ...point(camera.worldView),
        width: rounded(camera.worldView.width), height: rounded(camera.worldView.height) } : null,
      player: { sprite: point(scene.player?.sprite), foot: point(scene.player?.groundMarker),
        bodyCenter: point(body?.center), bodyRadius: rounded(body?.halfWidth),
        speed: rounded(scene.player?.speed), hp: rounded(scene.player?.hp),
        maxHp: rounded(scene.player?.maxHp) },
      pause: scene.gamePause?.getState?.() ?? null,
      items: scene.pickups?.items?.map(pickup => this.pickupState(pickup)) ?? [],
      spawned: { ...scene.pickups?.spawned }, collected: { ...scene.pickups?.collected },
      magnetUntil: rounded(scene.pickups?.magnetUntil),
      xpCollected: scene.debugStats?.xpCollected ?? 0,
      lastError: scene.debugStats?.lastError ?? null
    };
  }

  update(time) {
    try {
      if (time - this.lastSampleAt < 100) return;
      this.lastSampleAt = time;
      const snapshot = this.snapshot();
      if (snapshot.items.some(item => item.footDistance !== null && item.footDistance < 240)) {
        appendBounded(session.samples, snapshot, MAX_SAMPLES);
      }
    } catch {
      // Recording is best effort and cannot stop a run.
    }
  }

  exportReport() {
    const current = this.snapshot();
    const script = [...document.scripts].find(item => item.type === 'module');
    const report = {
      format: 'rooster-rage-pickup-diagnostics-v1',
      build: script?.src.split('/').at(-1) ?? null,
      page: `${location.origin}${location.pathname}`,
      exportedAt: new Date().toISOString(),
      current, events: [...session.events], samples: [...session.samples]
    };
    return {
      filename: `rooster-rage-pickups-${new Date().toISOString().replaceAll(':', '-')}.json`,
      json: JSON.stringify(report, null, 2)
    };
  }

  destroy() {
    window.removeEventListener('error', this.onError);
  }
}
