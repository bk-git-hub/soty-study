// Crop a region out of a PNG, optionally upscaled (nearest neighbour): node scripts/crop.mjs <in> <out> x y w h [scale=1]
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
const [inp, out, x, y, w, h, sc] = process.argv.slice(2);
const s = +(sc || 1);
const src = PNG.sync.read(readFileSync(inp));
const dst = new PNG({ width: +w * s, height: +h * s });
for (let yy = 0; yy < +h * s; yy++) for (let xx = 0; xx < +w * s; xx++) {
  const si = ((+y + Math.floor(yy / s)) * src.width + (+x + Math.floor(xx / s))) * 4, di = (yy * dst.width + xx) * 4;
  dst.data[di] = src.data[si]; dst.data[di + 1] = src.data[si + 1]; dst.data[di + 2] = src.data[si + 2]; dst.data[di + 3] = 255;
}
writeFileSync(out, PNG.sync.write(dst));
