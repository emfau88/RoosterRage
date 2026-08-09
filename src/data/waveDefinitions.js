function pressureCurve({ opening = 2, pressure = 4, finale = 5, finalePattern = 'surround' } = {}) {
  return [
    { id: 'build', share: 0.24, durationShare: 0.24, batch: opening, pattern: 'scatter', pauseAfter: 420 },
    { id: 'escalate', share: 0.36, durationShare: 0.31, batch: pressure, pattern: 'pulse', pauseAfter: 520 },
    { id: 'recover', share: 0.12, durationShare: 0.2, batch: 1, pattern: 'scatter', pauseAfter: 620 },
    { id: 'finale', share: 0.28, durationShare: 0.25, batch: finale, pattern: finalePattern, pauseAfter: 0 }
  ];
}

function xpCurve(perEnemy, bossXp = 0) {
  return {
    perEnemy,
    bossXp,
    segmentMultipliers: { build: 0.85, escalate: 1, recover: 1.15, finale: 1.2 }
  };
}

export const WAVE_DEFINITIONS = [
  {
    name: 'First Peck',
    intent: 'Nur Fodder: Bewegung und Auto-Aim unter wachsender Dichte lernen',
    count: 30,
    interval: 500,
    targetDuration: [22, 28],
    targetPeak: 18,
    activeCap: 22,
    mobileActiveCap: 18,
    spawnMinDistance: 300,
    pressureCurve: pressureCurve({ opening: 2, pressure: 3, finale: 4 }),
    xpCurve: xpCurve(3),
    composition: [{ count: 30, enemy: { kind: 'slime' } }]
  },
  {
    name: 'Rush Hour',
    intent: 'Runner-Linien schneiden durch einen kontrollierten Fodder-Strom',
    count: 38,
    interval: 460,
    targetDuration: [22, 28],
    targetPeak: 24,
    activeCap: 29,
    mobileActiveCap: 24,
    spawnMinDistance: 295,
    pressureCurve: pressureCurve({ opening: 2, pressure: 4, finale: 6, finalePattern: 'rusher-line' }),
    xpCurve: xpCurve(3),
    composition: [
      { count: 26, enemy: { kind: 'slime' } },
      { count: 12, enemy: { kind: 'runner' } }
    ]
  },
  {
    name: 'Heavy Company',
    intent: 'Erste Zielprioritaet mit Elite-Abschluss und kurzer Erholung davor',
    count: 46,
    interval: 520,
    targetDuration: [31, 39],
    targetPeak: 28,
    activeCap: 34,
    mobileActiveCap: 28,
    spawnMinDistance: 290,
    pressureCurve: pressureCurve({ opening: 3, pressure: 4, finale: 5 }),
    xpCurve: xpCurve(3),
    elites: [{ kind: 'elite-runner' }],
    composition: [
      { count: 24, enemy: { kind: 'slime' } },
      { count: 17, enemy: { kind: 'runner' } },
      { count: 4, enemy: { kind: 'brute' } }
    ]
  },
  {
    name: 'Crossfire',
    intent: 'Spitter arbeiten hinter einer lesbaren Nahkampfwand',
    count: 55,
    interval: 390,
    targetDuration: [27, 33],
    targetPeak: 32,
    activeCap: 38,
    mobileActiveCap: 32,
    spawnMinDistance: 285,
    pressureCurve: pressureCurve({ opening: 3, pressure: 5, finale: 6 }),
    xpCurve: xpCurve(3),
    composition: [
      { count: 26, enemy: { kind: 'slime' } },
      { count: 14, enemy: { kind: 'runner' } },
      { count: 10, enemy: { kind: 'spitter' } },
      { count: 5, enemy: { kind: 'brute' } }
    ]
  },
  {
    name: 'Firing Line',
    intent: 'Erster echter Crossfire-Druck mit Faechern in der Schlussphase',
    count: 65,
    interval: 380,
    targetDuration: [31, 39],
    targetPeak: 38,
    activeCap: 45,
    mobileActiveCap: 38,
    spawnMinDistance: 280,
    pressureCurve: pressureCurve({ opening: 3, pressure: 5, finale: 7, finalePattern: 'rusher-line' }),
    xpCurve: xpCurve(3),
    composition: [
      { count: 26, enemy: { kind: 'slime' } },
      { count: 16, enemy: { kind: 'runner' } },
      { count: 12, enemy: { kind: 'spitter' } },
      { count: 7, enemy: { kind: 'brute' } },
      { count: 4, enemy: { kind: 'fan-spitter' } }
    ]
  },
  {
    name: 'Elite Pursuit',
    intent: 'Fan-Angriffe, Rusher-Pulse und ein priorisiertes Elite-Ziel',
    count: 76,
    interval: 410,
    targetDuration: [40, 50],
    targetPeak: 45,
    activeCap: 52,
    mobileActiveCap: 45,
    spawnMinDistance: 275,
    pressureCurve: pressureCurve({ opening: 4, pressure: 6, finale: 8, finalePattern: 'rusher-line' }),
    xpCurve: xpCurve(3),
    elites: [{ kind: 'elite-runner' }],
    composition: [
      { count: 28, enemy: { kind: 'slime' } },
      { count: 20, enemy: { kind: 'runner' } },
      { count: 12, enemy: { kind: 'spitter' } },
      { count: 8, enemy: { kind: 'fan-spitter' } },
      { count: 7, enemy: { kind: 'brute' } }
    ]
  },
  {
    name: 'Bombardment',
    intent: 'Bomber-Pulse erzwingen Bewegung zwischen kurzen sicheren Fenstern',
    count: 85,
    interval: 300,
    targetDuration: [31, 39],
    targetPeak: 50,
    activeCap: 58,
    mobileActiveCap: 50,
    spawnMinDistance: 275,
    pressureCurve: pressureCurve({ opening: 4, pressure: 7, finale: 9, finalePattern: 'surround' }),
    xpCurve: xpCurve(4),
    composition: [
      { count: 32, enemy: { kind: 'slime' } },
      { count: 20, enemy: { kind: 'runner' } },
      { count: 12, enemy: { kind: 'bomber' } },
      { count: 10, enemy: { kind: 'fan-spitter' } },
      { count: 7, enemy: { kind: 'spitter' } },
      { count: 4, enemy: { kind: 'brute' } }
    ]
  },
  {
    name: 'Pressure Cooker',
    intent: 'Gemischte Raumkontrolle mit Elite-Fernkaempfer als Abschluss',
    count: 96,
    interval: 320,
    targetDuration: [36, 44],
    targetPeak: 58,
    activeCap: 66,
    mobileActiveCap: 56,
    spawnMinDistance: 270,
    pressureCurve: pressureCurve({ opening: 5, pressure: 8, finale: 10, finalePattern: 'surround' }),
    xpCurve: xpCurve(4),
    elites: [{ kind: 'elite-spitter' }],
    composition: [
      { count: 34, enemy: { kind: 'slime' } },
      { count: 22, enemy: { kind: 'runner' } },
      { count: 14, enemy: { kind: 'bomber' } },
      { count: 10, enemy: { kind: 'spitter' } },
      { count: 8, enemy: { kind: 'fan-spitter' } },
      { count: 7, enemy: { kind: 'brute' } }
    ]
  },
  {
    name: 'Royal Guard',
    intent: 'Maximaler kontrollierter Rollendruck vor dem Finale',
    count: 112,
    interval: 330,
    targetDuration: [45, 55],
    targetPeak: 65,
    activeCap: 74,
    mobileActiveCap: 60,
    spawnMinDistance: 270,
    pressureCurve: pressureCurve({ opening: 5, pressure: 9, finale: 12, finalePattern: 'rusher-line' }),
    xpCurve: xpCurve(4),
    elites: [{ kind: 'elite-brute' }, { kind: 'elite-spitter' }],
    composition: [
      { count: 40, enemy: { kind: 'slime' } },
      { count: 24, enemy: { kind: 'runner' } },
      { count: 14, enemy: { kind: 'bomber' } },
      { count: 12, enemy: { kind: 'fan-spitter' } },
      { count: 10, enemy: { kind: 'brute' } },
      { count: 10, enemy: { kind: 'spitter' } }
    ]
  },
  {
    name: 'The Brood King',
    intent: 'Bossabschnitte, Feuerball und kontrollierte Add-Pulse',
    count: 1,
    interval: 9999,
    targetDuration: [58, 76],
    targetPeak: 45,
    activeCap: 52,
    mobileActiveCap: 45,
    spawnMinDistance: 340,
    pressureCurve: [{ id: 'boss-entry', share: 1, durationShare: 1, batch: 1, pattern: 'scatter', pauseAfter: 0 }],
    xpCurve: xpCurve(3, 120),
    bossWave: true,
    elites: [{ kind: 'boss' }],
    composition: []
  }
];
