// Per-row left/right extent of dark pixels (< thr) in a line map; prints centre and width per row plus means.
// Usage: node scripts/extents.mjs <a.png> <b.png> [y0=60] [y1=600] [step=30] [thr=200] [run=3]
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
const [a, b, y0s, y1s, steps, thrS, runS, thrBS] = process.argv.slice(2);
const y0 = +(y0s || 60), y1 = +(y1s || 600), step = +(steps || 30), thrA = +(thrS || 200), RUN = +(runS || 3), thrB = +(thrBS || thrA);
const ext = (f, thr) => {
  const img = PNG.sync.read(readFileSync(f)); const d = img.data, W = img.width; const rows = {};
  for (let y = y0; y <= y1; y += step) {
    let l = -1, r = -1, run = 0;
    for (let x = 0; x < W; x++) { const dark = d[(y * W + x) * 4] < thr; if (dark) { run++; if (run >= RUN && l < 0) l = x - RUN + 1; } else run = 0; }
    run = 0; for (let x = W - 1; x >= 0; x--) { const dark = d[(y * W + x) * 4] < thr; if (dark) { run++; if (run >= RUN) { r = x + RUN - 1; break; } } else run = 0; }
    rows[y] = [l, r];
  }
  return rows;
};
const top = (f, thr) => { const img = PNG.sync.read(readFileSync(f)); const d = img.data, W = img.width; for (let y = 0; y < img.height; y++) { let n = 0; for (let x = 0; x < W; x++) if (d[(y * W + x) * 4] < thr) n++; if (n > 40) return y; } return -1; };
console.log('top row with content: A', top(a, thrA), ' B', top(b, thrB));
const A = ext(a, thrA), B = ext(b, thrB); let dc = [], wr = [];
console.log('row   A:left right  centre width | B:left right centre width | dCentre  widthRatio');
for (const y of Object.keys(A)) {
  const [al, ar] = A[y], [bl, br] = B[y]; if (al < 0 || bl < 0 || ar <= al || br <= bl) continue;
  const ac = (al + ar) / 2, aw = ar - al, bc = (bl + br) / 2, bw = br - bl; dc.push(bc - ac); wr.push(bw / aw);
  console.log(String(y).padStart(3), String(al).padStart(6), String(ar).padStart(5), String(ac.toFixed(0)).padStart(7), String(aw).padStart(6), ' |', String(bl).padStart(5), String(br).padStart(5), String(bc.toFixed(0)).padStart(6), String(bw).padStart(5), ' |', String((bc - ac).toFixed(0)).padStart(7), String((bw / aw).toFixed(3)).padStart(11));
}
const mean = (v) => v.reduce((s, x) => s + x, 0) / v.length;
console.log('mean dCentre (B - A):', mean(dc).toFixed(1), 'px   mean widthRatio (B / A):', mean(wr).toFixed(3));
