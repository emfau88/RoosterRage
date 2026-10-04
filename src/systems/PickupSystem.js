import Phaser from 'phaser';
import { Pickup } from '../entities/Pickup.js';

const PICKUP_BUDGETS = Object.freeze({ heal: 3, bomb: 2, magnet: 2 });
const CHEST_KINDS = Object.freeze(['elite-chest', 'golden-chest', 'royal-chest']);
const CHEST_REWARDS = Object.freeze({
  'elite-chest': 'elite',
  'golden-chest': 'golden',
  'royal-chest': 'boss'
});
const PICKUP_SCHEDULE = Object.freeze([
  { wave: 1, progress: 0.6, kind: 'heal' },
  { wave: 2, progress: 0.55, kind: 'magnet' },
  { wave: 3, progress: 0.55, kind: 'bomb' },
  { wave: 5, progress: 0.45, kind: 'heal' },
  { wave: 6, progress: 0.55, kind: 'magnet' },
  { wave: 7, progress: 0.6, kind: 'bomb' },
  { wave: 9, progress: 0.5, kind: 'heal' }
]);

export class PickupSystem {
  constructor(scene) {
    this.scene = scene;
    this.group = scene.physics.add.group();
    this.items = [];
    this.openingChests = new Set();
    this.spawned = { heal: 0, bomb: 0, magnet: 0, 'elite-chest': 0, 'golden-chest': 0, 'royal-chest': 0 };
    this.collected = { heal: 0, bomb: 0, magnet: 0, 'elite-chest': 0, 'golden-chest': 0, 'royal-chest': 0 };
    this.scheduleIndex = 0;
    this.propDrops = 0;
    this.propDropWaves = new Set();
    this.magnetUntil = 0;
  }

  update(time) {
    this.items.forEach((pickup) => pickup.update(time));
    const foot = this.scene.player?.groundMarker;
    const playerRadius = this.scene.player?.sprite.body?.halfWidth ?? 0;
    if (!foot || !playerRadius) return;
    // Supplement Arcade body contact with the visible feet. Both routes use
    // collect(), whose active guard ensures each pickup applies only once.
    for (const pickup of this.items) {
      if (pickup.chest || !pickup.sprite.active) continue;
      const reach = pickup.contactRadius + playerRadius;
      const ground = pickup.getGroundPosition();
      const dx = foot.x - ground.x;
      const dy = foot.y - ground.y;
      if (dx * dx + dy * dy <= reach * reach) this.collect(pickup, 'feet');
    }
  }

  onEnemyKilled(enemy) {
    if (enemy.boss) {
      this.spawn('royal-chest', enemy.sprite.x, enemy.sprite.y, {
        guaranteed: true,
        victoryReward: true
      });
    } else if (enemy.champion) {
      this.spawn('golden-chest', enemy.sprite.x, enemy.sprite.y, { guaranteed: true });
    } else if (enemy.elite) {
      this.spawn('elite-chest', enemy.sprite.x, enemy.sprite.y, { guaranteed: true });
    }
    const wave = this.scene.waveSystem?.currentWave ?? 0;
    const progress = this.scene.waveSystem?.getProgressState().percent ?? 0;
    this.processWaveProgress(wave, progress);
  }

  processWaveProgress(wave, progress) {
    let spawned = 0;
    while (this.scheduleIndex < PICKUP_SCHEDULE.length) {
      const next = PICKUP_SCHEDULE[this.scheduleIndex];
      if (wave < next.wave || (wave === next.wave && progress < next.progress)) {
        break;
      }
      this.scheduleIndex += 1;
      if (this.spawn(next.kind)) spawned += 1;
    }
    return spawned;
  }

  canSpawn(kind) {
    return CHEST_KINDS.includes(kind) || this.spawned[kind] < (PICKUP_BUDGETS[kind] ?? 0);
  }

  spawnFromProp(x, y, obstacle = null, options = {}) {
    const wave = this.scene.waveSystem?.currentWave ?? 0;
    if (wave < 2 || this.propDrops >= 3 || this.propDropWaves.has(wave)) return null;
    const roll = this.scene.rng.next(`prop-drop-${obstacle?.id ?? 'world'}`);
    if (!options.force && roll > 0.42) return null;
    const candidates = ['heal', 'magnet', 'bomb']
      .filter((kind) => this.canSpawn(kind))
      .sort((a, b) => (this.spawned[a] / PICKUP_BUDGETS[a]) - (this.spawned[b] / PICKUP_BUDGETS[b]));
    const kind = candidates[0];
    if (!kind) return null;
    const pickup = this.spawn(kind, x, y, { fromProp: true, originId: obstacle?.id ?? null });
    if (!pickup) return null;
    this.propDrops += 1;
    this.propDropWaves.add(wave);
    this.scene.telemetry.record('propDropSpawned', this.scene.time.now, {
      wave,
      propId: obstacle?.id ?? null,
      kind
    });
    return pickup;
  }

  spawn(kind, x, y, options = {}) {
    if (!this.canSpawn(kind)) return null;
    let point = Number.isFinite(x) && Number.isFinite(y)
      ? this.scene.arena.clampPoint(x, y, 72)
      : this.scene.arena.findSafePoint(`pickup-${kind}`, 90);
    if (this.scene.arena.overlapsObstacle(point.x, point.y, 30)) {
      point = this.scene.arena.findSafePoint(`pickup-${kind}`, 90);
    }
    const pickup = new Pickup(this.scene, kind, point.x, point.y);
    pickup.guaranteed = options.guaranteed ?? false;
    pickup.victoryReward = options.victoryReward ?? false;
    pickup.fromProp = Boolean(options.fromProp);
    pickup.originId = options.originId ?? null;
    this.items.push(pickup);
    this.group.add(pickup.sprite);
    this.spawned[kind] += 1;
    this.scene.pickupDiagnostics?.recordPickup('spawned', pickup);
    this.scene.telemetry.record('pickupSpawned', this.scene.time.now, {
      wave: this.scene.waveSystem?.currentWave ?? 0,
      kind,
      x: point.x,
      y: point.y
    });
    return pickup;
  }

  collect(pickup, source = 'direct') {
    if (!pickup?.sprite?.active || pickup.opening) return false;
    const { scene } = this;
    const kind = pickup.kind;
    let effect = null;
    scene.pickupDiagnostics?.recordPickup('contact', pickup, { source });
    if (kind === 'heal') {
      // A health pickup remains available until it can provide real value.
      if (scene.player.hp >= scene.player.maxHp) {
        scene.pickupDiagnostics?.recordPickup('deferred-full-health', pickup, { source });
        if (scene.time.now >= (pickup.nextHintAt ?? 0)) {
          pickup.nextHintAt = scene.time.now + 4000;
          scene.hud.showPickupFeedback('heal', 'HP FULL', 'Health stays here until needed');
        }
        return false;
      }
      const before = scene.player.hp;
      scene.player.heal(Math.max(12, Math.round(scene.player.maxHp * 0.25)));
      effect = { healed: scene.player.hp - before };
      scene.telemetry.addHealing(scene.player.hp - before, scene.time.now, scene.waveSystem.currentWave, 'pickup:heal');
      scene.hud.showPickupFeedback(kind, `+${scene.player.hp - before} HP`, 'Health restored');
    } else if (kind === 'bomb') {
      const beforeHits = scene.debugStats.hits;
      const beforeKills = scene.debugStats.kills;
      const enemiesBefore = scene.enemies.filter(enemy => enemy.sprite.active).length;
      scene.combatFeedback.bombConfetti.prepareBomb(scene.enemies.filter(enemy =>
        enemy.sprite.active && (enemy.boss || (!enemy.elite && !enemy.champion))).length);
      [...scene.enemies].forEach((enemy) => {
        if (!enemy.boss && (enemy.elite || enemy.champion)) return;
        const damage = enemy.boss ? Math.max(1, Math.round(enemy.maxHp * 0.05)) : enemy.maxHp;
        scene.damageEnemy(enemy, damage, enemy.sprite.x, enemy.sprite.y, { source: 'pickup:bomb', quiet: true });
      });
      effect = { enemiesBefore, enemiesAfter: scene.enemies.filter(enemy => enemy.sprite.active).length,
        hits: scene.debugStats.hits - beforeHits, kills: scene.debugStats.kills - beforeKills };
      scene.hud.showPickupFeedback(kind, 'EGG BOMB', 'Elites immune · Boss takes 5% max HP');
    } else if (kind === 'magnet') {
      this.magnetUntil = Math.max(this.magnetUntil, scene.time.now + 8000);
      effect = { magnetUntil: this.magnetUntil };
      scene.hud.showPickupFeedback(kind, 'MAGNET · 8s', 'All XP is pulled towards you');
    }
    this.collected[kind] += 1;
    scene.pickupDiagnostics?.recordPickup(CHEST_KINDS.includes(kind) ? 'chest-claimed' : 'effect-applied', pickup, { source, effect });
    scene.telemetry.record('pickupCollected', scene.time.now, {
      wave: scene.waveSystem.currentWave,
      kind
    });
    this.items = this.items.filter((item) => item !== pickup);
    this.group.remove(pickup.sprite, false, false);
    if (CHEST_KINDS.includes(kind)) {
      scene.gamePause.request('chest-opening', { freezeTime: false, freezeTweens: false });
      this.openingChests.add(pickup);
      pickup.playChestOpening(() => {
        this.openingChests.delete(pickup);
        if (kind === 'royal-chest' && pickup.victoryReward) {
          scene.telemetry.addChestFound(scene.time.now, scene.waveSystem.currentWave, 'victory');
          scene.telemetry.record('royalVictoryRewardClaimed', scene.time.now, {
            wave: scene.waveSystem.currentWave
          });
          pickup.destroy();
          scene.waveSystem.completeFinalWave();
          scene.victory();
          if (!this.openingChests.size) scene.gamePause.release('chest-opening');
          return;
        }
        scene.runState.startChestReward(CHEST_REWARDS[kind]);
        pickup.destroy();
        if (!this.openingChests.size) scene.gamePause.release('chest-opening');
      });
    } else {
      scene.audio.play(`pickup-${kind}`);
      const ground = pickup.getGroundPosition();
      this.playCollectFx(kind, ground.x, ground.y);
      pickup.destroy();
      scene.pickupDiagnostics?.recordPickup('removed', pickup, { source });
    }
    return true;
  }

  playCollectFx(kind, x, y) {
    // The bomb celebrates its defeated enemies with confetti, without a fire
    // explosion, ring or core at the player's feet.
    if (kind === 'bomb') return;
    const palette = {
      heal: { color: 0x65ef8b, radius: 20 },
      magnet: { color: 0x5ad7ff, radius: 23 }
    }[kind];
    if (!palette) return;

    const ring = this.scene.add.circle(x, y, palette.radius)
      .setStrokeStyle(kind === 'magnet' ? 3 : 2, palette.color, 0.88)
      .setDepth(10)
      .setScale(kind === 'magnet' ? 1.25 : 0.45);
    const core = this.scene.add.circle(x, y, 8, palette.color, 0.32).setDepth(9);
    this.scene.tweens.add({
      targets: ring,
      scale: kind === 'magnet' ? 0.25 : 1.55,
      alpha: 0,
      duration: kind === 'magnet' ? 360 : 300,
      ease: 'Cubic.Out',
      onComplete: () => ring.destroy()
    });
    this.scene.tweens.add({
      targets: core,
      scale: 2.7,
      alpha: 0,
      duration: 280,
      ease: 'Quad.Out',
      onComplete: () => core.destroy()
    });
  }

  isMagnetActive(time = this.scene.time.now) {
    return time < this.magnetUntil;
  }

  getState() {
    return {
      budgets: { ...PICKUP_BUDGETS },
      schedule: PICKUP_SCHEDULE.map((entry) => ({ ...entry })),
      scheduleIndex: this.scheduleIndex,
      nextScheduled: PICKUP_SCHEDULE[this.scheduleIndex]
        ? { ...PICKUP_SCHEDULE[this.scheduleIndex] }
        : null,
      spawned: { ...this.spawned },
      collected: { ...this.collected },
      magnetActive: this.isMagnetActive(),
      magnetRemainingMs: Math.max(0, this.magnetUntil - this.scene.time.now),
      propDrops: this.propDrops,
      openingChests: this.openingChests.size,
      openingChestStates: [...this.openingChests].map((pickup) => ({
        texture: pickup.sprite.texture.key,
        depth: pickup.sprite.depth,
        displayWidth: Math.round(pickup.sprite.displayWidth),
        displayHeight: Math.round(pickup.sprite.displayHeight)
      })),
      items: this.items.map((pickup) => ({
        kind: pickup.kind,
        x: pickup.sprite.x,
        y: pickup.sprite.y,
        active: pickup.sprite.active,
        opening: pickup.opening,
        victoryReward: pickup.victoryReward ?? false,
        texture: pickup.sprite.texture.key,
        field: pickup.field?.texture?.key ?? null,
        beam: pickup.beam?.texture?.key ?? null,
        depth: pickup.sprite.depth,
        displayWidth: Math.round(pickup.sprite.displayWidth),
        displayHeight: Math.round(pickup.sprite.displayHeight),
        reachable: this.scene.arena.isInsidePlayable(pickup.sprite.x, pickup.sprite.y, 20)
          && !this.scene.arena.overlapsObstacle(pickup.sprite.x, pickup.sprite.y, 22)
      }))
    };
  }

  destroy() {
    this.items.forEach((pickup) => pickup.destroy());
    this.openingChests.forEach((pickup) => pickup.destroy());
    this.items = [];
    this.openingChests.clear();
  }

  hasPendingRoyalReward() {
    return this.items.some((pickup) => pickup.kind === 'royal-chest')
      || [...this.openingChests].some((pickup) => pickup.kind === 'royal-chest')
      || this.scene.runState?.currentSelection?.kind === 'boss'
      || this.scene.runState?.rewardQueue?.includes('boss');
  }
}
