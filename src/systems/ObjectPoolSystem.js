const DEFAULT_LIMITS = {
  enemy: 140,
  projectile: 320,
  enemyProjectile: 240,
  xpOrb: 220,
  fx: 90
};

export class ObjectPoolSystem {
  constructor(scene, limits = {}) {
    this.scene = scene;
    this.limits = { ...DEFAULT_LIMITS, ...limits };
    this.pools = new Map();
    this.activeFx = 0;
    this.peakFx = 0;
    this.droppedFx = 0;
  }

  acquire(key, create, reset) {
    const pool = this.getPool(key);
    if (pool.active.size >= pool.limit) {
      pool.dropped += 1;
      return null;
    }

    const item = pool.free.pop() ?? create();
    if (item.__poolCreated) {
      pool.reused += 1;
    } else {
      item.__poolCreated = true;
      pool.created += 1;
    }
    item.__poolKey = key;
    item.__poolActive = true;
    pool.active.add(item);
    pool.peak = Math.max(pool.peak, pool.active.size);
    reset(item);
    return item;
  }

  release(item) {
    const key = item?.__poolKey;
    const pool = key ? this.pools.get(key) : null;
    if (!pool || !item.__poolActive) {
      return false;
    }
    item.__poolActive = false;
    pool.active.delete(item);
    item.deactivate();
    pool.free.push(item);
    return true;
  }

  acquireFx(priority = false) {
    const limit = this.limits.fx + (priority ? 12 : 0);
    if (this.activeFx >= limit) {
      this.droppedFx += 1;
      return false;
    }
    this.activeFx += 1;
    this.peakFx = Math.max(this.peakFx, this.activeFx);
    return true;
  }

  releaseFx() {
    this.activeFx = Math.max(0, this.activeFx - 1);
  }

  createFx(create, priority = false) {
    if (!this.acquireFx(priority)) {
      return null;
    }
    let released = false;
    const release = () => {
      if (released) {
        return;
      }
      released = true;
      this.releaseFx();
    };
    try {
      const item = create();
      if (!item) {
        release();
        return null;
      }
      item.once?.('destroy', release);
      return item;
    } catch (error) {
      release();
      throw error;
    }
  }

  setLimit(key, limit) {
    const normalized = Math.max(0, Math.floor(limit));
    this.limits[key] = normalized;
    if (key === 'fx') {
      return normalized;
    }
    this.getPool(key).limit = normalized;
    return normalized;
  }

  getPool(key) {
    if (!this.pools.has(key)) {
      this.pools.set(key, {
        limit: this.limits[key] ?? 100,
        created: 0,
        reused: 0,
        dropped: 0,
        peak: 0,
        active: new Set(),
        free: []
      });
    }
    return this.pools.get(key);
  }

  getStats() {
    const pools = {};
    this.pools.forEach((pool, key) => {
      pools[key] = {
        limit: pool.limit,
        created: pool.created,
        reused: pool.reused,
        dropped: pool.dropped,
        peak: pool.peak,
        active: pool.active.size,
        free: pool.free.length
      };
    });
    pools.fx = {
      limit: this.limits.fx,
      created: null,
      reused: null,
      dropped: this.droppedFx,
      peak: this.peakFx,
      active: this.activeFx,
      free: null
    };
    pools.total = {
      limit: Object.values(this.limits).reduce((sum, value) => sum + value, 0),
      created: Object.values(pools).reduce((sum, pool) => sum + (pool.created ?? 0), 0),
      reused: Object.values(pools).reduce((sum, pool) => sum + (pool.reused ?? 0), 0),
      dropped: Object.values(pools).reduce((sum, pool) => sum + (pool.dropped ?? 0), 0),
      peak: Object.values(pools).reduce((sum, pool) => sum + (pool.peak ?? 0), 0),
      active: Object.values(pools).reduce((sum, pool) => sum + (pool.active ?? 0), 0),
      free: Object.values(pools).reduce((sum, pool) => sum + (pool.free ?? 0), 0)
    };
    return pools;
  }

  destroy() {
    this.pools.forEach((pool) => {
      [...pool.active, ...pool.free].forEach((item) => item.dispose());
      pool.active.clear();
      pool.free.length = 0;
    });
    this.pools.clear();
    this.activeFx = 0;
  }
}
