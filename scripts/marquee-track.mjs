// Do the two big text lines move with time, with scroll, or both? Parks the page at a scroll position, takes
// stills at known times, then steps the scroll and takes more. For each pair of consecutive stills the
// horizontal shift of each line is found by sliding one row-band's column profile over the other's
// (only the strip left of the rectangle is used: the rectangle hides the middle).
// Usage: node scripts/marquee-track.mjs <outDir> <url> <y=300> <bandA=y0-y1> <bandB=y0-y1> <x1=200> [w=1440] [h=900]
import { chromium } from 'playwright';
import { mkdirSync, rmSync, readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
const [out, url, yS, bandA, bandB, x1S, wS, hS] = process.argv.slice(2);
const W = +(wS || 1440), H = +(hS || 900), X1 = +(x1S || 200);
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: W, height: H } })).newPage();
await p.goto(url, { waitUntil: 'load' });
await sleep(12000);
await p.mouse.move(W * 0.8, H * 0.3);
const still = async () => { let a = await p.evaluate(() => window.scrollY); for (let i = 0; i < 40; i++) { await sleep(80); const c = await p.evaluate(() => window.scrollY); if (Math.abs(c - a) < 0.5) return c; a = c; } return a; };
const wheelTo = async (target) => { for (let g = 0; g < 80; g++) { const y = await still(); if (y >= target - 2) return y; await p.mouse.wheel(0, Math.max(4, Math.min(100, (target - y) * 0.9))); } };
const shots = [];
const shoot = async (tag) => { const t = Math.round(performance.now()); const y = Math.round(await p.evaluate(() => window.scrollY)); const f = `${out}/${tag}.png`; await p.screenshot({ path: f }); shots.push({ tag, t, y, f }); };
await wheelTo(+(yS || 300)); await sleep(1200);
for (let i = 0; i < 4; i++) { await shoot('t' + i); await sleep(700); }        // time only
for (let i = 0; i < 3; i++) { await wheelTo(+(yS || 300) + 60 * (i + 1)); await sleep(300); await shoot('s' + i); }  // scroll steps
await b.close();
const band = (s) => s.split('-').map(Number);
const profile = (f, [y0, y1]) => { const { width, data } = PNG.sync.read(readFileSync(f)); const o = new Float32Array(X1);
  for (let x = 0; x < X1; x++) { let n = 0; for (let y = y0; y < y1; y++) { const i = (y * width + x) * 4; if (data[i + 1] > 150) n++; } o[x] = n; } return o; };
const shift = (a, c) => { let best = 0, bestErr = Infinity; for (let d = -150; d <= 150; d++) { let e = 0, n = 0;
  for (let x = 0; x < X1; x++) { const x2 = x + d; if (x2 < 0 || x2 >= X1) continue; e += (a[x] - c[x2]) ** 2; n++; } if (n > X1 * 0.4 && e / n < bestErr) { bestErr = e / n; best = d; } } return best; };
for (let i = 1; i < shots.length; i++) {
  const A = shots[i - 1], B = shots[i], dt = (B.t - A.t) / 1000;
  const da = shift(profile(A.f, band(bandA)), profile(B.f, band(bandA))), db = shift(profile(A.f, band(bandB)), profile(B.f, band(bandB)));
  console.log(`${A.tag}->${B.tag}  dt ${dt.toFixed(2)} s  dScroll ${B.y - A.y}  lineA ${da} px (${(da / dt).toFixed(0)} px/s)  lineB ${db} px (${(db / dt).toFixed(0)} px/s)`);
}
