// Draws the helmet shell's UV layout (edges of every triangle) as a PNG, to design a livery texture on.
// Reads the Draco-decoded GLB directly (glTF JSON chunk + binary chunk; interleaved vertex buffer).
// Usage: node scripts/helmet-uv.mjs [size=2048] [out=compare/helmet-livery/uv.png] [node=helmet|glass|plastic]
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const size = +(process.argv[2] || 2048);
const out = process.argv[3] || 'compare/helmet-livery/uv.png';
const buf = readFileSync('public/orig/runtime/models/decoded/helmet-21.glb');
const jsonLen = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString());
const binStart = 20 + jsonLen + 8; // second chunk header (length + type) follows the JSON chunk
const bin = buf.subarray(binStart);

function accessor(i) {
  const a = gltf.accessors[i];
  const bv = gltf.bufferViews[a.bufferView];
  const comps = { SCALAR: 1, VEC2: 2, VEC3: 3 }[a.type];
  const stride = bv.byteStride || comps * (a.componentType === 5126 ? 4 : 2);
  const base = bv.byteOffset + (a.byteOffset || 0);
  const outArr = new Float64Array(a.count * comps);
  for (let n = 0; n < a.count; n++) for (let c = 0; c < comps; c++) {
    const off = base + n * stride + c * (a.componentType === 5126 ? 4 : 2);
    outArr[n * comps + c] = a.componentType === 5126 ? bin.readFloatLE(off) : bin.readUInt16LE(off);
  }
  return outArr;
}

const node = gltf.nodes.find((n) => n.name === (process.argv[4] || 'helmet'));
const prim = gltf.meshes[node.mesh].primitives[0];
const uv = accessor(prim.attributes.TEXCOORD_0);
const idx = accessor(prim.indices);
console.log('helmet: verts', uv.length / 2, 'tris', idx.length / 3);
let umin = 9, umax = -9, vmin = 9, vmax = -9;
for (let i = 0; i < uv.length; i += 2) { umin = Math.min(umin, uv[i]); umax = Math.max(umax, uv[i]); vmin = Math.min(vmin, uv[i + 1]); vmax = Math.max(vmax, uv[i + 1]); }
console.log('uv range', umin.toFixed(3), umax.toFixed(3), vmin.toFixed(3), vmax.toFixed(3));

const png = new PNG({ width: size, height: size });
png.data.fill(255);
const plot = (x, y) => {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const o = (y * size + x) * 4; png.data[o] = 20; png.data[o + 1] = 20; png.data[o + 2] = 20;
};
const line = (x0, y0, x1, y1) => {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let s = 0; s <= n; s++) plot(x0 + (x1 - x0) * s / n, y0 + (y1 - y0) * s / n);
};
// glTF UV origin is the top-left corner (v grows downward), so no flip is needed for an image
const px = (i) => [uv[i * 2] * size, uv[i * 2 + 1] * size];
for (let t = 0; t < idx.length; t += 3) {
  const a = px(idx[t]), b = px(idx[t + 1]), c = px(idx[t + 2]);
  line(...a, ...b); line(...b, ...c); line(...c, ...a);
}
writeFileSync(out, PNG.sync.write(png));
console.log('wrote', out);
