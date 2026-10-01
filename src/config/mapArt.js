// Original files and the complete classic rendering path stay available.
// Release rollback: VITE_MAP_ART_VERSION=classic npm run build:release.
// Local comparison: ?mapArt=classic (development only).
const requestedVersion = import.meta.env.VITE_MAP_ART_VERSION
  ?? (import.meta.env.DEV && typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('mapArt') : null);
export const MAP_ART_VERSION = requestedVersion === 'classic' ? 'classic' : 'portal-v3';
export const USE_GROUND_VARIANTS = MAP_ART_VERSION !== 'classic';
export const USE_MAP_COLOR_PASS = MAP_ART_VERSION !== 'classic';
export const USE_REFINED_PROPS = MAP_ART_VERSION !== 'classic';

// Multiplicative grading stays inside the existing sprite pipeline. It adds no
// full-screen filter, geometry, collision, or extra scenery objects.
export function getArenaArtTint(arenaId, surface = 'ground') {
  if (!USE_MAP_COLOR_PASS) return 0xffffff;
  if (arenaId === 'vertical-run') return surface === 'edge' ? 0xd0dff2 : 0xe6efff;
  if (arenaId === 'square-coop') return 0xe5e9fa;
  return 0xfffbf0;
}
