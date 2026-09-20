// CPU profile while wheel-scrolling from a start position: which functions eat the time in a long frame?
// Usage: node scripts/scroll-profile.mjs [url] [startY=1300] [ticks=14] [tickPx=40]
import { chromium } from 'playwright';
const [url = 'http://localhost:5173/', startS, ticksS, pxS] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto(url, { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 11000));
await p.mouse.move(720, 450);
// get near the spot first, slowly enough for the smooth scroller to settle
for (let y = 0; y < +(startS || 1300); y += 100) { await p.mouse.wheel(0, 100); await new Promise((r) => setTimeout(r, 60)); }
await new Promise((r) => setTimeout(r, 1500));
const cdp = await ctx.newCDPSession(p);
await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start');
for (let i = 0; i < +(ticksS || 14); i++) { await p.mouse.wheel(0, +(pxS || 40)); await new Promise((r) => setTimeout(r, 50)); }
await new Promise((r) => setTimeout(r, 1200));
const { profile } = await cdp.send('Profiler.stop');
console.log('scrollY now', await p.evaluate(() => Math.round(scrollY)));
await b.close();
const dt = profile.timeDeltas, byId = new Map(profile.nodes.map((n) => [n.id, n])), self = new Map();
profile.samples.forEach((id, i) => { const n = byId.get(id); const f = n.callFrame; const key = `${f.functionName || '(anonymous)'}  ${f.url.split('/').slice(-2).join('/').split('?')[0]}:${f.lineNumber + 1}`; self.set(key, (self.get(key) || 0) + (dt[i] || 0) / 1000); });
const rows = [...self.entries()].filter(([k]) => !/^\(idle\)|^\(program\)/.test(k)).sort((a, c) => c[1] - a[1]).slice(0, 14);
for (const [k, ms] of rows) console.log(ms.toFixed(0).padStart(6), 'ms self ', k);
