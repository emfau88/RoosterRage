import wind from '../../assets/fx/enemy-auras/aura-wind.webp';
import shield from '../../assets/fx/enemy-auras/aura-shield.webp';
import violet from '../../assets/fx/enemy-auras/aura-regen-violet.webp';
import green from '../../assets/fx/enemy-auras/aura-regen-green.webp';
import danger from '../../assets/fx/enemy-auras/aura-danger.webp';
import royal from '../../assets/fx/enemy-auras/aura-royal.webp';
import manifest from '../../assets/fx/enemy-auras/manifest.json';

export const ENEMY_AURA_ASSETS = { wind, shield, 'regen-violet': violet, 'regen-green': green, danger, royal };
export const ENEMY_AURA_METRICS = Object.fromEntries(manifest.map(asset => [asset.id, asset]));
