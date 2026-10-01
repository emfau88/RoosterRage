const KEY = 'player-contact-shadow';

// A small soft texture is enough for ground contact; its transparent edge avoids
// the selection-ring appearance of a stroked geometric marker.
export function ensurePlayerContactShadow(scene) {
  if (scene.textures.exists(KEY)) return KEY;
  const texture = scene.textures.createCanvas(KEY, 128, 64);
  const context = texture.context;
  const lobe = (x, y, width, height, alpha) => {
    context.save();
    context.translate(x, y);
    context.scale(width, height);
    const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 1);
    gradient.addColorStop(0, `rgba(43, 27, 15, ${alpha})`);
    gradient.addColorStop(0.35, `rgba(43, 27, 15, ${alpha * 0.7})`);
    gradient.addColorStop(0.75, `rgba(43, 27, 15, ${alpha * 0.18})`);
    gradient.addColorStop(1, 'rgba(43, 27, 15, 0)');
    context.fillStyle = gradient;
    context.fillRect(-1, -1, 2, 2);
    context.restore();
  };
  lobe(64, 32, 60, 28, 0.32);
  lobe(58, 33, 38, 17, 0.31);
  lobe(76, 31, 26, 13, 0.20);
  texture.refresh();
  return KEY;
}
