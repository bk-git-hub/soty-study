// Screenshots on a *virtual* clock, so two pages that render at different real speeds can be compared
// frame for frame. Anything stepped "once per frame" (the fluid simulation) depends on the frame rate:
// the original runs at ~30 fps in the capture browser and our page at 60, which made the original's
// paint look twice as large and long-lived. Here the page's timers, requestAnimationFrame and
// performance.now are taken over after the intro; every frame is then exactly 16 ms of page time.
// Usage: node scripts/shot-virtual.mjs <outDir> <url> [shots=70] [framesPerShot=10] [waitSeconds=10] [w=1440] [h=900]
// Files are named by virtual ms since the clock was frozen: v00000.png, v00160.png, ...
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'node:fs';
const [out, url, shotsS, fpsS, waitS, wS, hS] = process.argv.slice(2);
const shots = +(shotsS || 70), per = +(fpsS || 10), FRAME = 16;
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: +(wS || 1440), height: +(hS || 900) } })).newPage();
// The fake clock has to exist before any page script runs: libraries keep their own reference to
// requestAnimationFrame / performance.now at start-up, and installing later froze the original and
// shifted our own time origin (first attempt, 2026-09-19). Until pauseAt() it simply follows real time.
await p.clock.install();
await p.goto(url, { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, +(waitS || 10) * 1000)); // load + intro, clock still running
await p.clock.pauseAt((await p.evaluate(() => Date.now())) + 100);
for (let i = 0; i < shots; i++) {
  const t = i * per * FRAME;
  await p.screenshot({ path: `${out}/v${String(t).padStart(5, '0')}.png`, timeout: 60000, animations: 'allow' });
  if (i % 10 === 0) console.log('shot', i, 'at virtual', t, 'ms');
  for (let f = 0; f < per; f++) await p.clock.runFor(FRAME); // one animation frame per call
}
await b.close();
