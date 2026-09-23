// How much of a colour is on screen, frame by frame, in one or more regions: the size of the highlight
// sweep's blocks over time, for two recordings side by side (frames f<ms>.png from reveal-virtual.mjs).
// Usage: node scripts/tint-area.mjs <dirA> <dirB> <r,g,b> <tolerance> <x0-x1> [<x0-x1> ...] [--y y0-y1] [--until ms]
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { PNG } from 'pngjs';
const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 ? argv.splice(i, 2)[1] : dflt; };
const [y0, y1] = opt('--y', '0-900').split('-').map(Number), until = +opt('--until', 1e9);
const [a, b, rgbS, tolS, ...bands] = argv;
const rgb = rgbS.split(',').map(Number), tol = +tolS, regions = bands.map((s) => s.split('-').map(Number));
const count = (file, [x0, x1]) => {
  const img = PNG.sync.read(readFileSync(file)); let n = 0;
  for (let y = y0; y < Math.min(y1, img.height); y++) for (let x = x0; x < Math.min(x1, img.width); x++) {
    const o = (y * img.width + x) * 4;
    if (Math.abs(img.data[o] - rgb[0]) <= tol && Math.abs(img.data[o + 1] - rgb[1]) <= tol && Math.abs(img.data[o + 2] - rgb[2]) <= tol) n++;
  }
  return n;
};
const frames = readdirSync(a).filter((f) => /^f\d+\.png$/.test(f)).map((f) => +f.slice(1, 6)).sort((x, y) => x - y);
console.log('   ms ' + regions.map(([x0, x1]) => `| ${x0}-${x1}: A      B     `).join(' '));
for (const ms of frames) {
  if (ms > until) break;
  const f = `f${String(ms).padStart(5, '0')}.png`; if (!existsSync(`${b}/${f}`)) continue;
  console.log(String(ms).padStart(5) + ' ' + regions.map((r) => `| ${String(count(`${a}/${f}`, r)).padStart(7)} ${String(count(`${b}/${f}`, r)).padStart(7)}`).join(' '));
}
