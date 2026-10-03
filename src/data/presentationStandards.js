export const VISUAL_LANGUAGE = Object.freeze({
  player: { primary: '#fff3b0', secondary: '#5ad7ff', purpose: 'Player attacks and safe interactions' },
  enemy: { primary: '#ff5268', secondary: '#c18aff', purpose: 'Enemy bodies and elemental colors for standard projectiles and trails' },
  hazard: { primary: '#ff3048', secondary: '#ff9a3d', purpose: 'Dominant telegraphs, heavy projectiles, and large damage zones' },
  pickup: { primary: '#65ef8b', secondary: '#5ad7ff', reward: '#ffd35c', purpose: 'Healing, utility, and guaranteed rewards' },
  evolution: { primary: '#ffe16a', secondary: '#ffffff', purpose: 'Completed EVOs and boss rewards' }
});

export const AUDIO_PRIORITIES = Object.freeze({
  danger: ['enemy-dash', 'boss-fireball', 'brute-stomp', 'bomber-explosion'],
  critical: ['player-hurt', 'second-wind', 'level-up', 'evolution', 'boss-phase'],
  reward: ['xp-pickup', 'upgrade-select', 'chest-reward', 'pickup-heal', 'pickup-magnet', 'pickup-bomb', 'victory'],
  ability: ['orbit-contact', 'blast-shell-impact', 'rocket-launch', 'rocket-explosion', 'lightning', 'lightning-chain', 'laser', 'void-open', 'molotov-impact'],
  weapon: ['egg-launch-ace', 'egg-launch-artillery', 'egg-launch-storm', 'egg-impact'],
  impact: ['enemy-hit', 'enemy-pop', 'spitter-shot']
});

export const EFFECT_DEFAULTS = Object.freeze({
  enemyHealthBarsAlways: false,
  damageNumbers: true,
  screenShake: true,
  screenFlash: true,
  vibration: true
});
