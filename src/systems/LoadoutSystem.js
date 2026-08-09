const ACTIVE_CATEGORIES = new Set(['active', 'orbit', 'summon']);

export class LoadoutSystem {
  constructor(scene, { activeSlots = 5, passiveSlots = 4 } = {}) {
    this.scene = scene;
    this.activeSlots = activeSlots;
    this.passiveSlots = passiveSlots;
    this.active = new Map();
    this.passive = new Map();
    this.evolutions = new Map();
    this.startWeaponId = null;
  }

  initializeStartWeapon(rooster) {
    this.active.clear();
    this.passive.clear();
    this.evolutions.clear();
    this.startWeaponId = `primary-${rooster.id}`;
    this.active.set(this.startWeaponId, {
      id: this.startWeaponId,
      sourceId: this.startWeaponId,
      name: rooster.primary.name,
      slotType: 'active',
      rank: 1,
      maxRank: 1,
      startWeapon: true,
      evolved: false,
      evolutionId: null
    });
  }

  getSlotType(upgrade) {
    if (upgrade.consumable || upgrade.evolution) {
      return null;
    }
    if (upgrade.slotType) {
      return upgrade.slotType;
    }
    return ACTIVE_CATEGORIES.has(upgrade.category) ? 'active' : 'passive';
  }

  getSlotKey(upgrade) {
    return upgrade.slotKey ?? upgrade.id;
  }

  canAcquire(upgrade, player) {
    const slotType = this.getSlotType(upgrade);
    if (!slotType) {
      return true;
    }
    const slots = slotType === 'active' ? this.active : this.passive;
    const key = this.getSlotKey(upgrade);
    if (slots.has(key) || player.getUpgradeRank(upgrade.id) > 0) {
      return true;
    }
    return slots.size < (slotType === 'active' ? this.activeSlots : this.passiveSlots);
  }

  onUpgradeApplied(upgrade, player) {
    if (upgrade.evolution) {
      this.applyEvolution(upgrade);
      return;
    }
    const slotType = this.getSlotType(upgrade);
    if (!slotType) {
      return;
    }
    const slots = slotType === 'active' ? this.active : this.passive;
    const key = this.getSlotKey(upgrade);
    const capacity = slotType === 'active' ? this.activeSlots : this.passiveSlots;
    if (!slots.has(key) && slots.size >= capacity) {
      return;
    }
    const existing = slots.get(key);
    slots.set(key, {
      id: key,
      sourceId: upgrade.id,
      name: upgrade.name,
      slotType,
      rank: player.getUpgradeRank(upgrade.id),
      maxRank: upgrade.maxRank ?? 1,
      startWeapon: false,
      evolved: existing?.evolved ?? false,
      evolutionId: existing?.evolutionId ?? null
    });
  }

  applyEvolution(upgrade) {
    const recipe = upgrade.evolution;
    const entry = [...this.active.values()].find((item) => item.sourceId === recipe.base);
    if (entry) {
      entry.evolved = true;
      entry.evolutionId = upgrade.id;
      entry.name = upgrade.name;
      entry.rank = 'EVO';
    }
    this.evolutions.set(upgrade.id, {
      id: upgrade.id,
      name: upgrade.name,
      base: recipe.base,
      passive: recipe.passive
    });
  }

  getSnapshot() {
    const cooldowns = this.scene.activeAbilities?.getCooldownStates(this.scene.time.now) ?? {};
    const primaryCooldown = {
      ratio: Math.max(0, Math.min(1, (
        (this.scene.lastShotAt + this.scene.player.fireRate - this.scene.time.now)
        / Math.max(1, this.scene.player.fireRate)
      ))),
      remainingMs: Math.max(0, this.scene.lastShotAt + this.scene.player.fireRate - this.scene.time.now),
      durationMs: this.scene.player.fireRate
    };
    const clone = (entry) => ({
      ...entry,
      cooldown: entry.startWeapon ? primaryCooldown : (cooldowns[entry.sourceId] ?? null)
    });
    return {
      activeSlots: this.activeSlots,
      passiveSlots: this.passiveSlots,
      active: [...this.active.values()].map(clone),
      passive: [...this.passive.values()].map(clone),
      evolutions: [...this.evolutions.values()].map(clone),
      activeFree: Math.max(0, this.activeSlots - this.active.size),
      passiveFree: Math.max(0, this.passiveSlots - this.passive.size)
    };
  }
}
