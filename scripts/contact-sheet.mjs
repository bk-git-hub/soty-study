// Contact sheet of a frame directory: every frame (or every nth) downscaled and laid out in a grid,
// left to right, top to bottom. Prints the file name of each cell so a cell can be traced back.
// Usage: node scripts/contact-sheet.mjs <dir> <out.png> [cols=6] [shrink=5] [every=1] [fromMs=0] [toMs=inf]
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
const [dir, out, colsS, shrinkS, everyS, fromS, toS] = process.argv.slice(2);
const cols = +(colsS || 6), k = +(shrinkS || 5), every = +(everyS || 1), from = +(fromS || 0), to = toS ? +toS : Infinity;
const files = readdirSync(dir).filter((f) => /^[fsv]\d+\.png$/.test(f)).sort()
  .filter((f) => { const t = +f.slice(1, -4); return t >= from && t <= to; }).filter((_, i) => i % every === 0);
const first = PNG.sync.read(readFileSync(`${dir}/${files[0]}`));
const w = Math.floor(first.width / k), h = Math.floor(first.height / k), GAP = 4;
const rows = Math.ceil(files.length / cols);
const sheet = new PNG({ width: cols * (w + GAP) - GAP, height: rows * (h + GAP) - GAP }); sheet.data.fill(128);
files.forEach((f, i) => {
  const img = i === 0 ? first : PNG.sync.read(readFileSync(`${dir}/${f}`));
  const ox = (i % cols) * (w + GAP), oy = Math.floor(i / cols) * (h + GAP);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    // box average over k x k source pixels
    let r = 0, g = 0, b = 0;
    for (let yy = 0; yy < k; yy++) for (let xx = 0; xx < k; xx++) { const o = ((y * k + yy) * img.width + x * k + xx) * 4; r += img.data[o]; g += img.data[o + 1]; b += img.data[o + 2]; }
    const t = ((oy + y) * sheet.width + ox + x) * 4, n = k * k;
    sheet.data[t] = r / n; sheet.data[t + 1] = g / n; sheet.data[t + 2] = b / n; sheet.data[t + 3] = 255;
  }
});
writeFileSync(out, PNG.sync.write(sheet));
console.log('cells:', files.map((f, i) => `${i}:${f.slice(1, -4)}ms`).join(' '));
console.log('wrote', out, `${sheet.width}x${sheet.height}`);
