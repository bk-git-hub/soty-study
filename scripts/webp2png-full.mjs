// Decode a WebP served by the dev server to a full-resolution PNG (canvas in headless Chromium).
// Usage: node scripts/webp2png-full.mjs <out.png> <urlPath>
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const [out, path] = process.argv.slice(2);
mkdirSync(dirname(out), { recursive: true });
const b = await chromium.launch({ channel: 'chromium' });
const p = await b.newPage();
await p.goto('http://localhost:5173/');
const dataUrl = await p.evaluate(async (src) => {
  const img = new Image(); img.src = src; await img.decode();
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext('2d').drawImage(img, 0, 0);
  return c.toDataURL('image/png');
}, path);
writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
await b.close();
console.log('wrote', out);
