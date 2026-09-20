// The helmet row's hover fills the whole page with the cursor paint, top to bottom. Per screencast frame:
// for a few vertical strips of background (left and right of the head) find how far down the paint
// reaches, i.e. the lowest row that is still solidly painted when walking down from the top.
// Painted = one of the two paint greys (245,245,240 / 233,234,228), which both sites produce to the digit.
// The fluid's own strokes are painted too, so a strip only counts as "filled to y" while every 8-row
// block above y is at least 85 % painted.
// Usage: node scripts/hover-fill.mjs <dir> [onMs] [offMs]
import { readFileSync, readdirSync } from 'node:fs';
import { PNG } from 'pngjs';
const [dir, onS, offS] = process.argv.slice(2);
const on = +(onS || 0), off = +(offS || 1e9);
const STRIPS = [[150, 250], [300, 390], [1050, 1140], [1190, 1290]]; // x ranges clear of the card, nav and head
const BLOCK = 8, TOP = 100, BOTTOM = 660; // rows clear of the nav (top) and the card (bottom left)
const files = readdirSync(dir).filter((f) => /^f\d+\.png$/.test(f)).sort();
const rows = [];
for (const f of files) {
  const img = PNG.sync.read(readFileSync(`${dir}/${f}`)); const d = img.data, W = img.width;
  const fronts = STRIPS.map(([x0, x1]) => {
    let y = TOP;
    for (; y + BLOCK <= BOTTOM; y += BLOCK) {
      let hit = 0, n = 0;
      for (let yy = y; yy < y + BLOCK; yy++) for (let x = x0; x < x1; x += 2) { const o = (yy * W + x) * 4, r = d[o], g = d[o + 1], b = d[o + 2]; n++; if ((r === 245 && g === 245 && b === 240) || (r === 233 && g === 234 && b === 228)) hit++; }
      if (hit / n < 0.85) break;
    }
    return y;
  });
  rows.push([+f.slice(1, -4), fronts]);
}
const span = BOTTOM - TOP;
for (const [ms, fr] of rows) {
  const tag = ms < on ? '      ' : ms < off ? ' HOVER' : ' after';
  console.log(String(ms).padStart(6), 'ms', tag, ' front y per strip:', fr.map((y) => String(y).padStart(4)).join(' '), '  mean progress', (fr.reduce((s, y) => s + (y - TOP) / span, 0) / fr.length).toFixed(2));
}
