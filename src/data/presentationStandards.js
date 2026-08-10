export const VISUAL_LANGUAGE = Object.freeze({
  player: { primary: '#fff3b0', secondary: '#5ad7ff', purpose: 'Eigene Angriffe und sichere Interaktion' },
  enemy: { primary: '#ff5268', secondary: '#c18aff', purpose: 'Gegnerkoerper und gegnerische Projektile' },
  hazard: { primary: '#ff3048', secondary: '#ff9a3d', purpose: 'Telegraphierte Schadensflaechen und schwere Treffer' },
  pickup: { primary: '#65ef8b', secondary: '#5ad7ff', reward: '#ffd35c', purpose: 'Heilung, Utility und garantierte Belohnung' },
  evolution: { primary: '#ffe16a', secondary: '#ffffff', purpose: 'Vollstaendige EVOs und Bossbelohnungen' }
});

export const AUDIO_PRIORITIES = Object.freeze({
  critical: ['player-hurt', 'second-wind', 'level-up', 'evolution', 'boss-phase'],
  reward: ['xp-pickup', 'upgrade-select', 'chest-reward', 'pickup-heal', 'pickup-magnet', 'pickup-bomb', 'victory'],
  ability: ['rocket-launch', 'rocket-explosion', 'lightning', 'lightning-chain', 'laser', 'void-open', 'molotov-impact'],
  weapon: ['egg-launch-ace', 'egg-launch-artillery', 'egg-launch-storm', 'egg-impact'],
  impact: ['enemy-hit', 'enemy-pop', 'spitter-shot', 'brute-stomp', 'bomber-explosion']
});

export const EFFECT_DEFAULTS = Object.freeze({
  damageNumbers: true,
  screenShake: true,
  screenFlash: true,
  vibration: true
});
