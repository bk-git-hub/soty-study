// Does scrolling push the two text lines, on top of their steady drift? Fast clipped stills (left strip only)
// while resting, then while wheel-scrolling, then resting again; each still carries its time and scrollY.
// Prints per-interval shifts and a least-squares fit  shift = a*dt + b*dScroll  for each line.
// Usage: node scripts/marquee-scroll.mjs <url> [startY=520] [x1=300] [clipY=340] [clipH=210] [bandA=12-100] [bandB=116-202]
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
const [url, yS, x1S, cyS, chS, bandA = '12-100', bandB = '116-202'] = process.argv.slice(2);
const W = 1440, H = 900, X1 = +(x1S || 300), CY = +(cyS || 340), CH = +(chS || 210);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: W, height: H } })).newPage();
await p.goto(url, { waitUntil: 'load' });
await sleep(12000);
await p.mouse.move(W * 0.8, H * 0.3);
const still = async () => { let a = await p.evaluate(() => window.scrollY); for (let i = 0; i < 40; i++) { await sleep(80); const c = await p.evaluate(() => window.scrollY); if (Math.abs(c - a) < 0.5) return c; a = c; } return a; };
for (let g = 0; g < 80; g++) { const y = await still(); if (y >= +(yS || 520) - 2) break; await p.mouse.wheel(0, Math.max(4, Math.min(100, (+(yS || 520) - y) * 0.9))); }
await sleep(1000);
const frames = [];
for (let i = 0; i < 45; i++) {
  if (i >= 12 && i < 30) await p.mouse.wheel(0, 18);
  const t0 = performance.now();
  const buf = await p.screenshot({ clip: { x: 0, y: CY, width: X1, height: CH } });
  const t1 = performance.now(), y = await p.evaluate(() => window.scrollY);
  frames.push({ t: (t0 + t1) / 2000, y, png: PNG.sync.read(buf) });
}
await b.close();
const band = (s) => s.split('-').map(Number);
const profile = ({ png }, [y0, y1]) => { const o = new Float32Array(X1); for (let x = 0; x < X1; x++) { let n = 0; for (let y = y0; y < y1; y++) if (png.data[(y * png.width + x) * 4 + 1] > 150) n++; o[x] = n; } return o; };
const shift = (a, c) => { let best = 0, bestErr = Infinity; for (let d = -90; d <= 90; d++) { let e = 0, n = 0; for (let x = 0; x < X1; x++) { const x2 = x + d; if (x2 < 0 || x2 >= X1) continue; e += (a[x] - c[x2]) ** 2; n++; } if (n > X1 * 0.5 && e / n < bestErr) { bestErr = e / n; best = d; } } return best; };
const rowsA = [], rowsB = [];
for (let i = 1; i < frames.length; i++) {
  const A = frames[i - 1], B = frames[i], dt = B.t - A.t, ds = B.y - A.y;
  const da = shift(profile(A, band(bandA)), profile(B, band(bandA))), db = shift(profile(A, band(bandB)), profile(B, band(bandB)));
  rowsA.push([dt, ds, da]); rowsB.push([dt, ds, db]);
  if (i % 3 === 0) console.log(`#${i} dt ${dt.toFixed(3)} dScroll ${ds.toFixed(1)}  A ${da}  B ${db}`);
}
// least squares for shift = a*dt + b*ds
const fit = (rows) => { let s11 = 0, s12 = 0, s22 = 0, r1 = 0, r2 = 0; for (const [dt, ds, d] of rows) { s11 += dt * dt; s12 += dt * ds; s22 += ds * ds; r1 += dt * d; r2 += ds * d; }
  const det = s11 * s22 - s12 * s12; return { perSecond: (r1 * s22 - r2 * s12) / det, perScrollPx: (s11 * r2 - s12 * r1) / det }; };
console.log('line A (serif):', fit(rowsA)); console.log('line B (sans): ', fit(rowsB));
