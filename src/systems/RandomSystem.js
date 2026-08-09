const DEFAULT_SEED = 0x6d2b79f5;

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizeSeed(seed) {
  if (Number.isFinite(seed)) {
    return (Math.trunc(seed) >>> 0) || DEFAULT_SEED;
  }
  return hashString(String(seed ?? DEFAULT_SEED)) || DEFAULT_SEED;
}

export class RandomSystem {
  constructor(seed = DEFAULT_SEED) {
    this.setSeed(seed);
  }

  setSeed(seed) {
    this.seed = normalizeSeed(seed);
    this.states = new Map();
    return this.seed;
  }

  next(channel = 'gameplay') {
    let state = this.states.get(channel);
    if (state === undefined) {
      state = (this.seed ^ hashString(channel)) >>> 0;
    }
    state = (state + 0x6d2b79f5) >>> 0;
    this.states.set(channel, state);
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  float(min = 0, max = 1, channel = 'gameplay') {
    return min + (max - min) * this.next(channel);
  }

  int(min, max, channel = 'gameplay') {
    const low = Math.ceil(Math.min(min, max));
    const high = Math.floor(Math.max(min, max));
    return Math.floor(this.next(channel) * (high - low + 1)) + low;
  }

  chance(probability, channel = 'gameplay') {
    return this.next(channel) < probability;
  }

  pick(items, channel = 'gameplay') {
    if (!items.length) {
      return null;
    }
    return items[this.int(0, items.length - 1, channel)];
  }

  shuffle(items, channel = 'gameplay') {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = this.int(0, index, channel);
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  }

  getState() {
    return {
      seed: this.seed,
      channels: Object.fromEntries(this.states)
    };
  }
}
