// Blend two same-size PNGs 50/50 (reference tinted magenta, local tinted green) to see position/scale offsets.
// Usage: node scripts/overlay.mjs <ref.png> <local.png> <out.png>
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
const [a, b, out] = process.argv.slice(2);
const A = PNG.sync.read(readFileSync(a)), B = PNG.sync.read(readFileSync(b));
const o = new PNG({ width: A.width, height: A.height });
for (let p = 0; p < A.width * A.height * 4; p += 4) {
  const la = (A.data[p] + A.data[p + 1] + A.data[p + 2]) / 3, lb = (B.data[p] + B.data[p + 1] + B.data[p + 2]) / 3;
  // reference -> magenta channels, local -> green channel: where both agree the result is grey
  o.data[p] = la; o.data[p + 1] = lb; o.data[p + 2] = la; o.data[p + 3] = 255;
}
writeFileSync(out, PNG.sync.write(o));
console.log('wrote', out);
