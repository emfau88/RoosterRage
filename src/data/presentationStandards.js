export const VISUAL_LANGUAGE = Object.freeze({
  player: { primary: '#fff3b0', secondary: '#5ad7ff', purpose: 'Eigene Angriffe und sichere Interaktion' },
  enemy: { primary: '#ff5268', secondary: '#c18aff', purpose: 'Gegnerkoerper und gegnerische Projektile' },
  hazard: { primary: '#ff3048', secondary: '#ff9a3d', purpose: 'Telegraphierte Schadensflaechen und schwere Treffer' },
  pickup: { primary: '#65ef8b', secondary: '#5ad7ff', reward: '#ffd35c', purpose: 'Heilung, Utility und garantierte Belohnung' },
  evolution: { primary: '#ffe16a', secondary: '#ffffff', purpose: 'Vollstaendige EVOs und Bossbelohnungen' }
});

export const AUDIO_PRIORITIES = Object.freeze({
  critical: ['player-hit', 'level-up'],
  reward: ['xp-pickup'],
  ability: ['rocket-explosion', 'lightning', 'laser', 'void-open', 'molotov-impact'],
  weapon: ['egg-shot'],
  impact: ['enemy-hit', 'enemy-pop']
});

export const EFFECT_DEFAULTS = Object.freeze({
  damageNumbers: true,
  screenShake: true,
  screenFlash: true,
  vibration: true
});
