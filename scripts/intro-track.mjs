// Measure a loader intro from screencast frames (see screencast.mjs). Per frame:
//   lime  = share of the page that is still the loader's lime (r 180-235, g > 235, b < 60)
//   ink   = dark pixels (the mark while it is drawn in ink) inside the centre box, with their bounding box
//   hole  = non-lime, non-dark pixels inside the centre box (the mark once it has become a window)
// Usage: node scripts/intro-track.mjs <dir> [fromMs=0] [toMs=inf] [box=200]   (box = half size of the centre box, px)
import { readFileSync, readdirSync } from 'node:fs';
import { PNG } from 'pngjs';
const [dir, fromS, toS, boxS] = process.argv.slice(2);
const from = +(fromS || 0), to = toS ? +toS : Infinity, half = +(boxS || 200);
const files = readdirSync(dir).filter((f) => /^f\d+\.png$/.test(f)).sort().filter((f) => { const t = +f.slice(1, -4); return t >= from && t <= to; });
for (const f of files) {
  const img = PNG.sync.read(readFileSync(`${dir}/${f}`)); const d = img.data, W = img.width, H = img.height;
  const cx = W >> 1, cy = H >> 1;
  let lime = 0, ink = 0, hole = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4, r = d[o], g = d[o + 1], b = d[o + 2];
    const isLime = r > 180 && r < 236 && g > 235 && b < 60;
    if (isLime) lime++;
    if (Math.abs(x - cx) <= half && Math.abs(y - cy) <= half) {
      const dark = r < 90 && g < 110 && b < 90;
      if (dark) { ink++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      else if (!isLime) hole++;
    }
  }
  console.log(String(+f.slice(1, -4)).padStart(6), 'ms  lime', (lime / (W * H) * 100).toFixed(1).padStart(5) + '%', ' ink', String(ink).padStart(5), ink ? `box ${x0},${y0}-${x1},${y1} (${x1 - x0 + 1}x${y1 - y0 + 1})` : ''.padEnd(10), ' hole', hole);
}
