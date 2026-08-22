export const BLAST_SHELL_VISUALS = {
  1: {
    visualRank: 1,
    texture: 'heavy-egg',
    scale: 1.34,
    tint: 0xffffff,
    trailVisible: false,
    lineTrailLength: 10,
    lineTrailWidth: 1.8,
    lineTrailColor: 0xff8a35,
    lineTrailAlpha: 0.1,
    impactStyle: 'blast-shell'
  },
  2: {
    visualRank: 2,
    texture: 'heavy-egg',
    scale: 1.5,
    tint: 0xffe2b8,
    trailVisible: false,
    lineTrailLength: 14,
    lineTrailWidth: 2.2,
    lineTrailColor: 0xffa044,
    lineTrailAlpha: 0.13,
    spritePulseX: 0.006,
    spritePulseY: 0.01,
    spritePulseMs: 340,
    spriteFlickerAlpha: 0.008,
    impactStyle: 'blast-shell'
  },
  3: {
    visualRank: 3,
    texture: 'heavy-egg',
    scale: 1.58,
    tint: 0xffc975,
    trailVisible: false,
    lineTrailLength: 18,
    lineTrailWidth: 2.5,
    lineTrailColor: 0xffb34f,
    lineTrailAlpha: 0.16,
    spritePulseX: 0.008,
    spritePulseY: 0.015,
    spritePulseMs: 310,
    spriteFlickerAlpha: 0.012,
    impactStyle: 'blast-shell'
  },
  4: {
    visualRank: 4,
    texture: 'heavy-egg',
    scale: 1.74,
    tint: 0xfff1c4,
    trailVisible: false,
    lineTrailLength: 24,
    lineTrailWidth: 3,
    lineTrailColor: 0xffd35c,
    lineTrailAlpha: 0.2,
    spritePulseX: 0.01,
    spritePulseY: 0.018,
    spritePulseMs: 280,
    spriteFlickerAlpha: 0.016,
    impactStyle: 'blast-shell'
  }
};

export const STORM_EGG_VISUALS = {
  1: {
    visualRank: 1,
    texture: 'storm-egg',
    scale: 0.94,
    tint: 0xffffff,
    trailVisible: false,
    lineTrailLength: 8,
    lineTrailWidth: 1,
    lineTrailColor: 0x5ad7ff,
    lineTrailAlpha: 0.08,
    spritePulseX: 0.01,
    spritePulseY: 0.018,
    spritePulseMs: 250,
    spriteFlickerAlpha: 0.012,
    chainOuterWidth: 4,
    chainInnerWidth: 1.6,
    chainOuterColor: 0xeefcff,
    chainInnerColor: 0x5ad7ff,
    chainLife: 125
  },
  2: {
    visualRank: 2,
    texture: 'storm-egg',
    scale: 1.04,
    tint: 0xe9ffff,
    trailVisible: false,
    lineTrailLength: 11,
    lineTrailWidth: 1.2,
    lineTrailColor: 0x72e6ff,
    lineTrailAlpha: 0.11,
    spritePulseX: 0.015,
    spritePulseY: 0.026,
    spritePulseMs: 235,
    spriteFlickerAlpha: 0.016,
    chainOuterWidth: 4.5,
    chainInnerWidth: 1.8,
    chainOuterColor: 0xeefcff,
    chainInnerColor: 0x72e6ff,
    chainLife: 140
  },
  3: {
    visualRank: 3,
    texture: 'storm-egg',
    scale: 1.12,
    tint: 0xcffbff,
    trailVisible: false,
    lineTrailLength: 14,
    lineTrailWidth: 1.45,
    lineTrailColor: 0x8deeff,
    lineTrailAlpha: 0.14,
    spritePulseX: 0.02,
    spritePulseY: 0.038,
    spritePulseMs: 215,
    spriteFlickerAlpha: 0.022,
    chainOuterWidth: 5,
    chainInnerWidth: 2.2,
    chainOuterColor: 0xf4ffff,
    chainInnerColor: 0x7eeaff,
    chainLife: 155
  },
  4: {
    visualRank: 4,
    texture: 'storm-egg',
    scale: 1.22,
    tint: 0xf5ffff,
    trailVisible: false,
    lineTrailLength: 18,
    lineTrailWidth: 1.8,
    lineTrailColor: 0x9ff7ff,
    lineTrailAlpha: 0.18,
    spritePulseX: 0.025,
    spritePulseY: 0.05,
    spritePulseMs: 195,
    spriteFlickerAlpha: 0.03,
    chainOuterWidth: 6,
    chainInnerWidth: 2.6,
    chainOuterColor: 0xffffff,
    chainInnerColor: 0x9ff7ff,
    chainLife: 175
  }
};

export function applyBlastShellVisual(primaryAttack, rank) {
  Object.assign(primaryAttack, BLAST_SHELL_VISUALS[Math.min(4, Math.max(1, rank))]);
}

export function applyStormEggVisual(primaryAttack, rank) {
  Object.assign(primaryAttack, STORM_EGG_VISUALS[Math.min(4, Math.max(1, rank))]);
}
