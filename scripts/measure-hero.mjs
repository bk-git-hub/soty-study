// Robust hero landmarks: hair top (dark rows in the helmet-free centre column), shoulder width near the
// bottom edge, neck width, and the head silhouette top. Usage: node scripts/measure-hero.mjs <png>...
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
const lum = (d, o) => (d[o] + d[o + 1] + d[o + 2]) / 3;
for (const f of process.argv.slice(2)) {
  const img = PNG.sync.read(readFileSync(f)); const W = img.width, H = img.height, d = img.data;
  const rowCount = (y, x0, x1, th) => { let n = 0; for (let x = x0; x < x1; x++) if (lum(d, (y * W + x) * 4) < th) n++; return n; };
  const span = (y, th) => { let l = -1, r = -1; for (let x = 0; x < W; x++) if (lum(d, (y * W + x) * 4) < th) { if (l < 0) l = x; r = x; } return [l, r]; };
  let hairTop = -1; for (let y = 0; y < H; y++) if (rowCount(y, 660, 780, 120) > 40) { hairTop = y; break; }
  const shoulders = span(890, 150), neck = span(760, 150);
  // eye line: darkest 8-px band between hairTop+120 and hairTop+420 in the eye columns (560-880), skipping the hair mass
  let best = -1, bestV = 1e9;
  for (let y = hairTop + 150; y < Math.min(H, hairTop + 450); y++) { let v = 0; for (let x = 590; x < 850; x++) v += lum(d, (y * W + x) * 4); if (v < bestV) { bestV = v; best = y; } }
  console.log(f.split(/[\/]/).pop().padEnd(18), 'hairTop', hairTop, ' eyeLine~', best, ' neck@760', neck.join('-'), '=', neck[1] - neck[0], ' shoulders@890', shoulders.join('-'), '=', shoulders[1] - shoulders[0]);
}
