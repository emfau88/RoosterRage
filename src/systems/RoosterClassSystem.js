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
    this.scene.loadout.initializeStartWeapon(definition);
    this.clearVisualIdentity();
    this.scene.telemetry.summary.roosterId = definition.id;
    this.scene.telemetry.record('roosterSelected', this.scene.time.now, { roosterId: definition.id });
    return true;
  }

  applyStats(definition) {
    const { player } = this.scene;
    player.setRoosterVisual(definition.id, definition.visual.texture);
    player.roosterName = definition.shortName;
    player.primaryAttack = { ...definition.primary, rank: 1 };
    player.primaryEvolution = null;
    player.upgradeAffinities = { ...definition.upgradeAffinities };
    player.maxHp = definition.stats.maxHp;
    player.hp = player.maxHp;
    player.speed = definition.stats.speed;
    player.fireRate = definition.stats.fireRate;
    player.projectileDamage = definition.stats.projectileDamage;
    player.critChance = definition.stats.critChance;
    this.scene.challenge?.applyPlayer(player);
    player.baseScale = definition.visual.scale;
    player.sprite.setScale(player.baseScale);
    player.sprite.clearTint();
    const cosmetic = this.scene.meta?.getSelectedCosmetic(definition.id);
    const tint = cosmetic?.tint ?? null;
    if (tint) {
      player.sprite.setTint(tint);
    }
    player.updateHealthBar();
  }

  evolvePrimary(baseId, evolutionId) {
    if (!this.selected || baseId !== `primary-${this.selected.id}`) {
      return false;
    }
    const evolution = this.selected.primaryEvolution;
    if (!evolution || evolution.id !== evolutionId) {
      return false;
    }
    this.scene.player.primaryEvolution = { ...evolution };
    if (this.selected.id !== 'ace') {
      const halo = this.scene.add.circle(
        this.scene.player.sprite.x,
        this.scene.player.sprite.y,
        35,
        evolution.trailColor,
        0.08
      ).setStrokeStyle(3, evolution.trailColor, 0.84).setDepth(7);
      halo.markerType = 'primary-evolution';
      this.markers.push(halo);
    }
    return true;
  }

  clearVisualIdentity() {
    this.markers.forEach((marker) => marker.destroy());
    this.markers = [];
  }

  update(time) {
    if (!this.selected) {
      return;
    }
    const { player } = this.scene;
    const x = player.sprite.x;
    const y = player.sprite.y;
    this.markers.forEach((marker) => {
      if (marker.markerType === 'primary-evolution') {
        marker.setPosition(x, y + 5);
        marker.setScale(0.94 + Math.sin(time * 0.005) * 0.08);
        marker.setAlpha(0.52 + Math.sin(time * 0.004) * 0.18);
      }
    });
  }

  destroy() {
    this.markers.forEach((marker) => marker.destroy());
    this.markers = [];
  }
}
