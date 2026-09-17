// Luminance along a row, averaged over 3 rows and 4-px bins. Usage: node scripts/rowprofile.mjs <png> <y> [x0=380] [x1=600] [bin=4]
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
const [f, ys, x0s, x1s, bins] = process.argv.slice(2);
const y = +ys, x0 = +(x0s || 380), x1 = +(x1s || 600), bin = +(bins || 4);
const img = PNG.sync.read(readFileSync(f)); const d = img.data, W = img.width;
const vals = [];
for (let x = x0; x < x1; x += bin) { let s = 0, n = 0; for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x; xx < x + bin; xx++) { const o = (yy * W + xx) * 4; s += (d[o] + d[o + 1] + d[o + 2]) / 3; n++; } vals.push(Math.round(s / n)); }
console.log(f.split(/[\/]/).pop().padEnd(16), 'y=' + String(y).padStart(3), vals.map((v) => String(v).padStart(3)).join(' '));
