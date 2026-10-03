function pressureCurve({ opening = 2, pressure = 4, finale = 5, finalePattern = 'surround' } = {}) {
  return [
    { id: 'build', share: 0.24, durationShare: 0.24, batch: opening, pattern: 'scatter', pauseAfter: 420 },
    { id: 'escalate', share: 0.36, durationShare: 0.31, batch: pressure, pattern: 'pulse', pauseAfter: 520 },
    { id: 'recover', share: 0.12, durationShare: 0.2, batch: 1, pattern: 'scatter', pauseAfter: 620 },
    { id: 'finale', share: 0.28, durationShare: 0.25, batch: finale, pattern: finalePattern, pauseAfter: 0 }
  ];
}

function xpCurve(budget, bossXp = 0, segmentShares = null) {
  return {
    budget,
    bossXp,
    ...(segmentShares ? { segmentShares } : {})
  };
}

export const WAVE_DEFINITIONS = [
  {
    name: 'First Peck',
    intent: 'Fodder only: learn movement and auto-aim as the flock thickens',
    count: 24,
    interval: 500,
    targetDuration: [22, 28],
    // Let the controlled adaptive advances consume the upper end of the
    // player-facing window rather than shortening the Wave below 22 seconds.
    directorTargetDurationMs: { desktop: 27600, portrait: 28900 },
    targetPeak: 18,
    activeCap: 20,
    mobileActiveCap: 18,
    // The camera-rim fallback must remain viable on portrait while the player
    // is close to an edge; 220 keeps the first foe outside the personal zone.
    spawnMinDistance: 220,
    // The player bot begins by drifting up-left. Lead with that movement so
    // the first threat crosses into view instead of trailing behind it.
    spawnPlayerLeading: true,
    spawnEdgePreference: 'nearest-safe',
    spawnApproachDistance: 64,
    // Escalation consists of single pulses; stage them at the inner rim so a
    // portrait player never clears one before the next pulse becomes visible.
    spawnPulseApproachDistance: 64,
    spawnTargetBuffer: 2,
    primaryRoles: [],
    pressureCurve: [
      { id: 'build', share: 0.25, durationShare: 0.25, batch: 1, pattern: 'scatter', pauseAfter: 300 },
      { id: 'escalate', share: 0.35, durationShare: 0.3, batch: 1, pattern: 'pulse', pauseAfter: 420 },
      { id: 'recover', share: 0.15, durationShare: 0.18, batch: 1, pattern: 'scatter', pauseAfter: 480 },
      { id: 'finale', share: 0.25, durationShare: 0.27, batch: 1, pattern: 'surround', pauseAfter: 0 }
    ],
    // End one XP short of the first level so the first Wave-2 contact, rather
    // than route-dependent orb cleanup, opens the first upgrade choice.
    xpCurve: xpCurve(44, 0, [0.4, 0.34, 0.1, 0.16]),
    composition: [
      { count: 15, enemy: { kind: 'slime' } },
      { count: 9, enemy: { kind: 'kornkrabbler' } }
    ]
  },
  {
    name: 'Rush Hour',
    intent: 'Runner lines cut through a controlled stream of fodder',
    count: 62,
    interval: 460,
    targetDuration: [22, 28],
    targetPeak: 42,
    activeCap: 45,
    mobileActiveCap: 36,
    spawnMinDistance: 295,
    primaryRoles: ['runner'],
    pressureCurve: pressureCurve({ opening: 2, pressure: 4, finale: 6, finalePattern: 'rusher-line' }),
    // Recover the deferred opening XP early in Wave 2 so slow profiles and
    // portrait movement reach the first decision before the 32-second cap.
    xpCurve: xpCurve(159, 0, [0.28, 0.34, 0.14, 0.24]),
    composition: [
      { count: 26, enemy: { kind: 'slime' } },
      { count: 24, enemy: { kind: 'kornkrabbler' } },
      { count: 12, enemy: { kind: 'runner' } }
    ]
  },
  {
    name: 'Heavy Company',
    intent: 'First target-priority test, with a brief recovery before the elite finish',
    count: 78,
    interval: 520,
    targetDuration: [31, 39],
    targetPeak: 52,
    activeCap: 56,
    mobileActiveCap: 44,
    spawnMinDistance: 290,
    primaryRoles: ['runner', 'tank'],
    pressureCurve: pressureCurve({ opening: 3, pressure: 4, finale: 5 }),
    xpCurve: xpCurve(138),
    elites: [{ kind: 'elite-runner' }],
    composition: [
      { count: 24, enemy: { kind: 'slime' } },
      { count: 32, enemy: { kind: 'kornkrabbler' } },
      { count: 17, enemy: { kind: 'runner' } },
      { count: 4, enemy: { kind: 'brute' } }
    ]
  },
  {
    name: 'Crossfire',
    intent: 'Spitters operate behind a readable melee wall',
    count: 92,
    interval: 390,
    targetDuration: [27, 33],
    targetPeak: 62,
    activeCap: 66,
    mobileActiveCap: 50,
    spawnMinDistance: 285,
    primaryRoles: ['runner', 'shooter'],
    pressureCurve: pressureCurve({ opening: 3, pressure: 5, finale: 6 }),
    xpCurve: xpCurve(165),
    composition: [
      { count: 36, enemy: { kind: 'slime' } },
      { count: 37, enemy: { kind: 'kornkrabbler' } },
      { count: 14, enemy: { kind: 'runner' } },
      { count: 5, enemy: { kind: 'spitter' } }
    ]
  },
  {
    name: 'Firing Line',
    intent: 'First real crossfire pressure, with fan shots in the final phase',
    count: 112,
    interval: 380,
    targetDuration: [31, 39],
    targetPeak: 76,
    activeCap: 82,
    mobileActiveCap: 58,
    spawnMinDistance: 280,
    primaryRoles: ['runner', 'area-denial', 'tank'],
    pressureCurve: pressureCurve({ opening: 3, pressure: 5, finale: 7, finalePattern: 'rusher-line' }),
    xpCurve: xpCurve(195),
    composition: [
      { count: 40, enemy: { kind: 'slime' } },
      { count: 47, enemy: { kind: 'kornkrabbler' } },
      { count: 16, enemy: { kind: 'runner' } },
      { count: 5, enemy: { kind: 'fan-spitter' } },
      { count: 4, enemy: { kind: 'brute' } }
    ]
  },
  {
    name: 'Elite Pursuit',
    intent: 'A Chili champion introduces a volley, followed by the armored Turkey finale',
    count: 132,
    interval: 410,
    targetDuration: [40, 50],
    targetPeak: 90,
    activeCap: 96,
    mobileActiveCap: 66,
    spawnMinDistance: 275,
    primaryRoles: ['runner', 'area-denial', 'tank'],
    pressureCurve: pressureCurve({ opening: 4, pressure: 6, finale: 8, finalePattern: 'rusher-line' }),
    xpCurve: xpCurve(228),
    // Intro Turkey keeps the replaced early Goose's 360 HP; later Turkey
    // retains full strength. Its pose, slam and armor aura are unchanged.
    elites: [{ kind: 'elite-brute', multiplier: 0.8 }],
    composition: [
      { count: 36, enemy: { kind: 'slime' } },
      { count: 56, enemy: { kind: 'kornkrabbler' } },
      { count: 23, enemy: { kind: 'runner' } },
      { count: 1, enemy: { kind: 'champion-spitter' } },
      { count: 6, enemy: { kind: 'fan-spitter' } },
      { count: 9, enemy: { kind: 'brute' } }
    ]
  },
  {
    name: 'Bombardment',
    intent: 'Bomber pulses force movement between short safe windows',
    count: 156,
    interval: 300,
    targetDuration: [31, 39],
    targetPeak: 105,
    activeCap: 112,
    mobileActiveCap: 74,
    spawnMinDistance: 275,
    primaryRoles: ['exploder', 'area-denial', 'summoner'],
    pressureCurve: pressureCurve({ opening: 4, pressure: 7, finale: 9, finalePattern: 'surround' }),
    xpCurve: xpCurve(340),
    composition: [
      { count: 53, enemy: { kind: 'slime' } },
      { count: 71, enemy: { kind: 'kornkrabbler' } },
      { count: 20, enemy: { kind: 'bomber' } },
      { count: 5, enemy: { kind: 'fan-spitter' } },
      { count: 5, enemy: { kind: 'support' } },
      { count: 2, enemy: { kind: 'summoner' } }
    ]
  },
  {
    name: 'Pressure Cooker',
    intent: 'Mixed area control capped by an elite ranged threat',
    count: 180,
    interval: 320,
    targetDuration: [36, 44],
    targetPeak: 120,
    activeCap: 128,
    mobileActiveCap: 82,
    spawnMinDistance: 270,
    primaryRoles: ['runner', 'shooter', 'summoner'],
    pressureCurve: pressureCurve({ opening: 5, pressure: 8, finale: 10, finalePattern: 'surround' }),
    xpCurve: xpCurve(384),
    elites: [{ kind: 'elite-spitter' }],
    composition: [
      { count: 57, enemy: { kind: 'slime' } },
      { count: 84, enemy: { kind: 'kornkrabbler' } },
      { count: 23, enemy: { kind: 'runner' } },
      { count: 1, enemy: { kind: 'champion-charger' } },
      { count: 6, enemy: { kind: 'spitter' } },
      { count: 6, enemy: { kind: 'support' } },
      { count: 2, enemy: { kind: 'summoner' } }
    ]
  },
  {
    name: 'Royal Guard',
    intent: 'Maximum controlled role pressure before the finale',
    count: 210,
    interval: 330,
    targetDuration: [45, 55],
    targetPeak: 140,
    activeCap: 148,
    mobileActiveCap: 90,
    spawnMinDistance: 270,
    primaryRoles: ['tank', 'area-denial', 'summoner'],
    pressureCurve: pressureCurve({ opening: 5, pressure: 9, finale: 12, finalePattern: 'rusher-line' }),
    xpCurve: xpCurve(448),
    elites: [{ kind: 'elite-brute' }],
    composition: [
      { count: 77, enemy: { kind: 'slime' } },
      { count: 98, enemy: { kind: 'kornkrabbler' } },
      { count: 20, enemy: { kind: 'brute' } },
      { count: 6, enemy: { kind: 'fan-spitter' } },
      { count: 6, enemy: { kind: 'support' } },
      { count: 2, enemy: { kind: 'summoner' } }
    ]
  },
  {
    name: 'The Brood King',
    intent: 'Boss phases, fireball, and controlled add pulses',
    count: 1,
    interval: 9999,
    targetDuration: [58, 76],
    targetPeak: 45,
    activeCap: 52,
    mobileActiveCap: 45,
    spawnMinDistance: 340,
    primaryRoles: ['boss'],
    pressureCurve: [{ id: 'boss-entry', share: 1, durationShare: 1, batch: 1, pattern: 'scatter', pauseAfter: 0 }],
    xpCurve: xpCurve(0, 120),
    bossWave: true,
    elites: [{ kind: 'boss' }],
    composition: []
  }
];
