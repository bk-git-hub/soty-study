// Contrast stretch for faint lines: maps luminance [lo, hi] -> [0, 255]. Usage: node scripts/stretch.mjs <in.png> <out.png> [lo=200] [hi=252]
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
const [inF, outF, loS, hiS] = process.argv.slice(2);
const lo = +(loS || 200), hi = +(hiS || 252);
const img = PNG.sync.read(readFileSync(inF)); const d = img.data;
for (let i = 0; i < d.length; i += 4) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; const v = Math.max(0, Math.min(255, Math.round((l - lo) / (hi - lo) * 255))); d[i] = d[i + 1] = d[i + 2] = v; }
writeFileSync(outF, PNG.sync.write(img));
