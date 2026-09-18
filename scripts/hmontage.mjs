// Place PNGs side by side (same height) with a 4-px gap. Usage: node scripts/hmontage.mjs <out.png> <a.png> <b.png> ...
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
const [out, ...files] = process.argv.slice(2);
const imgs = files.map((f) => PNG.sync.read(readFileSync(f)));
const H = Math.max(...imgs.map((i) => i.height)), GAP = 4, W = imgs.reduce((s, i) => s + i.width, 0) + GAP * (imgs.length - 1);
const o = new PNG({ width: W, height: H }); o.data.fill(255);
let x = 0;
for (const im of imgs) { for (let y = 0; y < im.height; y++) im.data.copy(o.data, (y * W + x) * 4, (y * im.width) * 4, (y * im.width + im.width) * 4); x += im.width + GAP; }
writeFileSync(out, PNG.sync.write(o)); console.log('wrote', out, W + 'x' + H);
