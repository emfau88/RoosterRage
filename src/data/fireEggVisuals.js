export const FIRE_EGG_VISUALS = {
  1: {
    fireVisualRank: 1,
    texture: 'fire-egg',
    scaleMultiplier: 1,
    spritePulseX: 0.008,
    spritePulseY: 0.024,
    spritePulseMs: 270,
    spriteFlickerAlpha: 0.018,
    lineTrailColor: 0xff6a28
  },
  2: {
    fireVisualRank: 2,
    texture: 'fire-egg',
    scaleMultiplier: 1.12,
    spritePulseX: 0.014,
    spritePulseY: 0.04,
    spritePulseMs: 235,
    spriteFlickerAlpha: 0.028,
    lineTrailColor: 0xff8a24
  },
  3: {
    fireVisualRank: 3,
    texture: 'fire-egg-r3',
    scaleMultiplier: 1.1,
    spritePulseX: 0.02,
    spritePulseY: 0.055,
    spritePulseMs: 205,
    spriteFlickerAlpha: 0.04,
    lineTrailColor: 0xffb52f
  }
};

export function getFireEggVisual(rank) {
  return FIRE_EGG_VISUALS[Math.min(3, Math.max(1, rank))];
}
