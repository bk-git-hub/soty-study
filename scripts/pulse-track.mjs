// Blueprint pulse over time, in one box of the helmet that has only page background behind it.
// Per frame: mean dip below the page white (249), the 2nd-percentile luminance (line cores) and the
// fraction of pixels darker than 240 (how much of the box is "drawn").
// Then: the period from the autocorrelation of the mean dip, peak/trough values.
// Usage: node scripts/pulse-track.mjs <framesDir> [x y w h = 540 110 90 70] [every=1] [csv]
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
const [dir, xs, ys, ws, hs, everyS, csv] = process.argv.slice(2);
const [x0, y0, w, h] = xs ? [+xs, +ys, +ws, +hs] : [540, 110, 90, 70];
const every = +(everyS || 1);
const files = readdirSync(dir).filter((f) => /^t\d+\.png$/.test(f)).sort().filter((_, i) => i % every === 0);
const rows = [];
for (const f of files) {
  const img = PNG.sync.read(readFileSync(join(dir, f))); const d = img.data, W = img.width;
  const l = [];
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const o = (y * W + x) * 4; l.push((d[o] + d[o + 1] + d[o + 2]) / 3); }
  l.sort((a, b) => a - b);
  const mean = l.reduce((s, v) => s + v, 0) / l.length;
  rows.push({ t: +f.slice(1, -4), dip: 249 - mean, p2: l[Math.floor(l.length * 0.02)], dark: l.filter((v) => v < 240).length / l.length });
}
if (csv) for (const r of rows) console.log(r.t, r.dip.toFixed(2), r.p2.toFixed(0), (r.dark * 100).toFixed(1));
// autocorrelation of the dip signal for lags 10..60 frames
const s = rows.map((r) => r.dip); const m = s.reduce((a, b) => a + b, 0) / s.length; const c = s.map((v) => v - m);
const dt = rows.length > 1 ? (rows[rows.length - 1].t - rows[0].t) / (rows.length - 1) : 40;
let best = { lag: 0, r: -1 };
for (let lag = Math.round(400 / dt); lag <= Math.round(2400 / dt); lag++) { let n = 0, d0 = 0; for (let i = 0; i + lag < c.length; i++) { n += c[i] * c[i + lag]; d0 += c[i] * c[i]; } const r = n / d0; if (r > best.r) best = { lag, r }; }
const dips = s.slice().sort((a, b) => a - b);
console.log(`${dir}: frames ${rows.length}, dt ${dt.toFixed(1)} ms, period ${(best.lag * dt).toFixed(0)} ms (r=${best.r.toFixed(2)}), dip max ${dips[dips.length - 1].toFixed(1)} p90 ${dips[Math.floor(dips.length * 0.9)].toFixed(1)} median ${dips[Math.floor(dips.length * 0.5)].toFixed(1)} p10 ${dips[Math.floor(dips.length * 0.1)].toFixed(1)} min ${dips[0].toFixed(1)}; p2 luminance min ${Math.min(...rows.map((r) => r.p2))} max ${Math.max(...rows.map((r) => r.p2))}`);
