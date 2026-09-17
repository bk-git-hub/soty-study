// Left edge of the helmet body per row: first x where >= RUN consecutive light-grey pixels start
// (filters the 1-2 px contour lines). Usage: node scripts/silhouette.mjs <png> [y0] [y1] [step] [x0] [x1] [run=6]
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
const [f, y0s, y1s, steps, x0s, x1s, runS] = process.argv.slice(2);
const y0 = +(y0s || 200), y1 = +(y1s || 700), step = +(steps || 20), x0 = +(x0s || 380), x1 = +(x1s || 720), RUN = +(runS || 6);
const img = PNG.sync.read(readFileSync(f)); const d = img.data, W = img.width;
const isContent = (o) => { const r = d[o], g = d[o + 1], b = d[o + 2]; return (r + g + b) / 3 < 238 || Math.max(r, g, b) - Math.min(r, g, b) > 12; };
const out = [];
for (let y = y0; y <= y1; y += step) {
  let run = 0, edge = -1;
  for (let x = x0; x < x1; x++) { if (isContent((y * W + x) * 4)) { run++; if (run >= RUN) { edge = x - RUN + 1; break; } } else run = 0; }
  out.push(edge);
}
console.log(f.split(/[\/]/).pop().padEnd(22), out.map((v) => String(v).padStart(4)).join(' '));
