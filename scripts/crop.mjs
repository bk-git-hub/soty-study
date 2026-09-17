// Crop a region out of a PNG: node scripts/crop.mjs <in.png> <out.png> x y w h
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
const [inp, out, x, y, w, h] = process.argv.slice(2);
const src = PNG.sync.read(readFileSync(inp));
const dst = new PNG({ width: +w, height: +h });
PNG.bitblt(src, dst, +x, +y, +w, +h, 0, 0);
writeFileSync(out, PNG.sync.write(dst));
