// Still screenshots at a series of scroll positions: what does the page look like at scrollY = 0, 100, 200, ...?
// The page is wheel-scrolled (so a smooth scroller behaves as it does for a person), left to settle, and
// each file is named by the scroll position the page itself reports: s00000.png, s00100.png, ...
// toY may also be an explicit list "120,218,320" (to stop where another capture stopped); step is then ignored.
// Usage: node scripts/scroll-series.mjs <outDir> <url> [toY=2600] [step=100] [w=1440] [h=900] [waitSeconds=12] [settleMs=900]
import { chromium } from 'playwright';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
const [out, url, toS, stepS, wS, hS, waitS, settleS] = process.argv.slice(2);
const list = (toS || "").includes(",") ? toS.split(",").map(Number) : null;
const to = list ? 0 : +(toS || 2600), step = +(stepS || 100), W = +(wS || 1440), H = +(hS || 900), settle = +(settleS || 900);
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// wheel towards a scroll position; a smooth scroller keeps easing after the wheel event, so wait until the
// reported position stops changing before deciding on the next tick (otherwise small targets are overshot)
async function wheelTo(p, target) {
  const still = async () => { let a = await p.evaluate(() => window.scrollY); for (let i = 0; i < 40; i++) { await sleep(80); const b = await p.evaluate(() => window.scrollY); if (Math.abs(b - a) < 0.5) return b; a = b; } return a; };
  for (let guard = 0; guard < 80; guard++) {
    const y = await still();
    if (y >= target - 2) return y;
    await p.mouse.wheel(0, Math.max(4, Math.min(100, (target - y) * 0.9)));
  }
  return still();
}
const b = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H } });
const p = await ctx.newPage();
await p.goto(url, { waitUntil: 'load' });
await sleep(+(waitS || 12) * 1000);
// park the pointer where it does not hover anything interactive
await p.mouse.move(Math.round(W * 0.8), Math.round(H * 0.3));
const log = [];
const targets = list || Array.from({ length: Math.floor(to / step) + 1 }, (_, i) => i * step);
for (const target of targets) {
  await wheelTo(p, target);
  await sleep(settle);
  const y = Math.round(await p.evaluate(() => window.scrollY));
  await p.screenshot({ path: `${out}/s${String(y).padStart(5, '0')}.png`, timeout: 60000, animations: 'allow' });
  log.push({ target, y });
  console.log('target', target, 'scrollY', y);
}
writeFileSync(`${out}/positions.json`, JSON.stringify(log, null, 1));
await b.close();
