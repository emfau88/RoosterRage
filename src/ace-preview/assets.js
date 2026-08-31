import southBody from '../assets/characters/ace-four-direction/south/body.webp';
import southWingLeft from '../assets/characters/ace-four-direction/south/wing-left.webp';
import southWingRight from '../assets/characters/ace-four-direction/south/wing-right.webp';
import southFootLeft from '../assets/characters/ace-four-direction/south/foot-left.webp';
import southFootRight from '../assets/characters/ace-four-direction/south/foot-right.webp';
import westBody from '../assets/characters/ace-four-direction/west/body.webp';
import westWingNear from '../assets/characters/ace-four-direction/west/wing-near.webp';
import westWingFar from '../assets/characters/ace-four-direction/west/wing-far.webp';
import westFootNear from '../assets/characters/ace-four-direction/west/foot-near.webp';
import westFootFar from '../assets/characters/ace-four-direction/west/foot-far.webp';
import westTail from '../assets/characters/ace-four-direction/west/tail.webp';
import northBody from '../assets/characters/ace-four-direction/north/body.webp';
import northWingLeft from '../assets/characters/ace-four-direction/north/wing-left.webp';
import northWingRight from '../assets/characters/ace-four-direction/north/wing-right.webp';
import northLegLeft from '../assets/characters/ace-four-direction/north/leg-left.webp';
import northLegRight from '../assets/characters/ace-four-direction/north/leg-right.webp';
import northTail from '../assets/characters/ace-four-direction/north/tail.webp';

export const ACE_PART_URLS = {
  'south/body': southBody,
  'south/wing-left': southWingLeft,
  'south/wing-right': southWingRight,
  'south/foot-left': southFootLeft,
  'south/foot-right': southFootRight,
  'west/body': westBody,
  'west/wing-near': westWingNear,
  'west/wing-far': westWingFar,
  'west/foot-near': westFootNear,
  'west/foot-far': westFootFar,
  'west/tail': westTail,
  'north/body': northBody,
  'north/wing-left': northWingLeft,
  'north/wing-right': northWingRight,
  'north/leg-left': northLegLeft,
  'north/leg-right': northLegRight,
  'north/tail': northTail,
};

export async function loadAceParts() {
  const entries = await Promise.all(Object.entries(ACE_PART_URLS).map(async ([key, url]) => {
    const image = new Image();
    image.src = url;
    await image.decode();
    return [key, image];
  }));
  return Object.fromEntries(entries);
}
