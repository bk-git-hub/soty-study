// Is the hero still "alive" at a given scroll position? At each position the pointer is swept across the
// face and a still is taken straight after: a live fluid mask leaves painted helmet behind the pointer.
// A second still one second later (pointer parked) shows what stays without input (the blueprint pulse).
// Usage: node scripts/scroll-poke.mjs <outDir> <url> <y1,y2,...> [w=1440] [h=900] [waitSeconds=12]
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'node:fs';
const [out, url, ysS, wS, hS, waitS] = process.argv.slice(2);
const ys = ysS.split(',').map(Number), W = +(wS || 1440), H = +(hS || 900);
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
await p.mouse.move(W * 0.8, H * 0.3);
for (const target of ys) {
  await wheelTo(p, target);
  await sleep(900);
  const y = Math.round(await p.evaluate(() => window.scrollY));
  // two diagonal sweeps across the face, ~0.5 s each
  for (let k = 0; k < 2; k++) for (let i = 0; i <= 24; i++) {
    const u = i / 24, x = W * (0.38 + 0.24 * (k ? 1 - u : u)), yy = H * (0.3 + 0.35 * u);
    await p.mouse.move(x, yy); await sleep(20);
  }
  await p.screenshot({ path: `${out}/s${String(y).padStart(5, '0')}.png`, timeout: 60000, animations: 'allow' });
  await p.mouse.move(W * 0.8, H * 0.3);
  console.log('poked at scrollY', y);
}
await b.close();
