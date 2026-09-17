// Track the painted-helmet "reveal bands" over time: for every frame, count yellow/black painted pixels
// inside the helmet box and report their vertical extent + centroid. Prints one row per frame.
// Usage: node scripts/helmet-band-track.mjs <framesDir> [x y w h]
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
const dir = process.argv[2];
const [bx, by, bw, bh] = (process.argv.slice(3).length === 4 ? process.argv.slice(3) : [430, 60, 580, 660]).map(Number);
const files = readdirSync(dir).filter((f) => /^t\d+\.png$/.test(f)).sort();
console.log('t(ms)  painted%  yMin  yMax  yCentroid  (helmet box', bx, by, bw, bh, ')');
for (const f of files) {
  const img = PNG.sync.read(readFileSync(join(dir, f)));
  let n = 0, ySum = 0, yMin = 1e9, yMax = -1;
  for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) {
    const o = (y * img.width + x) * 4; const r = img.data[o], g = img.data[o + 1], b = img.data[o + 2];
    // painted skin = saturated yellow (the 2025 livery) or near-black print on it
    const yellow = r > 150 && g > 130 && b < 90 && r - b > 90;
    if (yellow) { n++; ySum += y; if (y < yMin) yMin = y; if (y > yMax) yMax = y; }
  }
  const pct = (100 * n / (bw * bh)).toFixed(2);
  console.log(f.slice(1, -4), pct.padStart(8), n ? String(yMin).padStart(5) : '    -', n ? String(yMax).padStart(5) : '    -', n ? String(Math.round(ySum / n)).padStart(9) : '        -');
}
