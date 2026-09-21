// How much of the lime signature is drawn at each scroll position? Counts pixels of the signature's own
// bright lime (#d2ff00) below the nav; the serif marquee line is a duller lime and is not counted.
// Usage: node scripts/lime-count.mjs <dir of sNNNNN.png> [skipTopPx=90]
import { readFileSync, readdirSync } from 'node:fs';
import { PNG } from 'pngjs';
const [dir, skipS] = process.argv.slice(2), skip = +(skipS || 90);
const files = readdirSync(dir).filter((f) => /^s\d+\.png$/.test(f)).sort();
const rows = files.map((f) => {
  const { width: W, height: H, data } = PNG.sync.read(readFileSync(`${dir}/${f}`));
  let n = 0, x0 = W, x1 = 0, y0 = H, y1 = 0;
  for (let y = skip; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, r = data[i], g = data[i + 1], b = data[i + 2];
    if (r > 185 && r < 235 && g > 238 && b < 70) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return { y: +f.slice(1, 6), n, box: n ? `${x0},${y0} - ${x1},${y1}` : '' };
});
const max = Math.max(...rows.map((r) => r.n));
for (const r of rows) console.log(String(r.y).padStart(5), String(r.n).padStart(7), (r.n / max).toFixed(3), ' ', r.box);
