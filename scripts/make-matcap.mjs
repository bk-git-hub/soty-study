// A matcap for the helmet's clear plastic parts: a lit sphere with a soft key light and a rim, drawn
// analytically. Replaces the original's studio matcap image. Usage: node scripts/make-matcap.mjs
import { writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
const S = 256, png = new PNG({ width: S, height: S });
const light = [-0.45, 0.6, 0.66]; // key light from the upper left, towards the viewer
for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
  const nx = (x + 0.5) / S * 2 - 1, ny = 1 - (y + 0.5) / S * 2; // matcap space: the sphere's normal
  const r2 = nx * nx + ny * ny, o = (y * S + x) * 4;
  let v = 0.08;
  if (r2 <= 1) {
    const nz = Math.sqrt(1 - r2);
    const diff = Math.max(0, nx * light[0] + ny * light[1] + nz * light[2]);
    const spec = Math.pow(diff, 40);
    const rim = Math.pow(1 - nz, 3); // grazing angles catch the environment: the clear-plastic look
    v = 0.12 + 0.35 * diff + 0.5 * spec + 0.45 * rim;
  }
  const c = Math.round(Math.min(1, v) * 255);
  png.data[o] = png.data[o + 1] = png.data[o + 2] = c; png.data[o + 3] = 255;
}
writeFileSync('public/assets/helmet/matcap-plastic.png', PNG.sync.write(png));
console.log('wrote public/assets/helmet/matcap-plastic.png');
