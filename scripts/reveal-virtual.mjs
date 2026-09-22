// A scroll-triggered reveal on a *virtual* clock: the page is scrolled to a start position in real time,
// the clock is frozen, one wheel burst is sent, and from then on every step is exactly stepMs of page
// time followed by a screenshot. Timings read off the frames are then exact, unlike the screencast's
// (which arrives in 30 fps pairs). Frames are f<virtual ms>.png + scroll.json, the layout line-reveal.mjs reads.
// Usage: node scripts/reveal-virtual.mjs <outDir> <url> <startY> <wheelPx> [steps=60] [stepMs=33] [w=1440] [h=900] [waitSeconds=10]
import { chromium } from 'playwright';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
const [out, url, startS, wheelS, stepsS, stepMsS, wS, hS, waitS] = process.argv.slice(2);
const W = +(wS || 1440), H = +(hS || 900), steps = +(stepsS || 60), stepMs = +(stepMsS || 33);
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: W, height: H } })).newPage();
await p.clock.install(); // before any page script (see shot-virtual.mjs)
await p.goto(url, { waitUntil: 'load' });
await sleep(+(waitS || 10) * 1000);
await p.mouse.move(W * 0.85, H * 0.3);
const still = async () => { let a = await p.evaluate(() => window.scrollY); for (let i = 0; i < 40; i++) { await sleep(80); const c = await p.evaluate(() => window.scrollY); if (Math.abs(c - a) < 0.5) return c; a = c; } return a; };
for (let g = 0; g < 120; g++) { const y = await still(); if (y >= +startS - 2) break; await p.mouse.wheel(0, Math.max(4, Math.min(100, (+startS - y) * 0.9))); }
await sleep(800);
await p.clock.pauseAt((await p.evaluate(() => Date.now())) + 100);
// the burst: a few wheel events one frame apart, like a flick
const chunks = 4;
for (let i = 0; i < chunks; i++) { await p.mouse.wheel(0, +wheelS / chunks); await p.clock.runFor(16); }
const samples = [];
for (let i = 0; i < steps; i++) {
  const t = chunks * 16 + i * stepMs, y = Math.round(await p.evaluate(() => window.scrollY));
  samples.push({ ms: t, y });
  await p.screenshot({ path: `${out}/f${String(t).padStart(5, '0')}.png`, timeout: 60000, animations: 'allow' });
  await p.clock.runFor(stepMs);
}
writeFileSync(`${out}/scroll.json`, JSON.stringify(samples));
await b.close();
console.log('frames:', steps, 'scrollY first/last:', samples[0].y, samples[samples.length - 1].y, '->', out);
