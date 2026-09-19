import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
const [fa, fb, dtS] = process.argv.slice(2); const dt = +dtS;
const X = 10, Y = 120, W = 390, H = 560, R = 60;
const mask = (f) => { const p = PNG.sync.read(readFileSync(f)); const m = new Uint8Array(W * H); let n = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const o = ((Y + y) * p.width + X + x) * 4; const r = p.data[o], g = p.data[o + 1], b = p.data[o + 2];
    if (r > 215 && r < 240 && Math.abs(r - g) < 6 && g - b > 4 && g - b < 16) { m[y * W + x] = 1; n++; } } return { m, n }; };
const a = mask(fa), b = mask(fb); const d = [];
for (let y = R; y < H - R; y += 2) for (let x = R; x < W - R; x += 2) { if (!a.m[y * W + x]) continue; let best = R + 1;
  for (let yy = -R; yy <= R; yy++) for (let xx = -R; xx <= R; xx++) if (b.m[(y + yy) * W + x + xx]) { const r = Math.hypot(xx, yy); if (r < best) best = r; }
  d.push(best); }
d.sort((p, q) => p - q); const med = d[Math.floor(d.length / 2)];
console.log(fa.split('/').slice(-2).join('/'), '->', fb.split('/').pop(), 'dt', dt, 'ms  line px', a.n, ' median displacement', med.toFixed(1), 'px =>', (med / dt * 1000).toFixed(0), 'px/s');
