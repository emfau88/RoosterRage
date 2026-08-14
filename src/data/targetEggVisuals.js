export const TARGET_EGG_VISUALS = {
  1: {
    visualRank: 1,
    texture: 'egg',
    scale: 1,
    tint: 0xffffff,
    trailVisible: false,
    lineTrailLength: 0,
    muzzleFlash: false
  },
  2: {
    visualRank: 2,
    texture: 'egg',
    scale: 1.14,
    tint: 0xfff3c4,
    trailVisible: false,
    lineTrailLength: 10,
    lineTrailWidth: 1,
    lineTrailColor: 0xffe8a1,
    lineTrailAlpha: 0.06,
    muzzleFlash: false
  },
  3: {
    visualRank: 3,
    texture: 'egg',
    scale: 1.27,
    tint: 0xffdfa0,
    trailVisible: false,
    lineTrailLength: 14,
    lineTrailWidth: 1.2,
    lineTrailColor: 0xffc95a,
    lineTrailAlpha: 0.09,
    muzzleFlash: false
  },
  4: {
    visualRank: 4,
    texture: 'egg',
    scale: 1.42,
    tint: 0xffcf72,
    trailVisible: false,
    lineTrailLength: 18,
    lineTrailWidth: 1.4,
    lineTrailColor: 0xffa62f,
    lineTrailAlpha: 0.12,
    muzzleFlash: false
  }
};

export const SUNSHOT_ARRAY_VISUAL = {
  visualRank: 'EVO',
  projectileScale: 1.16,
  tint: 0xffffff,
  trailVisible: false,
  lineTrailLength: 0,
  lineTrailWidth: 1,
  lineTrailAlpha: 0,
  muzzleFlash: false
};

export function applyTargetEggVisual(primaryAttack, rank) {
  Object.assign(primaryAttack, TARGET_EGG_VISUALS[Math.min(4, Math.max(1, rank))]);
}
