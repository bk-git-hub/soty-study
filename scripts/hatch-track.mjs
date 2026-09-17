// Track the helmet "structure" lines (thin grey mesh) over time: count mid-grey, low-saturation pixels
// in helmet regions that have white background behind them (top dome, left/right cheek areas).
// Usage: node scripts/hatch-track.mjs <framesDir> [every=2]
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
const dir = process.argv[2]; const every = +(process.argv[3] || 2);
const regions = { dome: [560, 62, 320, 60], upperL: [432, 200, 80, 90], midL: [432, 290, 80, 90], lowL: [432, 380, 80, 80], upperR: [930, 200, 80, 90], midR: [930, 290, 80, 90], lowR: [930, 380, 80, 80] };
const files = readdirSync(dir).filter((f) => /^t\d+\.png$/.test(f)).sort();
console.log('t(ms)   ' + Object.keys(regions).map((k) => k + '%').join('  '));
files.forEach((f, i) => {
  if (i % every) return;
  const img = PNG.sync.read(readFileSync(join(dir, f))); const d = img.data, W = img.width;
  const cols = [];
  for (const [rx, ry, rw, rh] of Object.values(regions)) {
    let n = 0;
    for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) {
      const o = (y * W + x) * 4; const r = d[o], g = d[o + 1], b = d[o + 2]; const l = (r + g + b) / 3;
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      if (l > 120 && l < 222 && sat < 18) n++; // grey line pixels (background is ~244, paint is saturated, hair is dark)
    }
    cols.push((100 * n / (rw * rh)).toFixed(1).padStart(6));
  }
  console.log(f.slice(1, -4), ' ', cols.join('  '));
});
