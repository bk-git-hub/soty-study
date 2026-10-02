// Turns a scanned signature (PNG, ink on transparent or white) into ordered stroke paths.
//
//   node scripts/trace-signature.mjs <in.png> [--out src/data/signature.js] [--panels out.png]
//                                    [--order "[[2,0],[3,0],...]"]
//
// This is a CENTERLINE trace, not an outline trace: the output is open paths that can be drawn with
// stroke-dasharray, the way a pen writes. An outline trace (Illustrator's Image Trace and friends)
// would give a filled shape whose "path" runs around the ink, which cannot be written on.
//
// Pipeline: alpha mask -> 4x upscale -> Zhang-Suen thinning -> skeleton graph -> join at junctions
// -> smooth -> Catmull-Rom cubic beziers -> arc lengths.
//
// The source image stays out of the repo (reference/ is gitignored); only the generated data module
// is committed.
import { PNG } from 'pngjs';
import fs from 'node:fs';

const argv = process.argv.slice(2);
const flag = (name, dflt) => { const i = argv.indexOf('--' + name); return i < 0 ? dflt : argv[i + 1]; };
const SRC = argv[0];
const OUT = flag('out', 'src/data/signature.js');
const PANELS = flag('panels', null);
const UP = 4;            // upscale before thinning: the scan is ~160px wide and staircases badly
const STEP = 2.2;        // resample spacing in source px
const MAX_TURN = 75;     // deg off straight that a junction may still be a pen continuation

// ---------------------------------------------------------------- 1. ink mask
const png = PNG.sync.read(fs.readFileSync(SRC));
const W0 = png.width, H0 = png.height;
const ink0 = new Float32Array(W0 * H0);
let hasAlpha = false;
for (let i = 0, p = 0; i < png.data.length; i += 4, p++) if (png.data[i + 3] < 250) { hasAlpha = true; break; }
for (let i = 0, p = 0; i < png.data.length; i += 4, p++) {
  // a cut-out scan carries the ink in alpha; a flat scan carries it as darkness
  ink0[p] = hasAlpha ? png.data[i + 3] / 255
    : 1 - (png.data[i] * 0.299 + png.data[i + 1] * 0.587 + png.data[i + 2] * 0.114) / 255;
}
const W = W0 * UP, H = H0 * UP;
const mask = new Uint8Array(W * H);
const src = (x, y) => ink0[Math.min(H0 - 1, Math.max(0, y)) * W0 + Math.min(W0 - 1, Math.max(0, x))];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const fx = (x + 0.5) / UP - 0.5, fy = (y + 0.5) / UP - 0.5;
  const ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
  const v = src(ix, iy) * (1 - tx) * (1 - ty) + src(ix + 1, iy) * tx * (1 - ty)
          + src(ix, iy + 1) * (1 - tx) * ty + src(ix + 1, iy + 1) * tx * ty;
  mask[y * W + x] = v > 0.5 ? 1 : 0;
}
let inkArea = 0; for (let i = 0; i < mask.length; i++) inkArea += mask[i];

// ---------------------------------------------------------------- 2. Zhang-Suen thinning
const skel = Uint8Array.from(mask);
const NB = [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]]; // P2..P9, clockwise from north
const get = (g, x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : g[y * W + x];
for (let pass = 0; pass < 300; pass++) {
  let changed = 0;
  for (const step of [0, 1]) {
    const del = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (!skel[y * W + x]) continue;
      const p = NB.map(([dx, dy]) => get(skel, x + dx, y + dy));
      const B = p.reduce((s, v) => s + v, 0);
      if (B < 2 || B > 6) continue;                       // keep ends and keep thick cores
      let A = 0; for (let i = 0; i < 8; i++) if (p[i] === 0 && p[(i + 1) % 8] === 1) A++;
      if (A !== 1) continue;                              // removing it would break the line in two
      const [P2, , P4, , P6, , P8] = p;
      if (step === 0) { if (P2 * P4 * P6 || P4 * P6 * P8) continue; }
      else { if (P2 * P4 * P8 || P2 * P6 * P8) continue; }
      del.push(y * W + x);
    }
    for (const i of del) skel[i] = 0;
    changed += del.length;
  }
  if (!changed) break;
}
let skelLen = 0; for (let i = 0; i < skel.length; i++) skelLen += skel[i];
const strokeW = inkArea / Math.max(1, skelLen) / UP;      // area = length x width

// ---------------------------------------------------------------- 3. skeleton graph
// A diagonal neighbour that also touches an orthogonal one is the same step, not a second branch.
// Counting raw 8-neighbours instead turns every staircase pixel into a junction (1059 fragments
// instead of 20 on the first attempt).
const key = (x, y) => y * W + x;
const ORTHO = [[0,-1],[1,0],[0,1],[-1,0]], DIAG = [[1,-1],[1,1],[-1,1],[-1,-1]];
function reduced(x, y) {
  const o = ORTHO.filter(([dx, dy]) => get(skel, x + dx, y + dy)).map(([dx, dy]) => [x + dx, y + dy]);
  const d = DIAG.filter(([dx, dy]) => get(skel, x + dx, y + dy)).map(([dx, dy]) => [x + dx, y + dy])
    .filter(([nx, ny]) => !o.some(([ox, oy]) => Math.abs(ox - nx) <= 1 && Math.abs(oy - ny) <= 1));
  return o.concat(d);
}
const isNode = new Uint8Array(W * H), pts = [];
for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (skel[key(x, y)]) {
  pts.push([x, y]);
  if (reduced(x, y).length !== 2) isNode[key(x, y)] = 1;
}
function walk(sx, sy, nx, ny) {
  const path = [[sx, sy]];
  let px = sx, py = sy, cx = nx, cy = ny;
  for (let g = 0; g < 1e5; g++) {
    path.push([cx, cy]);
    if (isNode[key(cx, cy)]) break;
    const next = reduced(cx, cy).filter(([ax, ay]) => !(ax === px && ay === py));
    if (!next.length) break;
    px = cx; py = cy; [cx, cy] = next[0];
  }
  return path;
}
const used = new Set(), segsAll = [];
for (const [x, y] of pts) {
  if (!isNode[key(x, y)]) continue;
  for (const [nx, ny] of reduced(x, y)) {
    const id = key(x, y) + '>' + key(nx, ny);
    if (used.has(id)) continue;
    const path = walk(x, y, nx, ny);
    const e = path[path.length - 1], pv = path[path.length - 2] || path[0];
    used.add(id); used.add(key(e[0], e[1]) + '>' + key(pv[0], pv[1]));
    segsAll.push(path);
  }
}
const seen = new Set(); for (const s of segsAll) for (const [x, y] of s) seen.add(key(x, y));
for (const [x, y] of pts) {                                // closed loops have no node to start from
  if (seen.has(key(x, y))) continue;
  const n = reduced(x, y); if (!n.length) continue;
  const path = walk(x, y, n[0][0], n[0][1]);
  for (const q of path) seen.add(key(q[0], q[1]));
  segsAll.push(path);
}
const isEnd = (p) => reduced(p[0], p[1]).length <= 1;
const segs = segsAll.filter((s) =>                         // dead-end twigs below a stroke width
  !((isEnd(s[0]) || isEnd(s[s.length - 1])) && s.length < strokeW * UP * 1.5));

// ---------------------------------------------------------------- 4. join segments into strokes
// A pen carries straight on through a crossing, so two segment ends belong to one stroke when their
// outward tangents point roughly opposite ways.
const TIP = 10;
function tangent(seg, w) {
  const p = w === 0 ? seg : seg.slice().reverse();
  const a = p[0], b = p[Math.min(p.length - 1, TIP)];
  const dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1;
  return [dx / m, dy / m];
}
const ends = [];
segs.forEach((seg, i) => [0, 1].forEach((w) => {
  const p = w === 0 ? seg[0] : seg[seg.length - 1];
  ends.push({ seg: i, w, x: p[0], y: p[1], dir: tangent(seg, w), mate: null });
}));
const groups = new Map();
for (const e of ends) { const k = e.x + ',' + e.y; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e); }
for (const g of groups.values()) {
  const cand = [];
  for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
    const a = g[i], b = g[j];
    if (a.seg === b.seg) continue;
    const dot = Math.max(-1, Math.min(1, a.dir[0] * b.dir[0] + a.dir[1] * b.dir[1]));
    const turn = 180 - Math.acos(dot) * 180 / Math.PI;     // 0 when exactly opposite
    if (turn <= MAX_TURN) cand.push({ a, b, turn });
  }
  cand.sort((p, q) => p.turn - q.turn);
  for (const { a, b } of cand) { if (a.mate || b.mate) continue; a.mate = b; b.mate = a; }
}
const endOf = (s, w) => ends[s * 2 + w];
const done = new Set(), chainParts = [];
function build(seg, w) {
  const out = [];
  for (let g = 0; g < segs.length + 2; g++) {
    if (done.has(seg)) break;
    done.add(seg);
    out.push(w === 0 ? segs[seg] : segs[seg].slice().reverse());
    const m = endOf(seg, w === 0 ? 1 : 0).mate;
    if (!m || done.has(m.seg)) break;
    seg = m.seg; w = m.w;
  }
  return out;
}
for (let i = 0; i < segs.length; i++) for (const w of [0, 1]) {
  if (done.has(i) || endOf(i, w).mate) continue;           // an unpaired end is where a stroke starts
  const parts = build(i, w); if (parts.length) chainParts.push(parts);
}
for (let i = 0; i < segs.length; i++) {
  if (done.has(i)) continue;
  const parts = build(i, 0); if (parts.length) chainParts.push(parts);
}
const chains = chainParts.map((parts) => {
  const out = [];
  for (const p of parts) for (const q of p) {
    const last = out[out.length - 1];
    if (!last || last[0] !== q[0] || last[1] !== q[1]) out.push(q);
  }
  return out;
}).sort((a, b) => b.length - a.length);                    // longest first, so indices are stable

// ---------------------------------------------------------------- 5. order, smooth, fit
// Writing order cannot be recovered from a still image. Run with --panels to get one picture per
// chain (start green, end red) and read the order off it, then pass it as --order.
const ORDER = JSON.parse(flag('order', JSON.stringify(chains.map((_, i) => [i, 0]))));
const d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function resample(pl, step) {
  const out = [pl[0]]; let acc = 0;
  for (let i = 1; i < pl.length; i++) {
    let d = d2(pl[i - 1], pl[i]), from = pl[i - 1];
    while (acc + d >= step) {
      const t = (step - acc) / d;
      const p = [from[0] + (pl[i][0] - from[0]) * t, from[1] + (pl[i][1] - from[1]) * t];
      out.push(p); from = p; d = d2(from, pl[i]); acc = 0;
    }
    acc += d;
  }
  const last = pl[pl.length - 1];
  if (d2(out[out.length - 1], last) > step * 0.4) out.push(last);
  return out;
}
function smooth(p, passes) {                               // ends stay pinned so the tips don't creep
  for (let k = 0; k < passes; k++) {
    const n = p.map((q) => q.slice());
    for (let i = 1; i < p.length - 1; i++)
      n[i] = [(p[i - 1][0] + 2 * p[i][0] + p[i + 1][0]) / 4, (p[i - 1][1] + 2 * p[i][1] + p[i + 1][1]) / 4];
    p = n;
  }
  return p;
}
// Catmull-Rom through the samples, written as cubic beziers: the tangent at a point is a sixth of
// the vector between its neighbours, which is the standard uniform Catmull-Rom -> Bezier identity.
const ctrl = (pts_, i) => {
  const p0 = pts_[Math.max(0, i - 1)], p1 = pts_[i], p2 = pts_[i + 1], p3 = pts_[Math.min(pts_.length - 1, i + 2)];
  return [[p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6],
          [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6], p2];
};
const strokes = ORDER.map(([i, rev]) => {
  const p = chains[i].map(([x, y]) => [x / UP, y / UP]);
  if (rev) p.reverse();
  return smooth(resample(p, STEP), 2);
});
const f = (v) => Math.round(v * 100) / 100;
const paths = strokes.map((p) => {
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 0; i < p.length - 1; i++) {
    const [c1, c2, p2] = ctrl(p, i);
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
});
// Arc length per stroke, by flattening. The component needs these to split one 0..1 progress across
// the strokes by real ink length, so the pen keeps an even speed instead of jumping per path.
const lens = strokes.map((p) => {
  let len = 0, prev = p[0];
  for (let i = 0; i < p.length - 1; i++) {
    const [c1, c2, p2] = ctrl(p, i), p1 = p[i];
    for (let t = 0.05; t <= 1.0001; t += 0.05) {
      const u = 1 - t;
      const q = [u*u*u*p1[0] + 3*u*u*t*c1[0] + 3*u*t*t*c2[0] + t*t*t*p2[0],
                 u*u*u*p1[1] + 3*u*u*t*c1[1] + 3*u*t*t*c2[1] + t*t*t*p2[1]];
      len += d2(prev, q); prev = q;
    }
  }
  return Math.round(len * 10) / 10;
});

// ---------------------------------------------------------------- 6. emit
const pad = 2;
const mod = `// Generated by scripts/trace-signature.mjs from a scan of my own signature. Do not hand-edit.
// paths are open centerlines in viewBox units, in writing order; lens[i] is path i's arc length.
export default ${JSON.stringify({
  viewBox: `${-pad} ${-pad} ${W0 + pad * 2} ${H0 + pad * 2}`,
  strokeWidth: Math.round(strokeW * 100) / 100,
  paths, lens,
}, null, 2)};
`;
fs.mkdirSync(OUT.replace(/[^/\\]+$/, ''), { recursive: true });
fs.writeFileSync(OUT, mod);
console.log(`${OUT}: ${paths.length} strokes, ink length ${lens.reduce((a, b) => a + b, 0).toFixed(0)}, stroke width ${strokeW.toFixed(2)}`);

if (PANELS) {
  const SC = 2, COLS = 2, ROWS = Math.ceil(chains.length / COLS), G = 6, pw = W0 * SC, ph = H0 * SC;
  const out = new PNG({ width: pw * COLS + G * (COLS - 1), height: ph * ROWS + G * (ROWS - 1) });
  out.data.fill(255);
  const put = (x, y, c, a) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= out.width || y >= out.height) return;
    const j = (y * out.width + x) * 4;
    for (let k = 0; k < 3; k++) out.data[j + k] = out.data[j + k] * (1 - a) + c[k] * a;
    out.data[j + 3] = 255;
  };
  const disc = (cx, cy, r, c) => { for (let dy = -r - 1; dy <= r + 1; dy++) for (let dx = -r - 1; dx <= r + 1; dx++) {
    const d = Math.hypot(dx, dy); if (d > r + 0.5) continue; put(cx + dx, cy + dy, c, Math.min(1, r + 0.5 - d)); } };
  const line = (ch, ox, oy, c) => { for (const [x, y] of ch) disc(x / UP * SC + ox, y / UP * SC + oy, strokeW / 2 * SC, c); };
  chains.forEach((ch, i) => {
    const ox = (i % COLS) * (pw + G), oy = ((i / COLS) | 0) * (ph + G);
    for (const other of chains) line(other, ox, oy, [200, 204, 212]);
    line(ch, ox, oy, [20, 24, 48]);
    disc(ch[0][0] / UP * SC + ox, ch[0][1] / UP * SC + oy, 4, [20, 180, 90]);
    const e = ch[ch.length - 1];
    disc(e[0] / UP * SC + ox, e[1] / UP * SC + oy, 4, [230, 50, 60]);
    for (let k = 0; k <= i; k++) for (let y = 3; y < 11; y++) for (let x = 0; x < 4; x++)
      put(ox + 4 + k * 6 + x, oy + y, [40, 90, 220], 1);   // i+1 ticks = chain index
  });
  fs.writeFileSync(PANELS, PNG.sync.write(out));
  console.log(`${PANELS}: ${chains.length} chains`);
}
