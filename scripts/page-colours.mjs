// Per still: the page's background colour (most common), the line colour (most common among pixels that are
// a little off the background) and the share of such line pixels, in a strip free of the nav.
// Usage: node scripts/page-colours.mjs <dir> [x0=0] [x1=width] [y0=90] [y1=height]
import { readFileSync, readdirSync } from 'node:fs';
import { PNG } from 'pngjs';
const [dir, x0S, x1S, y0S, y1S] = process.argv.slice(2);
for (const f of readdirSync(dir).filter((n) => /^s\d+\.png$/.test(n)).sort()) {
  const png = PNG.sync.read(readFileSync(`${dir}/${f}`)), W = png.width, x0 = +(x0S || 0), x1 = +(x1S || W), y0 = +(y0S || 90), y1 = +(y1S || png.height);
  const hist = new Map(); let n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * W + x) * 4, k = (png.data[i] << 16) | (png.data[i + 1] << 8) | png.data[i + 2]; hist.set(k, (hist.get(k) || 0) + 1); n++; }
  const sorted = [...hist.entries()].sort((a, b) => b[1] - a[1]);
  const bg = sorted[0][0], br = bg >> 16, bgg = (bg >> 8) & 255, bb = bg & 255;
  let lineK = null, lineN = 0, near = 0;
  for (const [k, c] of sorted) { const d = Math.abs((k >> 16) - br) + Math.abs(((k >> 8) & 255) - bgg) + Math.abs((k & 255) - bb); if (d >= 10 && d < 80) { near += c; if (lineK === null) { lineK = k; lineN = c; } } }
  const hex = (k) => '#' + k.toString(16).padStart(6, '0');
  console.log(f.slice(1, 6), 'bg', hex(bg), `(${(sorted[0][1] / n * 100).toFixed(0)}%)`, ' line', lineK === null ? '-' : hex(lineK), ` off-bg pixels ${(near / n * 100).toFixed(1)}%`);
}
