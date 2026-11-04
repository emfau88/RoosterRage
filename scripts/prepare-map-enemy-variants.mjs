import fs from 'node:fs/promises';
import path from 'node:path';
import { loadPlaywright, projectRoot } from '../tests/helpers/test-runtime.mjs';

// Asset packaging only: the approved Imagegen drawings are unchanged. Bake the
// preview's uniform size/anchor correction into standard 256px game cells so
// changing animation frames never changes the physics body's scale or origin.
const source = path.join(projectRoot, 'docs/qa/map-creep-study');
const output = path.join(projectRoot, 'src/assets/enemies/map-variants');
const layouts = JSON.parse(await fs.readFile(path.join(source, 'frame-layout.json'), 'utf8'));
const browser = await loadPlaywright().chromium.launch({ headless: true });
await fs.mkdir(output, { recursive: true });
try {
  const page = await browser.newPage();
  for (const [name, layout] of Object.entries(layouts)) {
    const data = (await fs.readFile(path.join(source, 'assets', name + '.png'))).toString('base64');
    const encoded = await page.evaluate(async ({data, layout}) => {
      const image = new Image(); image.src = 'data:image/png;base64,' + data; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = layout.columns * 256; canvas.height = layout.rows * 256;
      const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      for (const [index, f] of layout.frames.entries()) {
        const x = index % layout.columns * 256, y = Math.floor(index / layout.columns) * 256;
        ctx.save(); ctx.beginPath(); ctx.rect(x,y,256,256); ctx.clip();
        ctx.drawImage(image,f.x,f.y,f.size,f.size,x+128-f.pivotX*256,y+128-f.pivotY*256,256,256);ctx.restore();
      }
      return canvas.toDataURL('image/webp', 0.94).split(',')[1];
    }, { data, layout });
    const bytes = Buffer.from(encoded, 'base64');
    await fs.writeFile(path.join(output,name+'.webp'), bytes);
    console.log(`${name}: ${layout.columns * 256}x${layout.rows * 256}, ${bytes.length} bytes`);
  }
} finally { await browser.close(); }
