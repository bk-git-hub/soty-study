// Mean colour of a box in a PNG. Usage: node scripts/boxmean.mjs <png> <x0> <y0> <x1> <y1>
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
const [f, x0, y0, x1, y1] = process.argv.slice(2);
const img = PNG.sync.read(readFileSync(f)); const d = img.data, W = img.width;
let r = 0, g = 0, b = 0, n = 0;
for (let y = +y0; y < +y1; y++) for (let x = +x0; x < +x1; x++) { const o = (y * W + x) * 4; r += d[o]; g += d[o + 1]; b += d[o + 2]; n++; }
console.log(f.split('/').slice(-2).join('/').padEnd(28), `box ${x0},${y0}-${x1},${y1}  mean`, Math.round(r / n), Math.round(g / n), Math.round(b / n));
