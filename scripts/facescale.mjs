// Find the portrait's scale and position in a capture by matching a face template (eyes + nose) taken
// from a reference capture: brute-force search over scale and offset, sum of squared luminance
// differences on 2x-downsampled images. Prints the best scale (target / template) and the template's
// centre in the target. Usage: node scripts/facescale.mjs <template.png> <tx> <ty> <tw> <th> <target.png> [smin=0.4] [smax=1.1]
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
const [tf, txs, tys, tws, ths, target, sminS, smaxS] = process.argv.slice(2);
const smin = +(sminS || 0.4), smax = +(smaxS || 1.1);
const luma = (png) => { const W = png.width >> 1, H = png.height >> 1, out = new Float32Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0; for (let yy = 0; yy < 2; yy++) for (let xx = 0; xx < 2; xx++) { const o = (((y * 2 + yy) * png.width) + x * 2 + xx) * 4; s += (png.data[o] + png.data[o + 1] + png.data[o + 2]) / 3; } out[y * W + x] = s / 4; } return { W, H, d: out }; };
const T = luma(PNG.sync.read(readFileSync(tf))), G = luma(PNG.sync.read(readFileSync(target)));
const tx = +txs >> 1, ty = +tys >> 1, tw = +tws >> 1, th = +ths >> 1;
// template pixels (subsampled every 2nd px for speed)
const tpl = []; for (let y = 0; y < th; y += 2) for (let x = 0; x < tw; x += 2) tpl.push([x, y, T.d[(ty + y) * T.W + tx + x]]);
const mean = tpl.reduce((s, p) => s + p[2], 0) / tpl.length;
let best = { err: Infinity };
for (let s = smin; s <= smax + 1e-9; s += 0.01) {
  const sw = tw * s, sh = th * s;
  for (let oy = 0; oy + sh < G.H; oy += 2) for (let ox = 0; ox + sw < G.W; ox += 2) {
    let err = 0, n = 0, gm = 0;
    // brightness-normalised SSD
    const vals = new Float32Array(tpl.length);
    for (let i = 0; i < tpl.length; i++) { const [x, y] = tpl[i]; const gx = Math.round(ox + x * s), gy = Math.round(oy + y * s); vals[i] = G.d[gy * G.W + gx]; gm += vals[i]; }
    gm /= tpl.length;
    for (let i = 0; i < tpl.length; i++) { const e = (tpl[i][2] - mean) - (vals[i] - gm); err += e * e; n++; }
    err /= n;
    if (err < best.err) best = { err, s, ox, oy };
  }
}
const cx = (best.ox + tw * best.s / 2) * 2, cy = (best.oy + th * best.s / 2) * 2;
console.log(target.split('/').pop().padEnd(20), 'scale', best.s.toFixed(2), 'centre', cx.toFixed(0) + ',' + cy.toFixed(0), 'err', best.err.toFixed(1));
