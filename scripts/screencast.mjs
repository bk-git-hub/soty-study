// Record the first seconds of a page load as timestamped PNG frames (Chrome's screencast stream).
// Screenshots cost ~0.6 s each on the original in the capture browser, far too coarse for an intro of
// a few seconds; the screencast delivers frames as they are presented, with their own timestamps.
// Fine for large, high-contrast motion (a logo, a wipe). Not for thin faint lines: those need real
// screenshots (see shot-series.mjs), and nothing stepped per frame should be judged from it either.
// Usage: node scripts/screencast.mjs <outDir> <url> [seconds=8] [w=1440] [h=900] [everyNth=1]
// Files: f<ms since navigation start>.png
import { chromium } from 'playwright';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
const [out, url, secS, wS, hS, nthS] = process.argv.slice(2);
const W = +(wS || 1440), H = +(hS || 900);
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H } });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
let t0 = null, n = 0;
cdp.on('Page.screencastFrame', async (f) => {
  const t = f.metadata.timestamp * 1000; // ms, monotonic
  if (t0 === null) t0 = t;
  writeFileSync(`${out}/f${String(Math.round(t - t0)).padStart(5, '0')}.png`, Buffer.from(f.data, 'base64'));
  n++;
  await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'png', maxWidth: W, maxHeight: H, everyNthFrame: +(nthS || 1) });
await p.goto(url, { waitUntil: 'commit' });
await new Promise((r) => setTimeout(r, +(secS || 8) * 1000));
await cdp.send('Page.stopScreencast').catch(() => {});
await b.close();
console.log('frames:', n, '->', out);
