// Exact area of the cursor paint per shot: pixels whose colour is one of the two paint greys
// (245,245,240 band 0 and borders, 233,234,228 band 1), which both the original and our page produce
// to the digit. Columns 400..1040 (head and helmet at 1440 wide) are skipped.
// Usage: node scripts/paint-area.mjs <dir>    -> one line per shot, then the sum over the series
import { readFileSync, readdirSync } from 'node:fs';
import { PNG } from 'pngjs';
const [dir] = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => /^[sv]\d+\.png$/.test(f)).sort();
let total = 0; const row = [];
for (const f of files) {
  const img = PNG.sync.read(readFileSync(`${dir}/${f}`)); const d = img.data, W = img.width, H = img.height;
  let n = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (x > 400 && x < 1040) continue;
    const o = (y * W + x) * 4, r = d[o], g = d[o + 1], b = d[o + 2];
    if ((r === 245 && g === 245 && b === 240) || (r === 233 && g === 234 && b === 228)) n++;
  }
  total += n; row.push(`${+f.slice(1, -4)}:${Math.round(n / 1000)}k`);
}
console.log(dir.split('/').pop(), '| shots', files.length, '| sum', total, 'px | mean', Math.round(total / files.length), 'px per shot');
console.log(row.join(' '));
