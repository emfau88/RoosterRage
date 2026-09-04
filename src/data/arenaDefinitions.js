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
    name: 'Harvest Yard',
    topology: 'open',
    description: 'A sunlit harvest yard with open dodge lanes and small orchards.',
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
    name: 'Feed Alley',
    topology: 'corridor',
    description: 'Tighter sides, clear north-south lanes, and breakable barriers.',
    bounds: { x: 300, y: 44, width: 800, height: 812 },
    streaming: {
      axis: 'vertical',
      worldBounds: { x: 64836, y: 0, width: 1400, height: 131072 },
      playableBounds: { x: 65136, y: 0, width: 800, height: 131072 },
      start: { x: 65536, y: 65536 },
      activeWindow: { width: 800, height: 1100 },
      chunk: { width: 800, height: 600, radiusX: 0, radiusY: 2 },
      groundTexture: 'arena-ground-road',
      portrait: {
        maxViewportWidth: 520,
        worldBounds: { x: 64956, y: 0, width: 1160, height: 131072 },
        playableBounds: { x: 65256, y: 0, width: 560, height: 131072 },
        activeWindow: { width: 560, height: 1600 }
      }
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
    description: 'Short rotations, strong close-range value, and four open corner routes.',
    bounds: { x: 85, y: 45, width: 1230, height: 810 },
    accent: 0xd49a55,
    weaponRatings: { ...sharedRatings, area: 1.2, orbit: 1.2, projectile: 0.9 },
    obstacles: [
      { id: 'square-hay-nw', x: 365, y: 195, width: 116, height: 74, kind: 'bale', texture: 'coop-square-hay-stack', hp: 135 },
      { id: 'square-hay-se', x: 1035, y: 685, width: 116, height: 74, kind: 'bale', texture: 'coop-square-hay-stack', hp: 135 },
      { id: 'square-tractor', x: 346, y: 300, width: 138, height: 112, kind: 'tractor', texture: 'coop-square-tractor', solid: true },
      { id: 'square-trough-west', x: 347, y: 563, width: 118, height: 66, kind: 'trough', texture: 'coop-square-trough', solid: true },
      { id: 'square-trough-east', x: 1050, y: 425, width: 118, height: 66, kind: 'trough', texture: 'coop-square-trough', solid: true },
      { id: 'square-crate-north', x: 915, y: 245, width: 68, height: 68, kind: 'crate', hp: 105 },
      { id: 'square-crate-south', x: 480, y: 650, width: 68, height: 68, kind: 'crate', hp: 105 },
      { id: 'square-bale-north', x: 515, y: 245, width: 116, height: 74, kind: 'bale', texture: 'coop-square-hay-stack', hp: 135 },
      { id: 'square-bale-south', x: 885, y: 650, width: 116, height: 74, kind: 'bale', texture: 'coop-square-hay-stack', hp: 135 }
    ]
  }
];

export function getArenaDefinition(id = 'open-yard') {
  return ARENA_DEFINITIONS.find((arena) => arena.id === id) ?? ARENA_DEFINITIONS[0];
}
