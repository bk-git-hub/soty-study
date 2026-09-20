// Scroll down through the hero with steady wheel ticks and record, per animation frame, the frame time
// and scrollY. A hitch shows as a long frame and/or a stall in scrollY around a given position.
// Usage: node scripts/scroll-hitch.mjs [url] [width=800] [height=900] [ticks=40] [tickPx=40]
import { chromium } from 'playwright';
const [url = 'http://localhost:5173/', wS, hS, ticksS, pxS] = process.argv.slice(2);
const W = +(wS || 800), H = +(hS || 900);
const b = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: W, height: H } })).newPage();
await p.goto(url, { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 11000));
await p.mouse.move(W / 2, H / 2);
await p.evaluate(() => { window.__f = []; let last = performance.now(); const tick = (t) => { window.__f.push([Math.round(t), +(t - last).toFixed(1), Math.round(scrollY)]); last = t; if (window.__f.length < 3000) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
for (let i = 0; i < +(ticksS || 40); i++) { await p.mouse.wheel(0, +(pxS || 40)); await new Promise((r) => setTimeout(r, 50)); }
await new Promise((r) => setTimeout(r, 1200));
const rows = await p.evaluate(() => window.__f);
await b.close();
const t0 = rows[0][0]; const long = rows.filter((r) => r[1] > 34);
console.log(`${W}x${H}: frames ${rows.length}, median frame ${[...rows].map((r) => r[1]).sort((a, c) => a - c)[rows.length >> 1]} ms, long frames (>34 ms): ${long.length}`);
for (const r of long) console.log(`  long frame ${String(r[1]).padStart(6)} ms at t=${r[0] - t0} ms, scrollY ${r[2]} (progress ${(r[2] / H).toFixed(2)})`);
