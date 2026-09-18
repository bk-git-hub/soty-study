// Stack PNGs vertically (same width) with a 4-px gap. Usage: node scripts/montage.mjs <out.png> <a.png> <b.png> ...
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
const [out, ...files] = process.argv.slice(2);
const imgs = files.map((f) => PNG.sync.read(readFileSync(f)));
const W = Math.max(...imgs.map((i) => i.width)), GAP = 4, H = imgs.reduce((s, i) => s + i.height, 0) + GAP * (imgs.length - 1);
const o = new PNG({ width: W, height: H }); o.data.fill(255);
let y = 0;
for (const im of imgs) { for (let yy = 0; yy < im.height; yy++) im.data.copy(o.data, ((y + yy) * W) * 4, (yy * im.width) * 4, (yy * im.width + im.width) * 4); y += im.height + GAP; for (let x = 0; x < W * 4 && y - GAP < H; x++) { /* gap left white */ } }
writeFileSync(out, PNG.sync.write(o)); console.log('wrote', out, W + 'x' + H);
