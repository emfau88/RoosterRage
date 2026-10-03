// Visual-only overlay: the running Phaser animation remains the locomotion clock.
export const STORM_ATTACK_DURATION_MS = 220;
export function stormAttackStage(elapsed) {
  if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed >= STORM_ATTACK_DURATION_MS) return null;
  return elapsed < 45 || elapsed >= 160 ? 0 : 1;
}
export function stormAttackFrame(baseFrame, elapsed) {
  const stage = stormAttackStage(elapsed);
  const base = Number(baseFrame);
  const row = Math.floor(base / 8);
  const sourceRow = row === 0 ? 0 : row === 3 ? 2 : 1;
  return stage === null ? null : sourceRow * 8 + base % 8 + stage * 24;
}
