// Where is the hero's shrinking rectangle at each scroll position? Reads the stills of scroll-series.mjs.
// A row belongs to the rectangle's "clean" part (above the hair) when it holds one long unbroken run of
// neutral pixels clearly brighter than the dark page: the big marquee letters and the contour lines only
// ever give short runs. Left/right are the median run ends over those rows, top is the first of them;
// the bottom is found by walking down a column just inside the left edge.
// Usage: node scripts/rect-track.mjs <dir> [minRun=0.12 of width]
import { readFileSync, readdirSync } from 'node:fs';
import { PNG } from 'pngjs';
const [dir, minRunS] = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => /^s\d+\.png$/.test(f)).sort();
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
console.log('scrollY  left  top  right bottom   w    h   aspect  inside(rgb)      outside(rgb)');
for (const f of files) {
  const png = PNG.sync.read(readFileSync(`${dir}/${f}`)), { width: W, height: H, data } = png;
  const px = (x, y) => { const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
  // the dark page colour: darkest corner-ish sample that is not the rectangle (bottom-right is never inside once it shrinks)
  const bg = px(W - 3, H - 3);
  const lum = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
  const isRect = (c) => lum(c) - Math.min(lum(bg), 60) > 14 && Math.abs(c[0] - c[1]) < 16 && c[1] - c[2] < 26 && c[1] - c[2] > -10;
  const minRun = Math.round(W * +(minRunS || 0.12));
  const rows = [];
  for (let y = 0; y < H; y++) {
    let best = 0, bl = 0, br = 0, start = -1, gap = 0;
    for (let x = 0; x <= W; x++) {
      const ok = x < W && isRect(px(x, y));
      if (ok) { if (start < 0) start = x; gap = 0; }
      else if (start >= 0) { gap++; if (gap > 2 || x === W) { const end = x - gap; if (end - start > best) { best = end - start; bl = start; br = end; } start = -1; gap = 0; } }
    }
    if (best >= minRun) rows.push({ y, l: bl, r: br });
  }
  if (rows.length < 6) { console.log(f.slice(1, 6), ' (no rectangle found)'); continue; }
  // Only the rows above the hair span the whole rectangle; rows through the face give "left of the face",
  // and there are far more of those, so a median over all rows lands on them (first attempt: aspect 17).
  // Keep the rows whose run is (nearly) the longest one found.
  const longest = Math.max(...rows.map((r) => r.r - r.l));
  const widest = rows.filter((r) => r.r - r.l >= longest - 4);
  const L = median(widest.map((r) => r.l)), R = median(widest.map((r) => r.r));
  const good = widest.filter((r) => Math.abs(r.l - L) <= 3 && Math.abs(r.r - R) <= 3);
  const top = good.length ? good[0].y : rows[0].y;
  // bottom: walk down a column a little inside the left edge while it stays "rectangle"
  let bottom = top; const cx = Math.min(W - 1, L + Math.max(4, Math.round((R - L) * 0.02)));
  for (let y = top, miss = 0; y < H; y++) { if (isRect(px(cx, y))) { bottom = y; miss = 0; } else if (++miss > 6) break; }
  const w = R - L + 1, h = bottom - top + 1;
  const ins = px(Math.min(W - 1, L + 8), Math.min(H - 1, top + 8));
  console.log(f.slice(1, 6).padStart(6), String(L).padStart(6), String(top).padStart(4), String(R).padStart(6), String(bottom).padStart(6), String(w).padStart(5), String(h).padStart(4), (w / h).toFixed(3).padStart(7), ' ', ins.join(',').padEnd(14), bg.join(','));
}
