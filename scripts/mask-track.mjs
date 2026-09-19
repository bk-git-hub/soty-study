// Track the cursor "paint" blob over a series of timestamped screenshots (from shot-series.mjs).
// Usage: node scripts/mask-track.mjs <dir> <mode> [x0=0] [x1=width]
//   mode "paint": painted = clearly off the page colour (252,252,250), for the real composite
//   mode "debug": painted = dark blob of the local ?debug=mask view
// A 16 px block counts as painted only if > 70 % of its pixels are, so the thin contour lines never
// register. Columns 400..1040 (the head and helmet at 1440 wide) are skipped. Prints one line per
// shot: time, painted blocks, centroid (px) and bounding box of the painted blocks.
import { readFileSync, readdirSync } from 'node:fs';
import { PNG } from 'pngjs';
const [dir, mode = 'paint'] = process.argv.slice(2);
const B = 16;
const files = readdirSync(dir).filter((f) => /^[sv]\d+\.png$/.test(f)).sort();
for (const f of files) {
  const img = PNG.sync.read(readFileSync(`${dir}/${f}`)); const d = img.data, W = img.width, H = img.height;
  const k = W / 1440; // screenshots at 1440 CSS px; deviceScaleFactor 1 assumed
  let n = 0, sx = 0, sy = 0, minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
  for (let by = 0; by + B <= H; by += B) for (let bx = 0; bx + B <= W; bx += B) {
    const cx = bx + B / 2;
    if (cx > 400 * k && cx < 1040 * k) continue;
    let hit = 0;
    for (let y = by; y < by + B; y++) for (let x = bx; x < bx + B; x++) {
      const o = (y * W + x) * 4, r = d[o], g = d[o + 1], b = d[o + 2];
      // debug view: the mask is flat magenta
      if (mode === 'debug' ? (r > 200 && g < 60 && b > 200) : (252 - r > 4 && 252 - g > 4 && 250 - b > 4 && r > 200)) hit++;
    }
    if (hit > B * B * 0.7) { n++; sx += cx; sy += by + B / 2; minX = Math.min(minX, bx); maxX = Math.max(maxX, bx + B); minY = Math.min(minY, by); maxY = Math.max(maxY, by + B); }
  }
  const t = +f.slice(1, -4);
  console.log(String(t).padStart(6), 'ms  blocks', String(n).padStart(4), n ? ` centroid ${Math.round(sx / n)},${Math.round(sy / n)}  box x ${minX}-${maxX} y ${minY}-${maxY}` : '');
}
