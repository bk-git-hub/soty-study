// How fast does a page actually render in the capture browser? Anything that advances "once per frame"
// (like the fluid simulation) runs slower in real time when the frame rate drops, so captures of a
// page at 20 fps and at 60 fps are not comparable. Usage: node scripts/fps-probe.mjs <url> [waitSeconds=10] [seconds=5]
import { chromium } from 'playwright';
const [url, waitS, secS] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto(url, { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, +(waitS || 10) * 1000));
const res = await p.evaluate((sec) => new Promise((resolve) => {
  const stamps = []; const t0 = performance.now();
  const tick = (t) => { stamps.push(t); if (t - t0 < sec * 1000) requestAnimationFrame(tick); else {
    const gaps = stamps.slice(1).map((s, i) => s - stamps[i]).sort((a, c) => a - c);
    resolve({ fps: +((stamps.length - 1) / ((stamps[stamps.length - 1] - stamps[0]) / 1000)).toFixed(1), medianGapMs: +gaps[gaps.length >> 1].toFixed(1), worstGapMs: +gaps[gaps.length - 1].toFixed(1) });
  } };
  requestAnimationFrame(tick);
}), +(secS || 5));
console.log(url, JSON.stringify(res));
await b.close();
