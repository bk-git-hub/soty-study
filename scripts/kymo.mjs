// Kymograph: time (x) vs screen row (y) of two signals inside the helmet columns:
//   hatch = grey low-saturation line pixels, paint = saturated yellow livery pixels.
// Writes <out>-hatch.png and <out>-paint.png (brighter = more). Usage: node scripts/kymo.mjs <dir> <outPrefix> [every=1] [x0=430] [x1=1010] [y0=60] [y1=720]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
const [dir, out, everyS, ...box] = process.argv.slice(2);
const every = +(everyS || 1); const [x0, x1, y0, y1] = (box.length === 4 ? box : [430, 1010, 60, 720]).map(Number);
const files = readdirSync(dir).filter((f) => /^t\d+\.png$/.test(f)).sort().filter((_, i) => i % every === 0);
const BIN = 4; const rows = Math.ceil((y1 - y0) / BIN);
const hatch = new PNG({ width: files.length, height: rows }), paint = new PNG({ width: files.length, height: rows });
files.forEach((f, i) => {
  const img = PNG.sync.read(readFileSync(join(dir, f))); const d = img.data, W = img.width;
  for (let r = 0; r < rows; r++) {
    let nh = 0, np = 0, tot = 0;
    for (let y = y0 + r * BIN; y < Math.min(y1, y0 + (r + 1) * BIN); y++) for (let x = x0; x < x1; x++) {
      const o = (y * W + x) * 4; const R = d[o], G = d[o + 1], B = d[o + 2]; const l = (R + G + B) / 3; const sat = Math.max(R, G, B) - Math.min(R, G, B);
      tot++;
      if (l > 120 && l < 222 && sat < 18) nh++;
      if (R > 150 && G > 130 && B < 90 && R - B > 90) np++;
    }
    const ph = Math.min(255, Math.round(255 * Math.sqrt(nh / tot) * 2.5)), pp = Math.min(255, Math.round(255 * Math.sqrt(np / tot) * 2));
    for (const [png, v] of [[hatch, ph], [paint, pp]]) { const o = (r * files.length + i) * 4; png.data[o] = v; png.data[o + 1] = v; png.data[o + 2] = v; png.data[o + 3] = 255; }
  }
});
writeFileSync(out + '-hatch.png', PNG.sync.write(hatch)); writeFileSync(out + '-paint.png', PNG.sync.write(paint));
console.log('columns', files.length, '(one per', every * 40, 'ms) rows', rows, '(4 px each from y', y0, ')');
