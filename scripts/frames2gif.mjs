// PNG frame sequence -> GIF. Usage: node scripts/frames2gif.mjs <dir> <out.gif> <fromMs> <toMs> [every=2] [x y w h] [scale=0.5]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import gifenc from 'gifenc';
const { GIFEncoder, quantize, applyPalette } = gifenc;
const [dir, out, fromS, toS, everyS, xs, ys, ws, hs, scS] = process.argv.slice(2);
const from = +fromS, to = +toS, every = +(everyS || 2), sc = +(scS || 0.5);
const box = xs ? [+xs, +ys, +ws, +hs] : null;
const files = readdirSync(dir).filter((f) => /^t\d+\.png$/.test(f)).filter((f) => { const t = +f.slice(1, -4); return t >= from && t <= to; }).sort().filter((_, i) => i % every === 0);
const gif = GIFEncoder();
let W, H;
for (const f of files) {
  const img = PNG.sync.read(readFileSync(join(dir, f)));
  const [bx, by, bw, bh] = box || [0, 0, img.width, img.height];
  W = Math.round(bw * sc); H = Math.round(bh * sc);
  const rgba = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    // box-filter downscale
    let r = 0, g = 0, b = 0, n = 0;
    const sx0 = bx + Math.floor(x / sc), sy0 = by + Math.floor(y / sc), k = Math.max(1, Math.round(1 / sc));
    for (let yy = 0; yy < k; yy++) for (let xx = 0; xx < k; xx++) { const o = ((sy0 + yy) * img.width + (sx0 + xx)) * 4; r += img.data[o]; g += img.data[o + 1]; b += img.data[o + 2]; n++; }
    const i = (y * W + x) * 4; rgba[i] = r / n; rgba[i + 1] = g / n; rgba[i + 2] = b / n; rgba[i + 3] = 255;
  }
  const palette = quantize(rgba, 256);
  const index = applyPalette(rgba, palette);
  gif.writeFrame(index, W, H, { palette, delay: Math.round(1000 / 25 * every) });
}
gif.finish();
writeFileSync(out, gif.bytes());
console.log('gif', files.length, 'frames', W + 'x' + H, '->', out, (gif.bytes().length / 1024).toFixed(0) + ' KB');
