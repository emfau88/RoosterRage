import Phaser from 'phaser';
import { getSceneViewport } from './DisplayResolutionSystem.js';

const DEFAULT_CURVE = [
  { id: 'build', share: 0.24, durationShare: 0.24, batch: 2, pattern: 'scatter', pauseAfter: 450 },
  { id: 'escalate', share: 0.34, durationShare: 0.3, batch: 3, pattern: 'pulse', pauseAfter: 520 },
  { id: 'recover', share: 0.14, durationShare: 0.2, batch: 1, pattern: 'scatter', pauseAfter: 650 },
  { id: 'finale', share: 0.28, durationShare: 0.26, batch: 4, pattern: 'surround', pauseAfter: 0 }
];

export function allocateBudgets(total, segments) {
  const budgets = segments.map((segment) => Math.floor(total * segment.share));
  let remaining = total - budgets.reduce((sum, value) => sum + value, 0);
  let index = budgets.length - 1;
  while (remaining > 0) {
    budgets[index] += 1;
    remaining -= 1;
    index = (index - 1 + budgets.length) % budgets.length;
  }
  return budgets;
}

export class SpawnDirector {
  constructor(scene) {
    this.scene = scene;
    this.reset();
  }

  reset() {
    this.wave = null;
    this.queue = [];
    this.segments = [];
    this.segmentIndex = 0;
    this.segmentSpawned = 0;
    this.spawnedCount = 0;
    this.nextSpawnAt = Infinity;
    this.done = true;
  }

  start(wave, queue, startAt) {
    this.wave = wave;
    this.queue = [...queue];
    const curve = wave.pressureCurve?.length ? wave.pressureCurve : DEFAULT_CURVE;
    const budgets = allocateBudgets(queue.length, curve);
    const targetMs = ((wave.targetDuration?.[0] ?? 25) + (wave.targetDuration?.[1] ?? 35)) * 500;
    this.segments = curve.map((segment, index) => {
      const budget = budgets[index];
      const batch = Math.max(1, segment.batch ?? 1);
      const pulses = Math.max(1, Math.ceil(budget / batch));
      const segmentDuration = targetMs * (segment.durationShare ?? segment.share);
      return {
        ...segment,
        budget,
        batch,
        cadence: Math.max(120, Math.floor(segmentDuration / pulses))
      };
    });
    this.segmentIndex = 0;
    this.segmentSpawned = 0;
    this.spawnedCount = 0;
    this.nextSpawnAt = startAt;
    this.done = queue.length === 0;
  }

  update(time, enemiesAlive) {
    if (this.done || time < this.nextSpawnAt || !this.canSpawn(enemiesAlive)) {
      return 0;
    }
    const segment = this.segments[this.segmentIndex];
    if (!segment) {
      this.done = true;
      return 0;
    }
    const remainingInSegment = segment.budget - this.segmentSpawned;
    const remainingTotal = this.queue.length - this.spawnedCount;
    const batchSize = Math.min(segment.batch, remainingInSegment, remainingTotal);
    const configs = this.queue.slice(this.spawnedCount, this.spawnedCount + batchSize);
    const spawned = this.spawnFormation(configs, segment.pattern ?? 'scatter');
    this.spawnedCount += spawned;
    this.segmentSpawned += spawned;
    this.nextSpawnAt = time + segment.cadence;

    if (this.segmentSpawned >= segment.budget || this.spawnedCount >= this.queue.length) {
      this.segmentIndex += 1;
      this.segmentSpawned = 0;
      this.nextSpawnAt = time + (segment.pauseAfter ?? 0);
    }
    if (this.spawnedCount >= this.queue.length) {
      this.done = true;
    }
    return spawned;
  }

  canSpawn(enemiesAlive) {
    const { width, height } = getSceneViewport(this.scene);
    const mobile = Math.min(width, height) <= 600;
    const cap = mobile
      ? this.wave.mobileActiveCap ?? this.wave.targetPeak ?? 60
      : this.wave.activeCap ?? Math.ceil((this.wave.targetPeak ?? 60) * 1.15);
    return enemiesAlive < cap;
  }

  spawnFormation(configs, pattern) {
    if (!configs.length) {
      return 0;
    }
    const points = this.getFormationPoints(
      pattern,
      configs.length,
      this.wave.spawnMinDistance ?? 260
    );
    let spawned = 0;
    configs.forEach((config, index) => {
      const point = points[index] ?? this.scene.entities.findSafeEdgeSpawn(this.wave.spawnMinDistance ?? 260);
      if (this.scene.entities.spawnEnemyAt(config, point.x, point.y)) {
        spawned += 1;
      }
    });
    return spawned;
  }

  getFormationPoints(pattern, count, minDistance) {
    if (pattern === 'scatter') {
      return Array.from({ length: count }, () => this.scene.entities.findSafeEdgeSpawn(minDistance));
    }
    if (pattern === 'surround') {
      const startEdge = this.scene.rng.int(0, 3, 'spawn-formation');
      return Array.from({ length: count }, (_, index) => (
        this.pointOnEdge((startEdge + index) % 4, index, count, minDistance)
      ));
    }
    const edge = this.pickSafestEdge(minDistance);
    return Array.from({ length: count }, (_, index) => (
      this.pointOnEdge(edge, index, count, minDistance, pattern === 'rusher-line' ? 72 : 44)
    ));
  }

  pickSafestEdge(minDistance) {
    const candidates = Array.from({ length: 4 }, (_, edge) => ({
      edge,
      point: this.pointOnEdge(edge, 0, 1, minDistance)
    }));
    return candidates.sort((a, b) => b.point.distance - a.point.distance)[0].edge;
  }

  pointOnEdge(edge, index, count, minDistance, spacing = 58) {
    const margin = 66;
    const bounds = this.scene.arena?.bounds ?? {
      x: 0,
      y: 0,
      width: this.scene.entities.arenaWidth,
      height: this.scene.entities.arenaHeight
    };
    const width = bounds.width;
    const height = bounds.height;
    const player = this.scene.player.sprite;
    const offset = (index - (count - 1) / 2) * spacing;
    const horizontal = edge === 0 || edge === 2;
    const center = horizontal
      ? this.scene.rng.int(bounds.x + margin, bounds.x + width - margin, 'spawn-formation')
      : this.scene.rng.int(bounds.y + margin, bounds.y + height - margin, 'spawn-formation');
    let x = horizontal
      ? Phaser.Math.Clamp(center + offset, bounds.x + margin, bounds.x + width - margin)
      : (edge === 1 ? bounds.x + width - margin : bounds.x + margin);
    let y = horizontal
      ? (edge === 0 ? bounds.y + margin : bounds.y + height - margin)
      : Phaser.Math.Clamp(center + offset, bounds.y + margin, bounds.y + height - margin);
    let distance = Phaser.Math.Distance.Between(x, y, player.x, player.y);
    if (distance < minDistance || this.scene.arena?.overlapsObstacle(x, y, 38)) {
      const fallback = this.scene.entities.findSafeEdgeSpawn(minDistance);
      x = fallback.x;
      y = fallback.y;
      distance = fallback.distance;
    }
    return { x, y, distance };
  }

  getState() {
    return {
      done: this.done,
      spawned: this.spawnedCount,
      total: this.queue.length,
      segment: this.segments[this.segmentIndex]?.id ?? 'complete',
      segmentIndex: this.segmentIndex,
      nextSpawnAt: this.nextSpawnAt
    };
  }
}
