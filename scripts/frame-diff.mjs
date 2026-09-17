// Frame-by-frame motion analysis of a screenshot sequence.
// Usage: node scripts/frame-diff.mjs <dir> [outdir]
// Prints per-frame change (% of pixels that moved) and writes a heat map of where motion happened.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';

const dir = process.argv[2];
const out = process.argv[3] || join(dir, '_analysis');
mkdirSync(out, { recursive: true });
const files = readdirSync(dir).filter((f) => /^t\d+\.png$/.test(f)).sort();
const load = (f) => PNG.sync.read(readFileSync(join(dir, f)));
let prev = load(files[0]);
const { width, height } = prev;
const heat = new Float32Array(width * height);
const rows = [];
const THRESH = 24; // per-channel difference that counts as "moved" (ignores compression noise)
for (let i = 1; i < files.length; i++) {
  const cur = load(files[i]);
  let moved = 0; let minX = width, minY = height, maxX = 0, maxY = 0;
  for (let p = 0; p < width * height; p++) {
    const o = p * 4;
    const d = Math.abs(cur.data[o] - prev.data[o]) + Math.abs(cur.data[o + 1] - prev.data[o + 1]) + Math.abs(cur.data[o + 2] - prev.data[o + 2]);
    if (d > THRESH) { moved++; heat[p] += d; const x = p % width, y = (p / width) | 0; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  rows.push({ t: files[i].slice(1, -4), pct: +(100 * moved / (width * height)).toFixed(2), box: moved ? [minX, minY, maxX, maxY] : null });
  prev = cur;
}
// heat map: brighter = moved more often / more strongly
let max = 0; for (let p = 0; p < heat.length; p++) if (heat[p] > max) max = heat[p];
const png = new PNG({ width, height });
for (let p = 0; p < width * height; p++) { const v = Math.min(255, Math.round(255 * Math.sqrt(heat[p] / max))); png.data[p * 4] = v; png.data[p * 4 + 1] = v * 0.6; png.data[p * 4 + 2] = 40; png.data[p * 4 + 3] = 255; }
writeFileSync(join(out, 'heat.png'), PNG.sync.write(png));
writeFileSync(join(out, 'diff.json'), JSON.stringify(rows, null, 1));
console.log('frames', files.length, 'size', width + 'x' + height);
console.log('t(ms)  moved%  bbox');
const every = +(process.argv[4] || 1);
rows.forEach((r, i) => { if (i % every === 0) console.log(r.t.padStart(6), String(r.pct).padStart(7), r.box ? r.box.join(',') : '-'); });
