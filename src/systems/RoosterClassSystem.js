import { ROOSTER_DEFINITIONS, getRoosterDefinition } from '../data/roosterDefinitions.js';

export class RoosterClassSystem {
  constructor(scene) {
    this.scene = scene;
    this.selected = null;
    this.markers = [];
  }

  getDefinitions() {
    return ROOSTER_DEFINITIONS;
  }

  select(id) {
    const definition = getRoosterDefinition(id);
    if (!definition) {
      return false;
    }

    this.selected = definition;
    this.applyStats(definition);
    this.createVisualIdentity(definition);
    this.scene.telemetry.summary.roosterId = definition.id;
    this.scene.telemetry.record('roosterSelected', this.scene.time.now, { roosterId: definition.id });
    return true;
  }

  applyStats(definition) {
    const { player } = this.scene;
    player.roosterId = definition.id;
    player.roosterName = definition.shortName;
    player.primaryAttack = { ...definition.primary };
    player.upgradeAffinities = { ...definition.upgradeAffinities };
    player.maxHp = definition.stats.maxHp;
    player.hp = player.maxHp;
    player.speed = definition.stats.speed;
    player.fireRate = definition.stats.fireRate;
    player.projectileDamage = definition.stats.projectileDamage;
    player.critChance = definition.stats.critChance;
    player.baseScale = definition.visual.scale;
    player.sprite.setScale(player.baseScale);
    player.sprite.clearTint();
    if (definition.visual.tint) {
      player.sprite.setTint(definition.visual.tint);
    }
    player.updateHealthBar();
  }

  createVisualIdentity(definition) {
    this.markers.forEach((marker) => marker.destroy());
    this.markers = [];
    const { x, y } = this.scene.player.sprite;

    if (definition.id === 'ace') {
      const ring = this.scene.add.circle(x, y + 18, 29, 0xffd35c, 0.05)
        .setStrokeStyle(2, 0xffd35c, 0.5)
        .setDepth(5);
      ring.markerType = 'ace-ring';
      this.markers.push(ring);
      return;
    }

    if (definition.id === 'artillery') {
      [-1, 1].forEach((side) => {
        const pod = this.scene.add.circle(x, y, 9, 0x5a2118, 1)
          .setStrokeStyle(3, 0xffa53b, 0.92)
          .setDepth(5);
        pod.markerType = 'artillery-pod';
        pod.side = side;
        this.markers.push(pod);
      });
      return;
    }

    for (let index = 0; index < 3; index += 1) {
      const spark = this.scene.add.rectangle(x, y, 7, 13, 0x9ff7ff, 0.9)
        .setStrokeStyle(1, 0xffffff, 0.9)
        .setDepth(8);
      spark.markerType = 'storm-spark';
      spark.index = index;
      this.markers.push(spark);
    }
  }

  update(time) {
    if (!this.selected) {
      return;
    }
    const { player } = this.scene;
    const x = player.sprite.x;
    const y = player.sprite.y;
    this.markers.forEach((marker) => {
      if (marker.markerType === 'ace-ring') {
        marker.setPosition(x, y + 18);
        marker.setScale(0.96 + Math.sin(time * 0.004) * 0.05);
        return;
      }
      if (marker.markerType === 'artillery-pod') {
        const perpendicular = player.aimAngle + Math.PI / 2;
        marker.setPosition(
          x + Math.cos(perpendicular) * marker.side * 24,
          y + Math.sin(perpendicular) * marker.side * 24 + 6
        );
        return;
      }
      const angle = time * 0.0032 + (Math.PI * 2 * marker.index) / 3;
      marker.setPosition(x + Math.cos(angle) * 31, y + Math.sin(angle) * 25);
      marker.setRotation(angle + Math.PI / 4);
      marker.setAlpha(0.58 + Math.sin(time * 0.012 + marker.index) * 0.28);
    });
  }

  destroy() {
    this.markers.forEach((marker) => marker.destroy());
    this.markers = [];
  }
}
