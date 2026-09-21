// From one still taken when the signature's first stroke is complete (p ~ 0.7): the signature's artboard
// size (from the first stroke's height: 664 artboard units) and the ink rows of the two text lines.
// Usage: node scripts/sign-text-size.mjs <dir with one sNNNNN.png> [...more dirs]
import { readFileSync, readdirSync } from 'node:fs';
import { PNG } from 'pngjs';
for (const dir of process.argv.slice(2)) {
  const f = readdirSync(dir).filter((n) => /^s\d+\.png$/.test(n)).sort().pop();
  const p = PNG.sync.read(readFileSync(`${dir}/${f}`)), W = p.width, H = p.height;
  let x0 = W, x1 = 0, y0 = H, y1 = 0;
  for (let y = 70; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, r = p.data[i], g = p.data[i + 1], b = p.data[i + 2]; if (r > 185 && r < 235 && g > 238 && b < 70) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  const rows = (test) => { let a = -1, b = -1; for (let y = 0; y < H; y++) { let n = 0; for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (test(p.data[i], p.data[i + 1], p.data[i + 2])) n++; } if (n > 12) { if (a < 0) a = y; b = y; } } return [a, b]; };
  const serif = rows((r, g, b) => Math.abs(r - 178) < 14 && Math.abs(g - 199) < 14 && Math.abs(b - 58) < 24), sans = rows((r, g, b) => Math.abs(r - 221) < 10 && Math.abs(g - 225) < 10 && Math.abs(b - 210) < 12);
  const h = y1 - y0 + 1, aw = 1030 * h / 664;
  console.log(`${W}x${H} ${f}: first stroke ${x0},${y0}-${x1},${y1} (h ${h}) -> artboard ${aw.toFixed(0)} x ${(aw / 1.5147).toFixed(0)} px = ${(aw / W * 100).toFixed(1)} vw / ${(aw / 1.5147 / H * 100).toFixed(1)} vh | serif ${serif.join('..')} (${serif[1] - serif[0] + 1}) sans ${sans.join('..')} (${sans[1] - sans[0] + 1})`);
}
