export const WAVE_DEFINITIONS = [
  { count: 10, interval: 940, pool: [{ weight: 1, enemy: { kind: 'slime' } }] },
  { count: 10, interval: 760, pool: [{ weight: 1, enemy: { kind: 'runner', multiplier: 0.92 } }] },
  {
    count: 12,
    interval: 760,
    pool: [
      { weight: 3, enemy: { kind: 'runner', multiplier: 0.96 } },
      { weight: 1, enemy: { kind: 'brute', multiplier: 0.9 } }
    ]
  },
  {
    count: 15,
    interval: 700,
    pool: [
      { weight: 5, enemy: { kind: 'slime', multiplier: 1.02 } },
      { weight: 4, enemy: { kind: 'runner', multiplier: 0.98 } },
      { weight: 2, enemy: { kind: 'brute', multiplier: 0.95 } }
    ]
  },
  {
    count: 18,
    interval: 760,
    pool: [
      { weight: 4, enemy: { kind: 'runner', multiplier: 1.08 } },
      { weight: 3, enemy: { kind: 'slime', multiplier: 1.1 } },
      { weight: 3, enemy: { kind: 'spitter' } }
    ]
  },
  {
    count: 18,
    interval: 830,
    elites: [{ kind: 'elite-runner' }],
    pool: [
      { weight: 4, enemy: { kind: 'runner', multiplier: 1.1 } },
      { weight: 3, enemy: { kind: 'spitter', multiplier: 1.05 } },
      { weight: 2, enemy: { kind: 'brute', multiplier: 1.08 } }
    ]
  },
  {
    count: 18,
    interval: 830,
    pool: [
      { weight: 4, enemy: { kind: 'slime', multiplier: 1.16 } },
      { weight: 3, enemy: { kind: 'spitter', multiplier: 1.08 } },
      { weight: 2, enemy: { kind: 'fan-spitter' } },
      { weight: 2, enemy: { kind: 'brute', multiplier: 1.1 } }
    ]
  },
  {
    count: 20,
    interval: 760,
    pool: [
      { weight: 4, enemy: { kind: 'runner', multiplier: 1.16 } },
      { weight: 3, enemy: { kind: 'bomber' } },
      { weight: 3, enemy: { kind: 'spitter', multiplier: 1.1 } },
      { weight: 2, enemy: { kind: 'brute', multiplier: 1.15 } }
    ]
  },
  {
    count: 22,
    interval: 730,
    elites: [{ kind: 'elite-brute' }, { kind: 'elite-spitter' }],
    pool: [
      { weight: 4, enemy: { kind: 'runner', multiplier: 1.18 } },
      { weight: 3, enemy: { kind: 'bomber', multiplier: 1.08 } },
      { weight: 3, enemy: { kind: 'fan-spitter', multiplier: 1.08 } },
      { weight: 2, enemy: { kind: 'brute', multiplier: 1.2 } }
    ]
  },
  {
    count: 1,
    interval: 9999,
    bossWave: true,
    elites: [{ kind: 'boss' }],
    pool: []
  }
];
