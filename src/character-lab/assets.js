import body from '../assets/characters/ace-production-v1/body.webp';
import wingLeft from '../assets/characters/ace-production-v1/wing-left.webp';
import wingRight from '../assets/characters/ace-production-v1/wing-right.webp';
import wingThrow from '../assets/characters/ace-production-v1/wing-throw.webp';
import footLeft from '../assets/characters/ace-production-v1/foot-left.webp';
import footRight from '../assets/characters/ace-production-v1/foot-right.webp';
import legacy from '../assets/characters/rooster-ace-walk-v2.webp';
import chat from '../assets/characters/ace-production-v1/chat-walk-comparison.webp';
import ground from '../assets/map/coop-square-ground.webp';
import egg from '../assets/projectiles/egg.webp';

export const PART_URLS = { body, 'wing-left': wingLeft, 'wing-right': wingRight, 'wing-throw': wingThrow, 'foot-left': footLeft, 'foot-right': footRight };
export const IMAGE_URLS = { ...PART_URLS, legacy, chat, ground, egg };

export async function loadLabImages() {
  const pairs = await Promise.all(Object.entries(IMAGE_URLS).map(async ([key, url]) => {
    const image = new Image();
    image.src = url;
    await image.decode();
    return [key, image];
  }));
  return Object.fromEntries(pairs);
}
