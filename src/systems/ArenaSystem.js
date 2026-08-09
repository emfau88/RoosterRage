import Phaser from 'phaser';
import { ARENA_DEFINITIONS, getArenaDefinition } from '../data/arenaDefinitions.js';

const SAFE_PADDING = 44;

function rectContains(rect, x, y, padding = 0) {
  return x >= rect.x - rect.width / 2 - padding
    && x <= rect.x + rect.width / 2 + padding
    && y >= rect.y - rect.height / 2 - padding
    && y <= rect.y + rect.height / 2 + padding;
}

export class ArenaSystem {
  constructor(scene, requestedId, worldWidth, worldHeight) {
    this.scene = scene;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.definition = getArenaDefinition(requestedId);
    this.obstacles = [];
    this.obstacleGroup = scene.physics.add.staticGroup();
    this.renderTopology();
    this.createObstacles();
    this.createBoundaryColliders();
  }

  get id() {
    return this.definition.id;
  }

  get bounds() {
    return this.definition.bounds;
  }

  getCatalog() {
    return ARENA_DEFINITIONS.map((arena) => ({
      id: arena.id,
      name: arena.name,
      topology: arena.topology,
      bounds: { ...arena.bounds },
      weaponRatings: { ...arena.weaponRatings },
      obstacleCount: arena.obstacles.length,
      destructibleCount: arena.obstacles.filter((obstacle) => !obstacle.solid).length
    }));
  }

  renderTopology() {
    const { scene, definition } = this;
    const { x, y, width, height } = definition.bounds;
    scene.add.rectangle(x + width / 2, y + height / 2, width, height, definition.accent, 0.055)
      .setStrokeStyle(5, definition.accent, 0.32)
      .setDepth(1);
    scene.add.text(x + 22, y + 18, definition.name.toUpperCase(), {
      color: '#fff4cf',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      stroke: '#1e1710',
      strokeThickness: 4
    }).setAlpha(0.52).setDepth(2);
  }

  createObstacles() {
    this.definition.obstacles.forEach((config) => {
      const texture = config.kind === 'wall' ? 'arena-wall' : `arena-${config.kind}`;
      const sprite = this.obstacleGroup.create(config.x, config.y, texture)
        .setDisplaySize(config.width, config.height)
        .setDepth(config.solid ? 3 : 4);
      sprite.refreshBody();
      const obstacle = {
        ...config,
        maxHp: config.hp ?? Infinity,
        hp: config.hp ?? Infinity,
        destructible: !config.solid,
        sprite
      };
      sprite.entity = obstacle;
      this.obstacles.push(obstacle);
    });
  }

  createBoundaryColliders() {
    const { x, y, width, height } = this.bounds;
    const thickness = 28;
    [
      { x: x + width / 2, y: y - thickness / 2, width, height: thickness },
      { x: x + width / 2, y: y + height + thickness / 2, width, height: thickness },
      { x: x - thickness / 2, y: y + height / 2, width: thickness, height },
      { x: x + width + thickness / 2, y: y + height / 2, width: thickness, height }
    ].forEach((boundary) => {
      const sprite = this.obstacleGroup.create(boundary.x, boundary.y, 'arena-wall')
        .setDisplaySize(boundary.width, boundary.height)
        .setAlpha(0.025)
        .setDepth(2);
      sprite.refreshBody();
      sprite.entity = { solid: true, boundary: true, destructible: false, sprite };
    });
  }

  getCenter() {
    const { x, y, width, height } = this.bounds;
    return { x: x + width / 2, y: y + height / 2 };
  }

  isInsidePlayable(x, y, padding = 0) {
    const bounds = this.bounds;
    return x >= bounds.x + padding
      && x <= bounds.x + bounds.width - padding
      && y >= bounds.y + padding
      && y <= bounds.y + bounds.height - padding;
  }

  overlapsObstacle(x, y, padding = SAFE_PADDING) {
    return this.obstacles.some((obstacle) => (
      obstacle.sprite.active && rectContains(obstacle, x, y, padding)
    ));
  }

  clampPoint(x, y, padding = SAFE_PADDING) {
    const bounds = this.bounds;
    return {
      x: Phaser.Math.Clamp(x, bounds.x + padding, bounds.x + bounds.width - padding),
      y: Phaser.Math.Clamp(y, bounds.y + padding, bounds.y + bounds.height - padding)
    };
  }

  findSafePoint(channel = 'arena-point', padding = SAFE_PADDING) {
    const bounds = this.bounds;
    for (let attempt = 0; attempt < 32; attempt += 1) {
      const point = {
        x: this.scene.rng.int(bounds.x + padding, bounds.x + bounds.width - padding, channel),
        y: this.scene.rng.int(bounds.y + padding, bounds.y + bounds.height - padding, channel)
      };
      if (!this.overlapsObstacle(point.x, point.y, padding)) {
        return point;
      }
    }
    return this.getCenter();
  }

  damageObstacle(obstacle, amount, source = 'base-egg') {
    if (!obstacle?.destructible || !obstacle.sprite.active) {
      return false;
    }
    obstacle.hp -= Math.max(0, amount);
    obstacle.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => {
      if (obstacle.sprite.active) obstacle.sprite.clearTint();
    });
    this.scene.telemetry.record('propDamaged', this.scene.time.now, {
      wave: this.scene.waveSystem?.currentWave ?? 0,
      id: obstacle.id,
      source,
      amount
    });
    if (obstacle.hp > 0) {
      return false;
    }
    const { x, y } = obstacle.sprite;
    obstacle.sprite.disableBody(true, true);
    this.scene.playFx('fx-rocket-explosion', x, y, { scale: 0.72, depth: 9 });
    this.scene.telemetry.record('propDestroyed', this.scene.time.now, {
      wave: this.scene.waveSystem?.currentWave ?? 0,
      id: obstacle.id,
      source
    });
    return true;
  }

  getState() {
    return {
      id: this.id,
      name: this.definition.name,
      topology: this.definition.topology,
      bounds: { ...this.bounds },
      weaponRatings: { ...this.definition.weaponRatings },
      obstacles: this.obstacles.map((obstacle) => ({
        id: obstacle.id,
        x: obstacle.x,
        y: obstacle.y,
        width: obstacle.width,
        height: obstacle.height,
        destructible: obstacle.destructible,
        hp: Number.isFinite(obstacle.hp) ? Math.max(0, obstacle.hp) : null,
        active: obstacle.sprite.active
      }))
    };
  }
}
