// The approved final roosters are the production default. Append
// ?roosterVisual=legacy to roll all of them back, or use ?aceVisual=legacy,
// ?artilleryVisual=legacy, or ?stormVisual=legacy for one character.
// The previous Next and Gameplay generations also remain reversible via
// ?roosterVisual=next or ?roosterVisual=gameplay and the matching
// per-character parameters.
const parameters = typeof window === 'undefined'
  ? new URLSearchParams()
  : new URLSearchParams(window.location.search);
const globalVersion = parameters.get('roosterVisual');
const versionFor = (id) => {
  if (globalVersion === 'legacy') return 'legacy';
  const requested = parameters.get(`${id}Visual`) ?? globalVersion;
  if (requested === 'legacy') return 'legacy';
  if (requested === 'next') return 'next';
  if (requested === 'gameplay') return 'gameplay';
  if (requested === 'final') return 'final';
  return 'final';
};

export const ACE_VISUAL_VERSION = versionFor('ace');
export const ARTILLERY_VISUAL_VERSION = versionFor('artillery');
export const STORM_VISUAL_VERSION = versionFor('storm');
export const USE_NEXT_ACE_VISUAL = ACE_VISUAL_VERSION !== 'legacy';
export const USE_GAMEPLAY_ACE_VISUAL = ACE_VISUAL_VERSION === 'gameplay';
export const USE_FINAL_ACE_VISUAL = ACE_VISUAL_VERSION === 'final';
export const USE_NEXT_ARTILLERY_VISUAL = ARTILLERY_VISUAL_VERSION !== 'legacy';
export const USE_GAMEPLAY_ARTILLERY_VISUAL = ARTILLERY_VISUAL_VERSION === 'gameplay';
export const USE_FINAL_ARTILLERY_VISUAL = ARTILLERY_VISUAL_VERSION === 'final';
export const USE_NEXT_STORM_VISUAL = STORM_VISUAL_VERSION !== 'legacy';
export const USE_GAMEPLAY_STORM_VISUAL = STORM_VISUAL_VERSION === 'gameplay';
export const USE_FINAL_STORM_VISUAL = STORM_VISUAL_VERSION === 'final';
export const USE_NEXT_ROOSTER_VISUAL = Object.freeze({
  ace: USE_NEXT_ACE_VISUAL,
  artillery: USE_NEXT_ARTILLERY_VISUAL,
  storm: USE_NEXT_STORM_VISUAL
});
export const ACE_NEXT_WALK_FRAME_RATE = (USE_FINAL_ACE_VISUAL ? 8 : 4) * 1000 / 520;
export const ACE_NEXT_IDLE_FRAME_RATE = 8 * 1000 / 2800;
export const ARTILLERY_NEXT_WALK_FRAME_RATE = (USE_GAMEPLAY_ARTILLERY_VISUAL || USE_FINAL_ARTILLERY_VISUAL ? 8 : 4) * 1000 / 650;
export const ARTILLERY_NEXT_IDLE_FRAME_RATE = 8 * 1000 / 3200;
export const STORM_NEXT_WALK_FRAME_RATE = (USE_GAMEPLAY_STORM_VISUAL || USE_FINAL_STORM_VISUAL ? 8 * 1000 / 480 : 4 * 1000 / 440);
export const STORM_NEXT_IDLE_FRAME_RATE = 8 * 1000 / 2400;
export const NEXT_ROOSTER_WALK_FRAME_COUNT = Object.freeze({
  ace: USE_FINAL_ACE_VISUAL ? 8 : 4,
  artillery: USE_GAMEPLAY_ARTILLERY_VISUAL || USE_FINAL_ARTILLERY_VISUAL ? 8 : 4,
  storm: USE_GAMEPLAY_STORM_VISUAL || USE_FINAL_STORM_VISUAL ? 8 : 4
});
export const NEXT_ROOSTER_WALK_FRAME_RATE = Object.freeze({
  ace: ACE_NEXT_WALK_FRAME_RATE,
  artillery: ARTILLERY_NEXT_WALK_FRAME_RATE,
  storm: STORM_NEXT_WALK_FRAME_RATE
});
export const NEXT_ROOSTER_IDLE_FRAME_RATE = Object.freeze({
  ace: ACE_NEXT_IDLE_FRAME_RATE,
  artillery: ARTILLERY_NEXT_IDLE_FRAME_RATE,
  storm: STORM_NEXT_IDLE_FRAME_RATE
});
