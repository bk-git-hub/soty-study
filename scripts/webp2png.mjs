// Save WebP textures served by the dev server as PNG via headless Chromium (opens the image URL directly).
// Usage: node scripts/webp2png.mjs <outDir> <urlPath>...
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
const [out, ...paths] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: 'chromium' });
const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
for (const path of paths) {
  const res = await p.goto('http://localhost:5173' + path);
  const nat = await p.evaluate(() => { const i = document.querySelector('img'); return i ? [i.naturalWidth, i.naturalHeight] : null; });
  await p.evaluate(() => { const i = document.querySelector('img'); if (i) { i.style.width = '1024px'; i.style.height = 'auto'; i.style.margin = '0'; document.body.style.margin = '0'; document.body.style.background = '#ff00ff'; } });
  const file = join(out, basename(path).replace(/\.webp$/, '.png'));
  await p.locator('img').screenshot({ path: file });
  console.log(file, res.status(), 'natural', nat && nat.join('x'));
}
await b.close();
