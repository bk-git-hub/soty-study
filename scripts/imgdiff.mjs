// |A - B| per pixel, amplified: node scripts/imgdiff.mjs <a.png> <b.png> <out.png> [gain=6]
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
const [a, b, out, gainS] = process.argv.slice(2); const gain = +(gainS || 6);
const A = PNG.sync.read(readFileSync(a)), B = PNG.sync.read(readFileSync(b));
const w = Math.min(A.width, B.width), h = Math.min(A.height, B.height);
const o = new PNG({ width: w, height: h }); let maxd = 0, sum = 0;
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const ia = (y * A.width + x) * 4, ib = (y * B.width + x) * 4, io = (y * w + x) * 4;
  const d = (Math.abs(A.data[ia] - B.data[ib]) + Math.abs(A.data[ia + 1] - B.data[ib + 1]) + Math.abs(A.data[ia + 2] - B.data[ib + 2])) / 3;
  if (d > maxd) maxd = d; sum += d;
  const v = 255 - Math.min(255, d * gain); o.data[io] = v; o.data[io + 1] = v; o.data[io + 2] = v; o.data[io + 3] = 255;
}
writeFileSync(out, PNG.sync.write(o));
console.log(out, 'max diff', maxd.toFixed(1), 'mean', (sum / (w * h)).toFixed(2));
