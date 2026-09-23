// Generates our own visor ("glass") textures for the helmet: a black visor with a sun strip in the site's
// lime carrying a wordmark (Mona Sans, OFL), plus a roughness map built from the visor's own UV islands
// (glossy visor, satin hardware). Self-made, so it can be published.
// Usage: node scripts/make-visor.mjs [text="SOTY STUDY"]
//   writes public/assets/helmet/visor-base.webp and public/assets/helmet/visor-roughness.png
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { chromium } from 'playwright';

const TEXT = process.argv[2] || 'SOTY STUDY';
const SIZE = 2048;
// the sun strip band on the visor island, in UV (measured on the original's layout: the white panel
// rows 76..116 of 1024, the strip runs from the left tab to the right tab)
const STRIP = { u0: 0.13, u1: 0.87, v0: 0.073, v1: 0.114 };
const LIME = '#d2ff00', DARK = '#282c20';

// --- base colour: Chromium canvas, for the text ---------------------------------------------------
const font = readFileSync('public/fonts/MonaSans-Variable.ttf').toString('base64');
const b = await chromium.launch({ channel: 'chromium' });
const page = await b.newPage();
const dataUrl = await page.evaluate(async ({ SIZE, STRIP, TEXT, LIME, DARK, font }) => {
  const ff = new FontFace('Mona', `url(data:font/ttf;base64,${font})`);
  await ff.load(); document.fonts.add(ff);
  const c = document.createElement('canvas'); c.width = SIZE; c.height = SIZE;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, SIZE, SIZE); // the visor and all its hardware: black
  const x = STRIP.u0 * SIZE, w = (STRIP.u1 - STRIP.u0) * SIZE, y = STRIP.v0 * SIZE, h = (STRIP.v1 - STRIP.v0) * SIZE;
  ctx.fillStyle = LIME; ctx.fillRect(x, y, w, h);
  // the wordmark, centred on the strip; the visor island reads the texture unmirrored (checked in the render)
  ctx.fillStyle = DARK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(h * 0.62)}px Mona`;
  ctx.letterSpacing = `${Math.round(h * 0.08)}px`;
  ctx.fillText(TEXT, x + w / 2, y + h / 2 + h * 0.03);
  return c.toDataURL('image/webp', 0.92);
}, { SIZE, STRIP, TEXT, LIME, DARK, font });
await b.close();
writeFileSync('public/assets/helmet/visor-base.webp', Buffer.from(dataUrl.split(',')[1], 'base64'));

// --- roughness: from the glass mesh's UV triangles -----------------------------------------------
const buf = readFileSync('public/orig/runtime/models/decoded/helmet-21.glb');
const jsonLen = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString());
const bin = buf.subarray(20 + jsonLen + 8);
const accessor = (i) => {
  const a = gltf.accessors[i], bv = gltf.bufferViews[a.bufferView];
  const comps = { SCALAR: 1, VEC2: 2, VEC3: 3 }[a.type], float = a.componentType === 5126, bytes = float ? 4 : 2;
  const stride = bv.byteStride || comps * bytes, base = bv.byteOffset + (a.byteOffset || 0);
  const out = new Float64Array(a.count * comps);
  for (let n = 0; n < a.count; n++) for (let c = 0; c < comps; c++) {
    const off = base + n * stride + c * bytes;
    out[n * comps + c] = float ? bin.readFloatLE(off) : bin.readUInt16LE(off);
  }
  return out;
};
const prim = gltf.meshes[gltf.nodes.find((n) => n.name === 'glass').mesh].primitives[0];
const uv = accessor(prim.attributes.TEXCOORD_0), idx = accessor(prim.indices);
const R = 512; // roughness needs no detail
const png = new PNG({ width: R, height: R });
png.data.fill(255);
const HARDWARE = 0.4, VISOR = 0.06; // satin screws and rings, glossy visor
const fillTri = (ax, ay, bx, by, cx, cy, value) => {
  const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx))), maxX = Math.min(R - 1, Math.ceil(Math.max(ax, bx, cx)));
  const minY = Math.max(0, Math.floor(Math.min(ay, by, cy))), maxY = Math.min(R - 1, Math.ceil(Math.max(ay, by, cy)));
  const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const px = x + 0.5, py = y + 0.5;
    const w0 = ((bx - px) * (cy - py) - (cx - px) * (by - py)) / area;
    const w1 = ((cx - px) * (ay - py) - (ax - px) * (cy - py)) / area;
    const w2 = 1 - w0 - w1;
    if (w0 < -0.02 || w1 < -0.02 || w2 < -0.02) continue; // a little slack so island edges are covered
    const o = (y * R + x) * 4; png.data[o] = png.data[o + 1] = png.data[o + 2] = Math.round(value * 255);
  }
};
// which triangles are the visor itself: the big island in the top band of the layout (v < 0.27)
for (let t = 0; t < idx.length; t += 3) {
  const p = [idx[t], idx[t + 1], idx[t + 2]].map((i) => [(uv[i * 2] % 1) * R, uv[i * 2 + 1] * R]);
  const cv = (p[0][1] + p[1][1] + p[2][1]) / 3 / R;
  fillTri(...p[0], ...p[1], ...p[2], cv < 0.27 ? VISOR : HARDWARE);
}
writeFileSync('public/assets/helmet/visor-roughness.png', PNG.sync.write(png));
console.log('wrote public/assets/helmet/visor-base.webp and visor-roughness.png');
