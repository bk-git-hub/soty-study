// What does the scroll-out's filter do to the photo? Point-to-point matching between scroll positions failed
// (the mapped points landed on hair instead of skin), so this follows two things that need no alignment:
// the brightest skin and the darkest hair inside the face area of the rectangle, per scroll position.
// Usage: node scripts/filter-sample.mjs <dir of sNNNNN.png> <targetW> <targetH> [stickyPx = image height]
import { readFileSync, readdirSync } from 'node:fs';
import { PNG } from 'pngjs';
const [dir, twS, thS, stickyS] = process.argv.slice(2);
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p));
for (const f of readdirSync(dir).filter((n) => /^s\d+\.png$/.test(n)).sort()) {
  const png = PNG.sync.read(readFileSync(`${dir}/${f}`)), { width: W, height: H, data } = png;
  const y = +f.slice(1, 6), sticky = +(stickyS || H); if (y > sticky + 40) break;
  const e = ease(Math.min(1, y / sticky)), rw = W + (+twS - W) * e, rh = H + (+thS - H) * e;
  const cy = H / 2 - Math.max(0, y - sticky);
  // face area: the middle 22 % x 50 % of the rectangle, a little above its centre
  const x0 = Math.round(W / 2 - rw * 0.11), x1 = Math.round(W / 2 + rw * 0.11), y0 = Math.round(cy - rh * 0.3), y1 = Math.round(cy + rh * 0.2);
  const px = [];
  for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const i = (yy * W + xx) * 4, r = data[i], g = data[i + 1], b = data[i + 2];
    if (g > 200 && b < 110 && r > 150) continue; // the signature
    px.push([r, g, b, 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)]); }
  px.sort((a, b) => a[3] - b[3]);
  const avg = (from, to) => { const s = px.slice(Math.floor(px.length * from), Math.floor(px.length * to)); return [0, 1, 2].map((c) => Math.round(s.reduce((t, p) => t + p[c], 0) / s.length)); };
  const hi = avg(0.9, 0.97), lo = avg(0.02, 0.08), page = [0, 1, 2].map((c) => data[((Math.round(cy - rh / 2) + 6) * W + Math.round(W / 2 - rw / 2) + 6) * 4 + c]);
  console.log(String(y).padStart(5), 'e', e.toFixed(3), ' page', page.join(',').padEnd(12), ' skin', hi.join(',').padEnd(12), ' hair', lo.join(',').padEnd(10), ' skin sat', ((Math.max(...hi) - Math.min(...hi)) / Math.max(...hi)).toFixed(2));
}
