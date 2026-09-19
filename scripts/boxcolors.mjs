// Most common colours inside a box of a screenshot. Usage: node scripts/boxcolors.mjs <png> <x0> <y0> <x1> <y1> [top=6]
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
const [f, x0, y0, x1, y1, top] = process.argv.slice(2);
const img = PNG.sync.read(readFileSync(f)); const d = img.data, W = img.width;
const counts = new Map(); let n = 0;
for (let y = +y0; y < +y1; y++) for (let x = +x0; x < +x1; x++) { const o = (y * W + x) * 4; const k = `${d[o]},${d[o + 1]},${d[o + 2]}`; counts.set(k, (counts.get(k) || 0) + 1); n++; }
const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, +(top || 6));
console.log(f.split('/').slice(-2).join('/'), `box ${x0},${y0}-${x1},${y1}:`, rows.map(([k, c]) => `${k} ${(c / n * 100).toFixed(1)}%`).join(' | '));
