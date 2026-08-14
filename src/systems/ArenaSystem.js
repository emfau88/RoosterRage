import Phaser from 'phaser';
import { ARENA_DEFINITIONS, getArenaDefinition } from '../data/arenaDefinitions.js';
import { getSceneViewport } from './DisplayResolutionSystem.js';

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
    this.streaming = this.resolveStreamingConfig(this.definition.streaming);
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

  resolveStreamingConfig(streaming) {
    if (!streaming) return null;
    const { width, height } = getSceneViewport(this.scene);
    const portrait = streaming.portrait;
    const usePortrait = portrait
      && width <= portrait.maxViewportWidth
      && height > width;
    if (!usePortrait) return streaming;
    return {
      ...streaming,
      worldBounds: { ...portrait.worldBounds },
      playableBounds: { ...portrait.playableBounds },
      activeWindow: { ...portrait.activeWindow }
    };
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
      if (definition.id !== 'square-coop') {
        scene.add.rectangle(x + width / 2, y + height / 2, width, height, definition.accent, 0.055)
          .setStrokeStyle(5, definition.accent, 0.32)
          .setDepth(1);
      }
    }
    this.title = scene.add.text(center.x - 250, center.y - 380, definition.name.toUpperCase(), {
      color: '#fff4cf',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      stroke: '#1e1710',
      strokeThickness: 4
    }).setAlpha(definition.id === 'square-coop' ? 0 : 0.52).setDepth(2);
  }

  createObstacles() {
    this.definition.obstacles.forEach((config) => this.createObstacle(config));
  }

  createObstacle(config) {
    const texture = config.texture
      ?? (config.kind === 'wall' || config.kind === 'landmark' ? 'arena-wall' : `arena-${config.kind}`);
    const sprite = this.obstacleGroup.create(config.x, config.y, texture)
      .setDisplaySize(config.width, config.height)
      .setDepth(config.solid ? 3 : 4)
      .setVisible(config.visible ?? true);
    sprite.refreshBody();
    const obstacle = {
      ...config,
      maxHp: config.hp ?? Infinity,
      hp: config.hp ?? Infinity,
      destructible: !config.solid,
      damageStage: 0,
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
      const edgeLeft = this.scene.add.image(0, 0, 'arena-feed-alley-left').setDepth(-1).setVisible(false);
      const edgeRight = this.scene.add.image(0, 0, 'arena-feed-alley-right').setDepth(-1).setVisible(false);
      const landmark = this.scene.add.image(0, 0, 'landmark-well').setDepth(1).setVisible(false);
      const landmarkCollider = this.createObstacle({
        id: `stream-${index}-landmark`,
        x: 0,
        y: 0,
        width: 64,
        height: 64,
        kind: 'landmark',
        solid: true,
        visible: false
      });
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
      landmarkCollider.sprite.disableBody(true, true);
      this.chunkRecords.push({
        key: null,
        chunkX: 0,
        chunkY: 0,
        ground,
        edgeLeft,
        edgeRight,
        landmark,
        landmarkCollider,
        obstacles: obstacleSlots
      });
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
    const centerX = this.streaming.axis === 'vertical'
      ? world.x + world.width / 2
      : world.x + chunkX * width + width / 2;
    const centerY = world.y + chunkY * height + height / 2;
    const hash = chunkHash(chunkX, chunkY, this.id === 'open-yard' ? 17 : 43);
    record.key = key;
    record.chunkX = chunkX;
    record.chunkY = chunkY;
    const groundTexture = this.streaming.groundTexture;
    record.ground.setTexture(groundTexture);
    const groundWidth = this.id === 'vertical-run' ? world.width : width;
    if (this.id === 'vertical-run' && groundWidth < record.ground.frame.realWidth) {
      const cropX = (record.ground.frame.realWidth - groundWidth) / 2;
      record.ground.setCrop(cropX, 0, groundWidth, record.ground.frame.realHeight);
    }
    record.ground.setPosition(centerX, centerY)
      .setFlip(false, false);
    if (this.id === 'vertical-run' && groundWidth < record.ground.frame.realWidth) {
      record.ground.setScale(
        (groundWidth + 2) / groundWidth,
        (height + 2) / record.ground.frame.realHeight
      );
    } else {
      record.ground.setDisplaySize(groundWidth + 2, height + 2);
    }
    if (this.id === 'vertical-run') {
      const world = this.playableWorldBounds;
      const edgeWidth = 300;
      const useVariant = Math.abs(chunkY) % 2 === 1;
      record.edgeLeft.setTexture(useVariant ? 'arena-feed-alley-left-v2' : 'arena-feed-alley-left')
        .setPosition(world.x - edgeWidth / 2, centerY)
        .setFlip(false, false)
        .setDisplaySize(edgeWidth + 2, height + 2).setVisible(true);
      record.edgeRight.setTexture(useVariant ? 'arena-feed-alley-right-v2' : 'arena-feed-alley-right')
        .setPosition(world.x + world.width + edgeWidth / 2, centerY)
        .setFlip(false, false)
        .setDisplaySize(edgeWidth + 2, height + 2).setVisible(true);
    } else {
      record.edgeLeft.setVisible(false);
      record.edgeRight.setVisible(false);
    }
    this.configureLandmark(record, centerX, centerY, hash);
    this.configureChunkObstacles(record, centerX, centerY, hash);
  }

  configureLandmark(record, centerX, centerY, hash) {
    const landmarkConfig = this.getLandmarkConfig(hash);
    if (!landmarkConfig) {
      record.landmark.setVisible(false);
      this.disableObstacle(record.landmarkCollider);
      return;
    }
    const { texture, size, kind, colliderWidth, colliderHeight, colliderOffsetY } = landmarkConfig;
    const laneOffset = this.id === 'vertical-run' ? 255 : 0;
    const offsetX = laneOffset || ((hash & 1) ? -235 : 235);
    const offsetY = ((hash >>> 3) % 260) - 130;
    record.landmark.setTexture(texture)
      .setPosition(centerX + offsetX, centerY + offsetY)
      .setDisplaySize(size, size)
      .setAlpha(0.9)
      .setVisible(true);
    this.configureObstacle(record.landmarkCollider, {
      id: `${record.key}-${kind}`,
      x: centerX + offsetX,
      y: centerY + offsetY + colliderOffsetY,
      width: colliderWidth,
      height: colliderHeight,
      kind,
      solid: true,
      visible: false
    });
  }

  getLandmarkConfig(hash) {
    if (this.id === 'open-yard') {
      if (hash % 23 === 0) {
        return {
          texture: 'landmark-barn', size: 220, kind: 'barn',
          colliderWidth: 154, colliderHeight: 76, colliderOffsetY: 45
        };
      }
      if (hash % 17 === 0) {
        return {
          texture: 'landmark-well', size: 128, kind: 'well',
          colliderWidth: 76, colliderHeight: 54, colliderOffsetY: 18
        };
      }
      return null;
    }
    // Feed Alley's large architecture lives outside the playable lane. Keeping
    // the combat strip free of opaque landmarks preserves silhouettes in hordes.
    return null;
  }

  configureChunkObstacles(record, centerX, centerY, hash) {
    const slots = record.obstacles;
    if (this.id === 'vertical-run') {
      const world = this.playableWorldBounds;
      const gateOffset = Math.min(150, world.width / 2 - 110);
      const crateOffset = Math.min(270, world.width / 2 - 80);
      const propPattern = hash % 4;
      const propY = centerY + ((hash >>> 2) % 260) - 130;
      // Feed Alley needs long readable movement lines. A chunk carries at most
      // one destructible prop and every fourth pattern is completely clear.
      // This also makes overlapping bale/crate placements impossible.
      if (propPattern === 0) {
        this.disableObstacle(slots[0]);
        this.disableObstacle(slots[1]);
      } else if (propPattern <= 2) {
        this.configureObstacle(slots[0], {
          id: `${record.key}-gate`,
          x: centerX + ((hash & 1) ? -gateOffset : gateOffset),
          y: propY,
          width: 148,
          height: 52,
          kind: 'bale',
          hp: 130
        });
        this.disableObstacle(slots[1]);
      } else {
        this.disableObstacle(slots[0]);
        this.configureObstacle(slots[1], {
          id: `${record.key}-crate`,
          x: centerX + ((hash & 2) ? -crateOffset : crateOffset),
          y: propY,
          width: 68,
          height: 68,
          kind: 'crate',
          hp: 95
        });
      }
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
    const texture = config.texture
      ?? (config.kind === 'wall' || ['barn', 'well', 'orchard', 'silo', 'feed-trough'].includes(config.kind)
        ? 'arena-wall'
        : `arena-${config.kind}`);
    Object.assign(obstacle, config, {
      maxHp: config.hp ?? Infinity,
      hp: config.hp ?? Infinity,
      destructible: !config.solid,
      damageStage: 0
    });
    obstacle.sprite.enableBody(true, config.x, config.y, true, true);
    obstacle.sprite.setTexture(texture)
      .setPosition(config.x, config.y)
      .setDisplaySize(config.width, config.height)
      .setDepth(config.solid ? 3 : 4)
      .setVisible(config.visible ?? true)
      .setAlpha(1)
      .clearTint();
    obstacle.sprite.refreshBody();
    obstacle.sprite.entity = obstacle;
  }

  disableObstacle(obstacle) {
    obstacle.destructible = false;
    obstacle.hp = Infinity;
    obstacle.maxHp = Infinity;
    obstacle.damageStage = 0;
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
      if (obstacle.sprite.active) this.applyObstacleDamageVisual(obstacle);
    });
    this.scene.telemetry.record('propDamaged', this.scene.time.now, {
      wave: this.scene.waveSystem?.currentWave ?? 0,
      id: obstacle.id,
      source,
      amount
    });
    if (obstacle.hp > 0) {
      const healthRatio = obstacle.hp / obstacle.maxHp;
      const nextStage = healthRatio <= 0.34 ? 2 : healthRatio <= 0.67 ? 1 : 0;
      if (nextStage !== obstacle.damageStage) {
        obstacle.damageStage = nextStage;
        this.scene.telemetry.record('propDamageStageChanged', this.scene.time.now, {
          wave: this.scene.waveSystem?.currentWave ?? 0,
          id: obstacle.id,
          stage: nextStage
        });
      }
      return false;
    }
    const { x, y } = obstacle.sprite;
    obstacle.sprite.disableBody(true, true);
    this.scene.audio.play(obstacle.kind === 'bale' ? 'bale-break' : 'crate-break');
    this.scene.playFx('fx-rocket-explosion', x, y, { scale: 0.72, depth: 9 });
    this.scene.pickups?.spawnFromProp(x, y, obstacle);
    this.scene.telemetry.record('propDestroyed', this.scene.time.now, {
      wave: this.scene.waveSystem?.currentWave ?? 0,
      id: obstacle.id,
      source
    });
    return true;
  }

  applyObstacleDamageVisual(obstacle) {
    obstacle.sprite.clearTint().setAlpha(1);
    if (obstacle.damageStage === 1) {
      obstacle.sprite.setTint(0xffc985).setAlpha(0.94);
    } else if (obstacle.damageStage >= 2) {
      obstacle.sprite.setTint(0xe66d42).setAlpha(0.86);
    }
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
        groundTexture: record.ground.texture.key,
        groundFlipX: record.ground.flipX,
        groundFlipY: record.ground.flipY,
        edgeLeft: record.edgeLeft.visible ? {
          texture: record.edgeLeft.texture.key,
          flipX: record.edgeLeft.flipX,
          flipY: record.edgeLeft.flipY
        } : null,
        edgeRight: record.edgeRight.visible ? {
          texture: record.edgeRight.texture.key,
          flipX: record.edgeRight.flipX,
          flipY: record.edgeRight.flipY
        } : null,
        landmark: record.landmark.visible ? record.landmark.texture.key : null,
        landmarkCollider: record.landmarkCollider.sprite.active ? {
          x: record.landmarkCollider.x,
          y: record.landmarkCollider.y,
          width: record.landmarkCollider.width,
          height: record.landmarkCollider.height,
          kind: record.landmarkCollider.kind
        } : null
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
        kind: obstacle.kind,
        destructible: obstacle.destructible,
        damageStage: obstacle.damageStage ?? 0,
        hp: Number.isFinite(obstacle.hp) ? Math.max(0, obstacle.hp) : null,
        maxHp: Number.isFinite(obstacle.maxHp) ? obstacle.maxHp : null,
        active: obstacle.sprite.active
      }))
    };
  }

  destroy() {
    this.chunkRecords.forEach((record) => {
      record.ground.destroy();
      record.edgeLeft.destroy();
      record.edgeRight.destroy();
      record.landmark.destroy();
    });
    this.title?.destroy();
    this.obstacleGroup.destroy(true);
    this.chunkRecords = [];
    this.chunkByKey.clear();
    this.obstacles = [];
  }
}
