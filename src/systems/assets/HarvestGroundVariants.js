import { USE_GROUND_VARIANTS } from '../../config/mapArt.js';

const VARIANTS = ['a', 'b', 'c'];

export function ensureHarvestGroundVariants(scene) {
  if (!USE_GROUND_VARIANTS) return;
  const base = scene.textures.get('arena-ground-farm').getSourceImage();
  for (const variant of VARIANTS) {
    const key = `portal-ground-farm-${variant}`;
    if (scene.textures.exists(key)) continue;
    const source = scene.textures.get(`portal-ground-source-${variant}`).getSourceImage();
    const overlay = document.createElement('canvas');
    overlay.width = base.width; overlay.height = base.height;
    const context = overlay.getContext('2d');
    context.drawImage(source, 0, 0, overlay.width, overlay.height);
    context.globalCompositeOperation = 'destination-in';
    // All variants share the original outer rim. Fade only the generated
    // interior, so changing variants cannot introduce a new edge mismatch.
    for (const vertical of [false, true]) {
      const gradient = context.createLinearGradient(0, 0,
        vertical ? 0 : overlay.width, vertical ? overlay.height : 0);
      for (const [position, alpha] of [[0,0],[0.045,0],[0.17,1],[0.83,1],[0.955,0],[1,0]]) {
        gradient.addColorStop(position, `rgba(0,0,0,${alpha})`);
      }
      context.fillStyle = gradient;
      context.fillRect(0, 0, overlay.width, overlay.height);
    }
    const texture = scene.textures.createCanvas(key, base.width, base.height);
    texture.context.drawImage(base, 0, 0);
    texture.context.drawImage(overlay, 0, 0);
    texture.refresh();
  }
  // Generated source images never render directly. Release their GPU textures
  // once the three shared-rim textures are built; keep those across runs.
  for (const variant of VARIANTS) {
    const key = `portal-ground-source-${variant}`;
    if (scene.textures.exists(key)) scene.textures.remove(key);
  }
}

export function harvestGroundTexture(hash) {
  return USE_GROUND_VARIANTS ? `portal-ground-farm-${VARIANTS[hash % VARIANTS.length]}` : 'arena-ground-farm';
}
