// By how much must B's picture inside the hero's rectangle be magnified (about the rectangle's centre, plus a
// vertical shift) to lie on top of A's? Brute force over scale and shift on grey values; lime pixels (the
// signature) are ignored. The rectangle is computed from the scroll-out law, so both stills must share
// the scroll position. Usage: node scripts/scale-match.mjs <dirA> <dirB> <targetW> <targetH> <y1,y2,...>
import { readFileSync, readdirSync } from 'node:fs';
import { PNG } from 'pngjs';
const [dirA, dirB, twS, thS, ysS] = process.argv.slice(2);
const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p));
const nearest = (dir, y) => readdirSync(dir).filter((f) => /^s\d+\.png$/.test(f)).map((f) => [Math.abs(+f.slice(1, 6) - y), f]).sort((a, b) => a[0] - b[0])[0][1];
const grey = (png) => { const g = new Float32Array(png.width * png.height), m = new Uint8Array(png.width * png.height);
  for (let i = 0, j = 0; j < g.length; i += 4, j++) { const r = png.data[i], gg = png.data[i + 1], b = png.data[i + 2]; g[j] = 0.3 * r + 0.59 * gg + 0.11 * b; m[j] = gg > 200 && b < 120 && r > 150 ? 1 : 0; } return { g, m }; };
for (const y of ysS.split(',').map(Number)) {
  const A = PNG.sync.read(readFileSync(`${dirA}/${nearest(dirA, y)}`)), B = PNG.sync.read(readFileSync(`${dirB}/${nearest(dirB, y)}`));
  const W = A.width, H = A.height, e = ease(Math.min(1, y / H)), rw = W + (+twS - W) * e, rh = H + (+thS - H) * e, cx = W / 2, cy = H / 2;
  const a = grey(A), b = grey(B);
  // compare inside the middle 70 % x 80 % of the rectangle, every 2nd pixel
  const x0 = Math.round(cx - rw * 0.35), x1 = Math.round(cx + rw * 0.35), y0 = Math.round(cy - rh * 0.4), y1 = Math.round(cy + rh * 0.4);
  let best = { err: Infinity };
  for (let s = 0.9; s <= 1.6001; s += 0.01) for (let dy = -60; dy <= 60; dy += 2) {
    let err = 0, n = 0;
    for (let yy = y0; yy < y1; yy += 2) for (let xx = x0; xx < x1; xx += 2) {
      const sx = Math.round(cx + (xx - cx) / s), sy = Math.round(cy + (yy - cy - dy) / s);
      if (sx < 0 || sx >= W || sy < 0 || sy >= H) continue;
      const ia = yy * W + xx, ib = sy * W + sx; if (a.m[ia] || b.m[ib]) continue;
      err += Math.abs(a.g[ia] - b.g[ib]); n++;
    }
    if (n > 500 && err / n < best.err) best = { err: err / n, s, dy };
  }
  console.log(`scrollY ${String(y).padStart(4)}  e ${e.toFixed(3)}  rectH/H ${(rh / H).toFixed(3)}  B must be magnified x${best.s.toFixed(2)}, shifted ${best.dy} px  (mean grey error ${best.err.toFixed(1)})`);
}
