import Phaser from 'phaser';
import { ARENA_DEFINITIONS, getArenaDefinition } from '../data/arenaDefinitions.js';

const SAFE_PADDING = 44;

function rectContains(rect, x, y, padding = 0) {
  return x >= rect.x - rect.width / 2 - padding
    && x <= rect.x + rect.width / 2 + padding
    && y >= rect.y - rect.height / 2 - padding
    && y <= rect.y + rect.height / 2 + padding;
}

function chunkHash(x, y, salt = 0) {
  let value = Math.imul(x + 374761393, 668265263)
    ^ Math.imul(y + 1274126177, 2246822519)
    ^ salt;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return (value ^ (value >>> 16)) >>> 0;
}

export class ArenaSystem {
  constructor(scene, requestedId, worldWidth, worldHeight) {
    this.scene = scene;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.definition = getArenaDefinition(requestedId);
    this.streaming = this.definition.streaming ?? null;
    this.obstacles = [];
    this.obstacleGroup = scene.physics.add.staticGroup();
    this.chunkRecords = [];
    this.chunkByKey = new Map();
    this.chunkAnchor = null;
    this.recycledChunks = 0;
    this.renderTopology();
    if (this.streaming) {
      this.createChunkPool();
      this.update(true);
    } else {
      this.createObstacles();
      this.createBoundaryColliders();
    }
  }

  get id() {
    return this.definition.id;
  }

  get worldBounds() {
    return this.streaming?.worldBounds ?? {
      x: 0,
      y: 0,
      width: this.worldWidth,
      height: this.worldHeight
    };
  }

  get playableWorldBounds() {
    return this.streaming?.playableBounds ?? this.worldBounds;
  }

  get bounds() {
    if (!this.streaming) return this.definition.bounds;
    const world = this.playableWorldBounds;
    const window = this.streaming.activeWindow;
    const focus = this.scene.player?.sprite ?? this.streaming.start;
    const x = this.streaming.axis === 'vertical'
      ? world.x
      : Phaser.Math.Clamp(focus.x - window.width / 2, world.x, world.x + world.width - window.width);
    const y = Phaser.Math.Clamp(
      focus.y - window.height / 2,
      world.y,
      world.y + world.height - window.height
    );
    return { x, y, width: window.width, height: window.height };
  }

  getCatalog() {
    return ARENA_DEFINITIONS.map((arena) => {
      const chunk = arena.streaming?.chunk;
      const chunkCount = chunk
        ? (chunk.radiusX * 2 + 1) * (chunk.radiusY * 2 + 1)
        : 0;
      return {
        id: arena.id,
        name: arena.name,
        topology: arena.topology,
        bounds: { ...arena.bounds },
        streaming: Boolean(arena.streaming),
        chunkCount,
        weaponRatings: { ...arena.weaponRatings },
        obstacleCount: arena.streaming ? chunkCount * 2 : arena.obstacles.length,
        destructibleCount: arena.streaming ? chunkCount : arena.obstacles.filter((obstacle) => !obstacle.solid).length
      };
    });
  }

  renderTopology() {
    const { scene, definition } = this;
    const center = this.getCenter();
    if (!this.streaming) {
      const { x, y, width, height } = definition.bounds;
      scene.add.rectangle(x + width / 2, y + height / 2, width, height, definition.accent, 0.055)
        .setStrokeStyle(5, definition.accent, 0.32)
        .setDepth(1);
    }
    this.title = scene.add.text(center.x - 250, center.y - 380, definition.name.toUpperCase(), {
      color: '#fff4cf',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      stroke: '#1e1710',
      strokeThickness: 4
    }).setAlpha(0.52).setDepth(2);
  }

  createObstacles() {
    this.definition.obstacles.forEach((config) => this.createObstacle(config));
  }

  createObstacle(config) {
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
    return obstacle;
  }

  createChunkPool() {
    const { radiusX, radiusY } = this.streaming.chunk;
    const count = (radiusX * 2 + 1) * (radiusY * 2 + 1);
    for (let index = 0; index < count; index += 1) {
      const ground = this.scene.add.image(0, 0, this.streaming.groundTexture).setDepth(-2);
      const landmark = this.scene.add.image(0, 0, 'landmark-well').setDepth(1).setVisible(false);
      const obstacleSlots = Array.from({ length: 4 }, (_, slot) => this.createObstacle({
        id: `stream-${index}-${slot}`,
        x: 0,
        y: 0,
        width: 64,
        height: 64,
        kind: 'crate',
        hp: 90
      }));
      obstacleSlots.forEach((obstacle) => obstacle.sprite.disableBody(true, true));
      this.chunkRecords.push({ key: null, chunkX: 0, chunkY: 0, ground, landmark, obstacles: obstacleSlots });
    }
  }

  getChunkAnchor() {
    const { width, height } = this.streaming.chunk;
    const world = this.playableWorldBounds;
    const focus = this.scene.player?.sprite ?? this.streaming.start;
    return {
      x: this.streaming.axis === 'vertical' ? 0 : Math.floor((focus.x - world.x) / width),
      y: Math.floor((focus.y - world.y) / height)
    };
  }

  getDesiredChunks(anchor) {
    const { radiusX, radiusY } = this.streaming.chunk;
    const desired = [];
    for (let y = anchor.y - radiusY; y <= anchor.y + radiusY; y += 1) {
      for (let x = anchor.x - radiusX; x <= anchor.x + radiusX; x += 1) {
        desired.push({ x, y, key: `${x}:${y}` });
      }
    }
    return desired;
  }

  update(force = false) {
    if (!this.streaming) return false;
    const anchor = this.getChunkAnchor();
    if (!force && this.chunkAnchor?.x === anchor.x && this.chunkAnchor?.y === anchor.y) return false;
    const desired = this.getDesiredChunks(anchor);
    const desiredKeys = new Set(desired.map(({ key }) => key));
    const available = this.chunkRecords.filter((record) => !record.key || !desiredKeys.has(record.key));
    available.forEach((record) => {
      if (record.key) this.chunkByKey.delete(record.key);
    });
    desired.forEach(({ x, y, key }) => {
      if (this.chunkByKey.has(key)) return;
      const record = available.shift();
      if (!record) return;
      if (record.key) this.recycledChunks += 1;
      this.assignChunk(record, x, y, key);
      this.chunkByKey.set(key, record);
    });
    this.chunkAnchor = anchor;
    return true;
  }

  assignChunk(record, chunkX, chunkY, key) {
    const { width, height } = this.streaming.chunk;
    const world = this.playableWorldBounds;
    const centerX = world.x + chunkX * width + width / 2;
    const centerY = world.y + chunkY * height + height / 2;
    const hash = chunkHash(chunkX, chunkY, this.id === 'open-yard' ? 17 : 43);
    record.key = key;
    record.chunkX = chunkX;
    record.chunkY = chunkY;
    record.ground.setPosition(centerX, centerY).setDisplaySize(width + 2, height + 2);
    this.configureLandmark(record, centerX, centerY, hash);
    this.configureChunkObstacles(record, centerX, centerY, hash);
  }

  configureLandmark(record, centerX, centerY, hash) {
    const showBarn = this.id === 'open-yard' && hash % 11 === 0;
    const showWell = hash % (this.id === 'open-yard' ? 7 : 9) === 0;
    if (!showBarn && !showWell) {
      record.landmark.setVisible(false);
      return;
    }
    const texture = showBarn ? 'landmark-barn' : 'landmark-well';
    const size = showBarn ? 220 : 128;
    const laneOffset = this.id === 'vertical-run' ? 255 : 0;
    const offsetX = laneOffset || ((hash & 1) ? -235 : 235);
    const offsetY = ((hash >>> 3) % 260) - 130;
    record.landmark.setTexture(texture)
      .setPosition(centerX + offsetX, centerY + offsetY)
      .setDisplaySize(size, size)
      .setAlpha(0.9)
      .setVisible(true);
  }

  configureChunkObstacles(record, centerX, centerY, hash) {
    const slots = record.obstacles;
    if (this.id === 'vertical-run') {
      const world = this.playableWorldBounds;
      this.configureObstacle(slots[0], {
        id: `${record.key}-gate`,
        x: centerX + ((hash & 1) ? -150 : 150),
        y: centerY + ((hash >>> 2) % 180) - 90,
        width: 148,
        height: 52,
        kind: 'bale',
        hp: 130
      });
      this.configureObstacle(slots[1], {
        id: `${record.key}-crate`,
        x: centerX + ((hash & 2) ? -270 : 270),
        y: centerY + ((hash >>> 5) % 220) - 110,
        width: 68,
        height: 68,
        kind: 'crate',
        hp: 95
      });
      this.configureObstacle(slots[2], {
        id: `${record.key}-left-wall`,
        x: world.x + 20,
        y: centerY,
        width: 40,
        height: this.streaming.chunk.height + 2,
        kind: 'wall',
        solid: true
      });
      this.configureObstacle(slots[3], {
        id: `${record.key}-right-wall`,
        x: world.x + world.width - 20,
        y: centerY,
        width: 40,
        height: this.streaming.chunk.height + 2,
        kind: 'wall',
        solid: true
      });
      return;
    }
    this.configureObstacle(slots[0], {
      id: `${record.key}-prop-a`,
      x: centerX + ((hash & 1) ? -260 : 260),
      y: centerY + ((hash & 2) ? -210 : 210),
      width: (hash & 4) ? 118 : 68,
      height: (hash & 4) ? 52 : 68,
      kind: (hash & 4) ? 'bale' : 'crate',
      hp: (hash & 4) ? 125 : 90
    });
    if (hash % 3 === 0) {
      this.configureObstacle(slots[1], {
        id: `${record.key}-prop-b`,
        x: centerX + ((hash & 8) ? -110 : 110),
        y: centerY + ((hash & 16) ? -270 : 270),
        width: 68,
        height: 68,
        kind: 'crate',
        hp: 90
      });
    } else {
      this.disableObstacle(slots[1]);
    }
    this.disableObstacle(slots[2]);
    this.disableObstacle(slots[3]);
  }

  configureObstacle(obstacle, config) {
    const texture = config.kind === 'wall' ? 'arena-wall' : `arena-${config.kind}`;
    Object.assign(obstacle, config, {
      maxHp: config.hp ?? Infinity,
      hp: config.hp ?? Infinity,
      destructible: !config.solid
    });
    obstacle.sprite.enableBody(true, config.x, config.y, true, true);
    obstacle.sprite.setTexture(texture)
      .setPosition(config.x, config.y)
      .setDisplaySize(config.width, config.height)
      .setDepth(config.solid ? 3 : 4)
      .clearTint();
    obstacle.sprite.refreshBody();
    obstacle.sprite.entity = obstacle;
  }

  disableObstacle(obstacle) {
    obstacle.destructible = false;
    obstacle.hp = Infinity;
    obstacle.maxHp = Infinity;
    obstacle.sprite.disableBody(true, true);
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
    if (this.streaming) return { ...this.streaming.start };
    const { x, y, width, height } = this.bounds;
    return { x: x + width / 2, y: y + height / 2 };
  }

  isInsidePlayable(x, y, padding = 0) {
    const bounds = this.streaming ? this.playableWorldBounds : this.bounds;
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

  clampToWorld(x, y, padding = SAFE_PADDING) {
    const bounds = this.streaming ? this.playableWorldBounds : this.bounds;
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
      if (!this.overlapsObstacle(point.x, point.y, padding)) return point;
    }
    return this.getCenter();
  }

  damageObstacle(obstacle, amount, source = 'base-egg') {
    if (!obstacle?.destructible || !obstacle.sprite.active) return false;
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
    if (obstacle.hp > 0) return false;
    const { x, y } = obstacle.sprite;
    obstacle.sprite.disableBody(true, true);
    this.scene.audio.play(obstacle.kind === 'bale' ? 'bale-break' : 'crate-break');
    this.scene.playFx('fx-rocket-explosion', x, y, { scale: 0.72, depth: 9 });
    this.scene.telemetry.record('propDestroyed', this.scene.time.now, {
      wave: this.scene.waveSystem?.currentWave ?? 0,
      id: obstacle.id,
      source
    });
    return true;
  }

  getState() {
    const activeChunks = this.chunkRecords.filter((record) => record.key);
    return {
      id: this.id,
      name: this.definition.name,
      topology: this.definition.topology,
      bounds: { ...this.bounds },
      worldBounds: { ...this.worldBounds },
      playableWorldBounds: { ...this.playableWorldBounds },
      streaming: Boolean(this.streaming),
      chunkPoolSize: this.chunkRecords.length,
      activeChunks: activeChunks.map((record) => ({
        key: record.key,
        x: record.ground.x,
        y: record.ground.y,
        width: record.ground.displayWidth,
        height: record.ground.displayHeight,
        landmark: record.landmark.visible ? record.landmark.texture.key : null
      })),
      chunkAnchor: this.chunkAnchor ? { ...this.chunkAnchor } : null,
      recycledChunks: this.recycledChunks,
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

  destroy() {
    this.chunkRecords.forEach((record) => {
      record.ground.destroy();
      record.landmark.destroy();
    });
    this.title?.destroy();
    this.obstacleGroup.destroy(true);
    this.chunkRecords = [];
    this.chunkByKey.clear();
    this.obstacles = [];
  }
}
