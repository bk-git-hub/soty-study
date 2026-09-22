// Do the background lines at a scroll position change with time (a live field) or stay put (static art)?
// Two clipped stills `seconds` apart at the same scroll; prints how many line pixels moved.
// Usage: node scripts/waves-morph.mjs <url> <scrollY> [seconds=3] [x0=0] [x1=1440] [y0=90] [y1=900] [waitSeconds=10]
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
const [url, startS, secS, x0S, x1S, y0S, y1S, waitS] = process.argv.slice(2);
const W = 1440, H = 900, x0 = +(x0S || 0), x1 = +(x1S || W), y0 = +(y0S || 90), y1 = +(y1S || H);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: W, height: H } })).newPage();
await p.goto(url, { waitUntil: 'load' });
await sleep(+(waitS || 10) * 1000);
await p.mouse.move(W * 0.85, H * 0.3);
const still = async () => { let a = await p.evaluate(() => window.scrollY); for (let i = 0; i < 40; i++) { await sleep(80); const c = await p.evaluate(() => window.scrollY); if (Math.abs(c - a) < 0.5) return c; a = c; } return a; };
for (let g = 0; g < 300; g++) { const y = await still(); if (y >= +startS - 2) break; await p.mouse.wheel(0, Math.max(4, Math.min(100, (+startS - y) * 0.9))); }
await sleep(1200);
const clip = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
const A = PNG.sync.read(await p.screenshot({ clip }));
await sleep(+(secS || 3) * 1000);
const B = PNG.sync.read(await p.screenshot({ clip }));
await b.close();
const mask = (png) => { const n = png.width * png.height, m = new Uint8Array(n), hist = new Map(); for (let i = 0; i < n; i++) { const k = (png.data[i * 4] << 16) | (png.data[i * 4 + 1] << 8) | png.data[i * 4 + 2]; hist.set(k, (hist.get(k) || 0) + 1); }
  const bg = [...hist.entries()].sort((a, b) => b[1] - a[1])[0][0], br = bg >> 16, bgg = (bg >> 8) & 255, bb = bg & 255;
  for (let i = 0; i < n; i++) { const d = Math.abs(png.data[i * 4] - br) + Math.abs(png.data[i * 4 + 1] - bgg) + Math.abs(png.data[i * 4 + 2] - bb); m[i] = d >= 8 && d < 70 ? 1 : 0; } return m; };
const mA = mask(A), mB = mask(B); let a = 0, both = 0, either = 0;
for (let i = 0; i < mA.length; i++) { if (mA[i]) a++; if (mA[i] && mB[i]) both++; if (mA[i] || mB[i]) either++; }
console.log(`scroll ${startS}: line pixels A ${a}, kept after ${secS || 3} s: ${(both / a * 100).toFixed(0)} %, changed (either-both)/either: ${((either - both) / either * 100).toFixed(0)} %`);
