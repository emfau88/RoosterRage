// Build-time aliases package only the selected Ace; all rollback files stay in Git.
import aceWalk from '@ace-production-walk';
import aceIdle from '@ace-production-idle';
import artilleryWalk from '../../assets/characters/artillery-final/rooster-artillery-final-walk.webp';
import artilleryIdle from '../../assets/characters/artillery-final/rooster-artillery-final-idle.webp';
import stormWalk from '../../assets/characters/storm-final/rooster-storm-final-walk.webp';
import stormIdle from '../../assets/characters/storm-final/rooster-storm-final-idle.webp';

export const ROOSTER_ASSET_URLS = Object.freeze({
  ace: { walk: aceWalk, idle: aceIdle },
  artillery: { walk: artilleryWalk, idle: artilleryIdle },
  storm: { walk: stormWalk, idle: stormIdle }
});
