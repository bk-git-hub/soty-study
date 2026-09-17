// "Everything ever drawn": per pixel, the strongest grey-line response over all frames of a recording,
// inside the helmet box. Dark = a line was drawn there at some point. Skips black print, hair and skin
// by requiring light-grey, low-saturation pixels. Usage: node scripts/line-union.mjs <dir> <out.png> [every=2] [x0 y0 w h]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
const [dir, out, everyS, fromS, ...box] = process.argv.slice(2);
const every = +(everyS || 2); const from = +(fromS || 0); // skip frames before <from> ms (intro / solid helmet)
const [x0, y0, w, h] = (box.length === 4 ? box : [400, 40, 640, 700]).map(Number);
const FRAME = new RegExp("^t[0-9]+[.]png$");
const files = readdirSync(dir).filter((f) => FRAME.test(f)).filter((f) => +f.slice(1, -4) >= from).sort().filter((_, i) => i % every === 0);
const acc = new Float32Array(w * h);
for (const f of files) {
  const img = PNG.sync.read(readFileSync(join(dir, f))); const d = img.data, W = img.width;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = ((y + y0) * W + (x + x0)) * 4; const r = d[o], g = d[o + 1], b = d[o + 2];
    const l = (r + g + b) / 3, sat = Math.max(r, g, b) - Math.min(r, g, b);
    if (l > 130 && l < 232 && sat < 16) { const v = 232 - l; const i = y * w + x; if (v > acc[i]) acc[i] = v; }
  }
}
const png = new PNG({ width: w, height: h });
for (let i = 0; i < w * h; i++) { const v = Math.max(0, 255 - Math.min(255, acc[i] * 3)); png.data[i * 4] = v; png.data[i * 4 + 1] = v; png.data[i * 4 + 2] = v; png.data[i * 4 + 3] = 255; }
writeFileSync(out, PNG.sync.write(png));
console.log('frames', files.length, '->', out);
