// Character of thin background lines in a still: colour, share, width and spacing. Line pixels = a little
// off the most common colour (the page). Width = median run of line pixels along rows and columns; spacing
// = median run of page pixels between lines along rows. Usage: node scripts/line-stats.mjs <png> [x0 y0 x1 y1]
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
const [file, x0S, y0S, x1S, y1S] = process.argv.slice(2);
const png = PNG.sync.read(readFileSync(file)), W = png.width, H = png.height;
const x0 = +(x0S || 0), y0 = +(y0S || 90), x1 = +(x1S || W), y1 = +(y1S || H);
const hist = new Map();
for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * W + x) * 4, k = (png.data[i] << 16) | (png.data[i + 1] << 8) | png.data[i + 2]; hist.set(k, (hist.get(k) || 0) + 1); }
const sorted = [...hist.entries()].sort((a, b) => b[1] - a[1]), bg = sorted[0][0], br = bg >> 16, bgg = (bg >> 8) & 255, bb = bg & 255;
const isLine = (x, y) => { const i = (y * W + x) * 4, d = Math.abs(png.data[i] - br) + Math.abs(png.data[i + 1] - bgg) + Math.abs(png.data[i + 2] - bb); return d >= 8 && d < 70; };
let n = 0, tot = 0; const lineCols = new Map();
for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { tot++; if (isLine(x, y)) { n++; const i = (y * W + x) * 4, k = (png.data[i] << 16) | (png.data[i + 1] << 8) | png.data[i + 2]; lineCols.set(k, (lineCols.get(k) || 0) + 1); } }
const runs = (horizontal, wantLine) => { const out = []; const N1 = horizontal ? y1 - y0 : x1 - x0, N2 = horizontal ? x1 - x0 : y1 - y0;
  for (let a = 0; a < N1; a++) { let run = 0; for (let b = 0; b <= N2; b++) { const x = horizontal ? x0 + b : x0 + a, y = horizontal ? y0 + a : y0 + b; const v = b < N2 && isLine(x, y); if (v === wantLine && b < N2) run++; else { if (run) out.push(run); run = 0; } } } return out.sort((p, q) => p - q); };
const med = (a) => (a.length ? a[Math.floor(a.length / 2)] : 0);
const wRow = runs(true, true), wCol = runs(false, true), gap = runs(true, false).filter((r) => r > 3);
const hex = (k) => '#' + k.toString(16).padStart(6, '0');
console.log(`${file.split('/').pop()}: page ${hex(bg)}, line pixels ${(n / tot * 100).toFixed(2)} %, top line colours ${[...lineCols.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, c]) => hex(k) + ' x' + c).join(' ')}, width median row ${med(wRow)} col ${med(wCol)} px, gap between lines median ${med(gap)} px (p25 ${gap[Math.floor(gap.length / 4)] || 0}, p75 ${gap[Math.floor(gap.length * 3 / 4)] || 0})`);
