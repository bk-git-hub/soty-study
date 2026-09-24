// Pairs of stills side by side, one pair per row (the original left, ours right), optionally cropped and
// scaled: the side-by-side check the project rules ask for after every change, as one image.
// Usage: node scripts/pair-sheet.mjs <out.png> <scale> <crop: x0,y0,x1,y1 or -> <leftA> <rightA> [<leftB> <rightB> ...] [--gap r,g,b]
// The gap between panes is magenta by default (a check image); pass --gap 9,9,10 for a dark sheet meant to be shown.
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
const argv = process.argv.slice(2);
const gapAt = argv.indexOf('--gap');
const BG = gapAt >= 0 ? argv.splice(gapAt, 2)[1].split(',').map(Number) : [255, 0, 255];
const [out, scaleS, cropS, ...files] = argv;
const scale = +scaleS || 1, GAP = 6;
const crop = cropS === '-' ? null : cropS.split(',').map(Number);
const load = (f) => PNG.sync.read(readFileSync(f));
const region = (img) => crop ? { x0: crop[0], y0: crop[1], w: crop[2] - crop[0], h: crop[3] - crop[1] } : { x0: 0, y0: 0, w: img.width, h: img.height };
const first = load(files[0]), r0 = region(first);
const cw = Math.round(r0.w * scale), ch = Math.round(r0.h * scale), rows = files.length / 2;
const sheet = new PNG({ width: cw * 2 + GAP, height: ch * rows + GAP * (rows - 1) });
sheet.data.fill(255);
for (let i = 0; i < sheet.width * sheet.height; i++) { sheet.data[i * 4] = BG[0]; sheet.data[i * 4 + 1] = BG[1]; sheet.data[i * 4 + 2] = BG[2]; }
// box filter: each output pixel is the mean of the source pixels it covers
const blit = (img, dx, dy) => {
  const r = region(img), inv = 1 / scale;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const sx0 = r.x0 + Math.floor(x * inv), sx1 = r.x0 + Math.max(Math.floor(x * inv) + 1, Math.floor((x + 1) * inv));
    const sy0 = r.y0 + Math.floor(y * inv), sy1 = r.y0 + Math.max(Math.floor(y * inv) + 1, Math.floor((y + 1) * inv));
    let s = [0, 0, 0], n = 0;
    for (let sy = sy0; sy < sy1 && sy < img.height; sy++) for (let sx = sx0; sx < sx1 && sx < img.width; sx++) { const o = (sy * img.width + sx) * 4; s[0] += img.data[o]; s[1] += img.data[o + 1]; s[2] += img.data[o + 2]; n++; }
    const o = ((dy + y) * sheet.width + dx + x) * 4;
    if (n) { sheet.data[o] = s[0] / n; sheet.data[o + 1] = s[1] / n; sheet.data[o + 2] = s[2] / n; }
    sheet.data[o + 3] = 255;
  }
};
for (let row = 0; row < rows; row++) {
  blit(load(files[row * 2]), 0, row * (ch + GAP));
  blit(load(files[row * 2 + 1]), cw + GAP, row * (ch + GAP));
}
writeFileSync(out, PNG.sync.write(sheet));
console.log('wrote', out, `${sheet.width}x${sheet.height}`, rows, 'rows');
