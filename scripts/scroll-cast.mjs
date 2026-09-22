// Screencast of a page while it is wheel-scrolled from one position to another: how does something
// reveal itself as it comes into view? Frames are named by ms since the recording started; scrollY is
// sampled alongside and written to scroll.json ([{ms, y}]), so a frame can be paired with a position.
// Usage: node scripts/scroll-cast.mjs <outDir> <url> <startY> <endY> [tickPx=60] [tickMs=50] [tailSeconds=3] [w=1440] [h=900] [waitSeconds=12]
import { chromium } from 'playwright';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
const [out, url, startS, endS, tickPxS, tickMsS, tailS, wS, hS, waitS] = process.argv.slice(2);
const W = +(wS || 1440), H = +(hS || 900), tickPx = +(tickPxS || 60), tickMs = +(tickMsS || 50);
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H } });
const p = await ctx.newPage();
await p.goto(url, { waitUntil: 'load' });
await sleep(+(waitS || 12) * 1000);
await p.mouse.move(W * 0.85, H * 0.3);
const still = async () => { let a = await p.evaluate(() => window.scrollY); for (let i = 0; i < 40; i++) { await sleep(80); const c = await p.evaluate(() => window.scrollY); if (Math.abs(c - a) < 0.5) return c; a = c; } return a; };
for (let g = 0; g < 120; g++) { const y = await still(); if (y >= +startS - 2) break; await p.mouse.wheel(0, Math.max(4, Math.min(100, (+startS - y) * 0.9))); }
await sleep(800);
const cdp = await ctx.newCDPSession(p);
let t0 = null, n = 0;
const samples = [];
cdp.on('Page.screencastFrame', async (f) => {
  const t = f.metadata.timestamp * 1000;
  if (t0 === null) t0 = t;
  writeFileSync(`${out}/f${String(Math.round(t - t0)).padStart(5, '0')}.png`, Buffer.from(f.data, 'base64')); n++;
  await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'png', maxWidth: W, maxHeight: H, everyNthFrame: 1 });
const rec0 = performance.now();
const sample = async () => samples.push({ ms: Math.round(performance.now() - rec0), y: Math.round(await p.evaluate(() => window.scrollY)) });
await sleep(300); await sample();
for (let y = +startS; y < +endS; y += tickPx) { await p.mouse.wheel(0, Math.min(tickPx, +endS - y)); await sleep(tickMs); await sample(); }
for (let i = 0; i < +(tailS || 3) * 4; i++) { await sleep(250); await sample(); }
await cdp.send('Page.stopScreencast').catch(() => {});
writeFileSync(`${out}/scroll.json`, JSON.stringify(samples));
await b.close();
// the screencast clock and performance.now() start at different moments; the first frame is at ~0 on both
console.log('frames:', n, 'scroll samples:', samples.length, 'first/last y:', samples[0].y, samples[samples.length - 1].y, '->', out);
