import aceLegacyWalk from '../../assets/characters/rooster-ace-walk-v2.webp';
import aceNextWalk from '../../assets/characters/ace-next/rooster-ace-next-walk.webp';
import aceNextIdle from '../../assets/characters/ace-next/rooster-ace-next-idle.webp';
import aceGameplayWalk from '../../assets/characters/ace-gameplay/rooster-ace-gameplay-walk.webp';
import aceGameplayIdle from '../../assets/characters/ace-gameplay/rooster-ace-gameplay-idle.webp';
import aceFinalWalk from '../../assets/characters/ace-final/rooster-ace-final-walk.webp';
import aceFinalIdle from '../../assets/characters/ace-final/rooster-ace-final-idle.webp';
import aceMascotWalk from '../../assets/characters/ace-mascot/rooster-ace-mascot-walk.webp';
import aceMascotIdle from '../../assets/characters/ace-mascot/rooster-ace-mascot-idle.webp';
import artilleryLegacyWalk from '../../assets/characters/rooster-artillery-walk-v3.webp';
import artilleryNextWalk from '../../assets/characters/artillery-next/rooster-artillery-next-walk.webp';
import artilleryNextIdle from '../../assets/characters/artillery-next/rooster-artillery-next-idle.webp';
import artilleryGameplayWalk from '../../assets/characters/artillery-gameplay/rooster-artillery-gameplay-walk.webp';
import artilleryGameplayIdle from '../../assets/characters/artillery-gameplay/rooster-artillery-gameplay-idle.webp';
import artilleryFinalWalk from '../../assets/characters/artillery-final/rooster-artillery-final-walk.webp';
import artilleryFinalIdle from '../../assets/characters/artillery-final/rooster-artillery-final-idle.webp';
import artilleryMascotWalk from '../../assets/characters/artillery-mascot/rooster-artillery-mascot-walk.webp';
import artilleryMascotIdle from '../../assets/characters/artillery-mascot/rooster-artillery-mascot-idle.webp';
import stormLegacyWalk from '../../assets/characters/rooster-storm-walk-v3.webp';
import stormNextWalk from '../../assets/characters/storm-next/rooster-storm-next-walk.webp';
import stormNextIdle from '../../assets/characters/storm-next/rooster-storm-next-idle.webp';
import stormGameplayWalk from '../../assets/characters/storm-gameplay/rooster-storm-gameplay-walk.webp';
import stormGameplayIdle from '../../assets/characters/storm-gameplay/rooster-storm-gameplay-idle.webp';
import stormFinalWalk from '../../assets/characters/storm-final/rooster-storm-final-walk.webp';
import stormFinalIdle from '../../assets/characters/storm-final/rooster-storm-final-idle.webp';
import stormMascot from './stormMascotAssets.js';
import {
  USE_FINAL_ACE_VISUAL,
  USE_MASCOT_ACE_VISUAL,
  USE_FINAL_ARTILLERY_VISUAL,
  USE_MASCOT_ARTILLERY_VISUAL,
  USE_FINAL_STORM_VISUAL,
  USE_MASCOT_STORM_VISUAL,
  USE_GAMEPLAY_ACE_VISUAL,
  USE_GAMEPLAY_ARTILLERY_VISUAL,
  USE_GAMEPLAY_STORM_VISUAL,
  USE_NEXT_ACE_VISUAL,
  USE_NEXT_ARTILLERY_VISUAL,
  USE_NEXT_STORM_VISUAL
} from '../../config/aceVisual.js';

export const ROOSTER_ASSET_URLS = Object.freeze({
  ace: {
    walk: USE_MASCOT_ACE_VISUAL ? aceMascotWalk : USE_FINAL_ACE_VISUAL ? aceFinalWalk
      : USE_GAMEPLAY_ACE_VISUAL ? aceGameplayWalk
      : USE_NEXT_ACE_VISUAL ? aceNextWalk : aceLegacyWalk,
    idle: USE_MASCOT_ACE_VISUAL ? aceMascotIdle : USE_FINAL_ACE_VISUAL ? aceFinalIdle
      : USE_GAMEPLAY_ACE_VISUAL ? aceGameplayIdle : aceNextIdle,
    legacyWalk: aceLegacyWalk
  },
  artillery: {
    walk: USE_MASCOT_ARTILLERY_VISUAL ? artilleryMascotWalk : USE_FINAL_ARTILLERY_VISUAL ? artilleryFinalWalk
      : USE_GAMEPLAY_ARTILLERY_VISUAL ? artilleryGameplayWalk
      : USE_NEXT_ARTILLERY_VISUAL ? artilleryNextWalk : artilleryLegacyWalk,
    idle: USE_MASCOT_ARTILLERY_VISUAL ? artilleryMascotIdle : USE_FINAL_ARTILLERY_VISUAL ? artilleryFinalIdle
      : USE_GAMEPLAY_ARTILLERY_VISUAL ? artilleryGameplayIdle : artilleryNextIdle,
    legacyWalk: artilleryLegacyWalk
  },
  storm: USE_MASCOT_STORM_VISUAL ? stormMascot : {
    walk: USE_FINAL_STORM_VISUAL ? stormFinalWalk
      : USE_GAMEPLAY_STORM_VISUAL ? stormGameplayWalk
      : USE_NEXT_STORM_VISUAL ? stormNextWalk : stormLegacyWalk,
    idle: USE_FINAL_STORM_VISUAL ? stormFinalIdle
      : USE_GAMEPLAY_STORM_VISUAL ? stormGameplayIdle : stormNextIdle,
    legacyWalk: stormLegacyWalk
  }
});
