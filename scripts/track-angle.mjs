// Orientation of the little track in the NEXT RACE card, frame by frame (screencast frames at 1440x900).
// The outline is dark ink on the page colour. Per frame: the ink's principal axis (PCA) gives an angle
// 0..180; the side on which the ink is heavier (the circuit's "blob" end holds more line than the long
// straight) resolves it to 0..360. Apparent angles are not the true rotation (the view is tilted), but
// the time between equal apparent angles is the rotation period.
// Usage: node scripts/track-angle.mjs <dir> [x0=17] [y0=700] [w=99] [h=58]
import { readFileSync, readdirSync } from 'node:fs';
import { PNG } from 'pngjs';
const [dir, x0s, y0s, ws, hs] = process.argv.slice(2);
const X0 = +(x0s || 17), Y0 = +(y0s || 700), Wd = +(ws || 99), Hd = +(hs || 58);
const files = readdirSync(dir).filter((f) => /^[fs]\d+\.png$/.test(f)).sort();
let prev = null, unwrapped = 0; const rows = [];
for (const f of files) {
  const img = PNG.sync.read(readFileSync(`${dir}/${f}`)); const d = img.data, W = img.width;
  const pts = [];
  for (let y = Y0; y < Y0 + Hd; y++) for (let x = X0 + 3; x < X0 + Wd - 3; x++) { const o = (y * W + x) * 4; if (d[o] < 140 && d[o + 1] < 140 && d[o + 2] < 140) pts.push([x, y]); }
  if (pts.length < 20) continue;
  let mx = 0, my = 0; for (const [x, y] of pts) { mx += x; my += y; } mx /= pts.length; my /= pts.length;
  let sxx = 0, syy = 0, sxy = 0; for (const [x, y] of pts) { sxx += (x - mx) ** 2; syy += (y - my) ** 2; sxy += (x - mx) * (y - my); }
  let th = 0.5 * Math.atan2(2 * sxy, sxx - syy); // major axis, -90..90 (screen coords, y down)
  const ux = Math.cos(th), uy = Math.sin(th);
  // extent along the axis on either side of the centroid: the long straight reaches further than the blob
  let lo = 0, hi = 0; for (const [x, y] of pts) { const s = (x - mx) * ux + (y - my) * uy; if (s < lo) lo = s; if (s > hi) hi = s; }
  if (-lo > hi) th += Math.PI; // point the axis toward the far (straight) end
  let deg = ((th * 180) / Math.PI + 360) % 360;
  const len = hi - lo, t = +f.slice(1, -4);
  if (prev !== null) { let dd = deg - prev; while (dd > 180) dd -= 360; while (dd < -180) dd += 360; unwrapped += dd; }
  prev = deg; rows.push([t, deg, unwrapped, len, pts.length]);
}
for (const [t, deg, un, len, n] of rows) console.log(String(t).padStart(6), 'ms  angle', deg.toFixed(0).padStart(4), ' unwrapped', un.toFixed(0).padStart(6), ' length', len.toFixed(0).padStart(3), 'px  ink', n);
if (rows.length > 4) {
  const a = rows[0], b = rows[rows.length - 1];
  console.log(`\napparent turn: ${(b[2] - a[2]).toFixed(0)} deg in ${((b[0] - a[0]) / 1000).toFixed(2)} s  ->  ${(((b[2] - a[2]) / (b[0] - a[0])) * 1000).toFixed(1)} deg/s, period ${Math.abs(360 / (((b[2] - a[2]) / (b[0] - a[0])) * 1000)).toFixed(2)} s`);
}
