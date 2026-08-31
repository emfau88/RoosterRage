// The new Ace is the default. Append ?aceVisual=legacy to any local game URL
// for an immediate rollback without deleting or renaming either asset set.
const requestedVersion = typeof window === 'undefined'
  ? null
  : new URLSearchParams(window.location.search).get('aceVisual');

export const ACE_VISUAL_VERSION = requestedVersion === 'legacy' ? 'legacy' : 'next';
export const USE_NEXT_ACE_VISUAL = ACE_VISUAL_VERSION === 'next';
export const ACE_NEXT_WALK_FRAME_RATE = 4 * 1000 / 520;
export const ACE_NEXT_IDLE_FRAME_RATE = 8 * 1000 / 2800;
