// Luminance down a column (averaged over 3 columns), 1 px per value. Usage: node scripts/colprofile.mjs <png> <x> <y0> <y1>
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
const [f, xs, y0s, y1s] = process.argv.slice(2);
const x = +xs, y0 = +y0s, y1 = +y1s;
const img = PNG.sync.read(readFileSync(f)); const d = img.data, W = img.width;
const vals = [];
for (let y = y0; y <= y1; y++) { let s = 0, n = 0; for (let xx = x - 1; xx <= x + 1; xx++) { const o = (y * W + xx) * 4; s += (d[o] + d[o + 1] + d[o + 2]) / 3; n++; } vals.push(Math.round(s / n)); }
console.log(f.split('/').pop().padEnd(18), 'x=' + x, 'y' + y0 + '..' + y1 + ':', vals.join(' '));
