// Track the soft background shadow blobs: centroid + darkness of pixels darker than a threshold in a
// region that excludes the helmet/portrait and the next-race card. Usage: node scripts/bg-track.mjs <dir> [every=10]
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
const dir = process.argv[2]; const every = +(process.argv[3] || 10);
const files = readdirSync(dir).filter((f) => /^t\d+\.png$/.test(f)).sort();
const regions = { left: [0, 0, 380, 660], right: [1060, 100, 380, 800], top: [380, 0, 680, 80] };
console.log('t(ms)   ' + Object.keys(regions).map((k) => `${k}: dark% cx cy`).join('   |   '));
files.forEach((f, i) => {
  if (i % every) return;
  const img = PNG.sync.read(readFileSync(join(dir, f)));
  const cols = [];
  for (const [name, [rx, ry, rw, rh]] of Object.entries(regions)) {
    let n = 0, sx = 0, sy = 0;
    for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) {
      const o = (y * img.width + x) * 4; const l = (img.data[o] + img.data[o + 1] + img.data[o + 2]) / 3;
      if (l < 225) { n++; sx += x; sy += y; }
    }
    cols.push(n ? `${(100 * n / (rw * rh)).toFixed(1).padStart(5)} ${Math.round(sx / n).toString().padStart(4)} ${Math.round(sy / n).toString().padStart(4)}` : '    0    -    -');
  }
  console.log(f.slice(1, -4), ' ', cols.join('   |   '));
});
