// Build-time aliases package only the selected Ace; all rollback files stay in Git.
import aceWalk from '@ace-production-walk';
import aceIdle from '@ace-production-idle';
import artilleryWalk from '../../assets/characters/artillery-final/rooster-artillery-final-walk.webp';
import artilleryIdle from '../../assets/characters/artillery-final/rooster-artillery-final-idle.webp';
import stormAssets from '@storm-production-assets';

export const ROOSTER_ASSET_URLS = Object.freeze({
  ace: { walk: aceWalk, idle: aceIdle },
  artillery: { walk: artilleryWalk, idle: artilleryIdle },
  storm: stormAssets
});
