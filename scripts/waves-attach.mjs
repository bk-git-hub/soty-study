// Are the background contour lines attached to the page (they scroll with it) or fixed to the viewport
// (they only morph with time)? On a virtual clock: a still, a wheel of `px`, the fewest frames needed for
// the scroller to settle, a second still. The vertical offset that best aligns the two stills' line
// pixels (over a strip free of content) tells: ~0 = fixed, ~px = attached to the page.
// Usage: node scripts/waves-attach.mjs <url> <startY> [px=120] [x0=0] [x1=1440] [y0=90] [y1=900] [waitSeconds=10]
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
const [url, startS, pxS, x0S, x1S, y0S, y1S, waitS] = process.argv.slice(2);
const W = 1440, H = 900, px = +(pxS || 120), x0 = +(x0S || 0), x1 = +(x1S || W), y0 = +(y0S || 90), y1 = +(y1S || H);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: W, height: H } })).newPage();
await p.clock.install();
await p.goto(url, { waitUntil: 'load' });
await sleep(+(waitS || 10) * 1000);
await p.mouse.move(W * 0.85, H * 0.3);
const still = async () => { let a = await p.evaluate(() => window.scrollY); for (let i = 0; i < 40; i++) { await sleep(80); const c = await p.evaluate(() => window.scrollY); if (Math.abs(c - a) < 0.5) return c; a = c; } return a; };
for (let g = 0; g < 200; g++) { const y = await still(); if (y >= +startS - 2) break; await p.mouse.wheel(0, Math.max(4, Math.min(100, (+startS - y) * 0.9))); }
await sleep(800);
await p.clock.pauseAt((await p.evaluate(() => Date.now())) + 100);
await p.clock.runFor(16);
const yA = await p.evaluate(() => window.scrollY);
const A = PNG.sync.read(await p.screenshot({ clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } }));
await p.mouse.wheel(0, px);
let frames = 0, yB = yA;
for (let i = 0; i < 90; i++) { await p.clock.runFor(16); frames++; const y = await p.evaluate(() => window.scrollY); if (Math.abs(y - yB) < 0.3 && y > yA + 1) { yB = y; break; } yB = y; }
const B = PNG.sync.read(await p.screenshot({ clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } }));
await b.close();
// line mask: pixels that differ from the local background (the page colour = the most common colour)
const mask = (png) => { const n = png.width * png.height, m = new Uint8Array(n), hist = new Map(); for (let i = 0; i < n; i++) { const k = (png.data[i * 4] << 16) | (png.data[i * 4 + 1] << 8) | png.data[i * 4 + 2]; hist.set(k, (hist.get(k) || 0) + 1); }
  const bg = [...hist.entries()].sort((a, b) => b[1] - a[1])[0][0], br = bg >> 16, bgg = (bg >> 8) & 255, bb = bg & 255;
  for (let i = 0; i < n; i++) { const d = Math.abs(png.data[i * 4] - br) + Math.abs(png.data[i * 4 + 1] - bgg) + Math.abs(png.data[i * 4 + 2] - bb); m[i] = d > 12 && d < 90 ? 1 : 0; } return m; };
const mA = mask(A), mB = mask(B), w = A.width, h = A.height;
const score = (dy) => { let hit = 0, n = 0; for (let y = 0; y < h; y++) { const y2 = y + dy; if (y2 < 0 || y2 >= h) continue; for (let x = 0; x < w; x++) { if (mA[y * w + x]) { n++; if (mB[y2 * w + x]) hit++; } } } return n ? hit / n : 0; };
const rows = []; for (let dy = -Math.round(px * 1.5); dy <= Math.round(px * 1.5); dy += 4) rows.push([dy, score(dy)]);
rows.sort((a, b) => b[1] - a[1]);
console.log(`scrolled ${yA.toFixed(0)} -> ${yB.toFixed(0)} (${(yB - yA).toFixed(0)} px) in ${frames} frames (${frames * 16} ms of page time)`);
console.log('best vertical offsets (dy, share of A-line pixels landing on B-line pixels):', rows.slice(0, 5).map(([d, s]) => `${d}: ${s.toFixed(2)}`).join('  '), ' | at 0:', score(0).toFixed(2), ' at -scroll:', score(-Math.round(yB - yA)).toFixed(2));
