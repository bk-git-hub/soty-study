// Where are the solid lime blocks in each frame? Rows holding a run of >= minRun lime pixels are grouped
// into blocks (adjacent rows, overlapping x); each block is printed with its box. Finds small reveals
// (captions) without knowing where they are. Usage: node scripts/lime-blocks.mjs <dir> [minRun=40] [everyNth=1] [yMin=90]
import { readFileSync, readdirSync } from 'node:fs';
import { PNG } from 'pngjs';
const [dir, minS, nthS, yMinS] = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => /^[fv]\d+\.png$/.test(f)).sort((a, b) => +a.slice(1, -4) - +b.slice(1, -4)).filter((_, i) => i % +(nthS || 1) === 0);
const isLime = (r, g, b) => g > 185 && b < 100 && r > 140 && r < 235;
for (const f of files) {
  const png = PNG.sync.read(readFileSync(`${dir}/${f}`)), W = png.width, runs = [];
  for (let y = +(yMinS || 90); y < png.height; y++) {
    let x = 0; while (x < W) { const i = (y * W + x) * 4; if (!isLime(png.data[i], png.data[i + 1], png.data[i + 2])) { x++; continue; } let e = x; while (e < W) { const j = (y * W + e) * 4; if (!isLime(png.data[j], png.data[j + 1], png.data[j + 2])) break; e++; } if (e - x >= +(minS || 40)) runs.push({ y, x0: x, x1: e - 1 }); x = e; }
  }
  const blocks = [];
  for (const r of runs) { const b = blocks.find((k) => r.y - k.y1 <= 2 && r.x0 <= k.x1 + 4 && r.x1 >= k.x0 - 4); if (b) { b.y1 = r.y; b.x0 = Math.min(b.x0, r.x0); b.x1 = Math.max(b.x1, r.x1); b.rows++; } else blocks.push({ y0: r.y, y1: r.y, x0: r.x0, x1: r.x1, rows: 1 }); }
  const solid = blocks.filter((b) => b.rows >= 4);
  if (solid.length) console.log(f.slice(1, -4).padStart(5), solid.map((b) => `[x ${b.x0}-${b.x1} y ${b.y0}-${b.y1}]`).join(' '));
}
