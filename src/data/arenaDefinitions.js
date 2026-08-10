const sharedRatings = {
  projectile: 1,
  pierce: 1,
  area: 1,
  orbit: 1,
  companion: 1
};

export const ARENA_DEFINITIONS = [
  {
    id: 'open-yard',
    name: 'Open Yard',
    topology: 'open',
    description: 'Breite Ausweichlinien und lange Schussachsen.',
    bounds: { x: 44, y: 44, width: 1312, height: 812 },
    streaming: {
      axis: 'both',
      worldBounds: { x: 0, y: 0, width: 131072, height: 131072 },
      start: { x: 65536, y: 65536 },
      activeWindow: { width: 1600, height: 1100 },
      chunk: { width: 700, height: 700, radiusX: 2, radiusY: 2 },
      groundTexture: 'arena-ground-farm'
    },
    accent: 0x86c85a,
    weaponRatings: { ...sharedRatings, projectile: 1.2, companion: 1.1 },
    obstacles: [
      { id: 'open-crate-nw', x: 360, y: 255, width: 70, height: 70, kind: 'crate', hp: 90 },
      { id: 'open-crate-se', x: 1040, y: 645, width: 70, height: 70, kind: 'crate', hp: 90 }
    ]
  },
  {
    id: 'vertical-run',
    name: 'Vertical Run',
    topology: 'corridor',
    description: 'Engere Seiten, klare Nord-Sued-Linien und durchbrechbare Sperren.',
    bounds: { x: 300, y: 44, width: 800, height: 812 },
    streaming: {
      axis: 'vertical',
      worldBounds: { x: 64836, y: 0, width: 1400, height: 131072 },
      playableBounds: { x: 65136, y: 0, width: 800, height: 131072 },
      start: { x: 65536, y: 65536 },
      activeWindow: { width: 800, height: 1100 },
      chunk: { width: 800, height: 600, radiusX: 0, radiusY: 2 },
      groundTexture: 'arena-ground-road'
    },
    accent: 0x58b9d8,
    weaponRatings: { ...sharedRatings, pierce: 1.25, projectile: 0.9 },
    obstacles: [
      { id: 'corridor-left-wall', x: 146, y: 450, width: 292, height: 900, kind: 'wall', solid: true },
      { id: 'corridor-right-wall', x: 1254, y: 450, width: 292, height: 900, kind: 'wall', solid: true },
      { id: 'corridor-gate-north', x: 520, y: 315, width: 120, height: 52, kind: 'bale', hp: 130 },
      { id: 'corridor-gate-south', x: 880, y: 585, width: 120, height: 52, kind: 'bale', hp: 130 }
    ]
  },
  {
    id: 'square-coop',
    name: 'Coop Square',
    topology: 'compact-square',
    description: 'Kurze Rotationen, hoher Nahbereichswert und vier offene Eckrouten.',
    bounds: { x: 250, y: 120, width: 900, height: 660 },
    accent: 0xd49a55,
    weaponRatings: { ...sharedRatings, area: 1.2, orbit: 1.2, projectile: 0.9 },
    obstacles: [
      { id: 'square-nw', x: 445, y: 305, width: 76, height: 76, kind: 'crate', hp: 105 },
      { id: 'square-ne', x: 955, y: 305, width: 76, height: 76, kind: 'crate', hp: 105 },
      { id: 'square-sw', x: 445, y: 595, width: 76, height: 76, kind: 'crate', hp: 105 },
      { id: 'square-se', x: 955, y: 595, width: 76, height: 76, kind: 'crate', hp: 105 }
    ]
  }
];

export function getArenaDefinition(id = 'open-yard') {
  return ARENA_DEFINITIONS.find((arena) => arena.id === id) ?? ARENA_DEFINITIONS[0];
}
