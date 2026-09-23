// A scripted tour of the home page on a virtual clock, one frame every 33 ms of page time (30 fps), the same
// pointer path, hover and wheel input at the same moments whatever the page: for a side-by-side video of
// the original and ours (scripts/tour-compose.mjs turns two frame folders into one mp4).
// Usage: node scripts/tour-capture.mjs <outDir> <url> [seconds=36] [waitSeconds=12] [w=1440] [h=900]
// Frames: f00000.png ... (index = frame number). The loader is skipped (real time, varies with the network).
import { chromium } from 'playwright';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
const [out, url, secS, waitS, wS, hS] = process.argv.slice(2);
const W = +(wS || 1440), H = +(hS || 900), STEP = 33, FRAMES = Math.round((+(secS || 36) * 1000) / STEP);
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });

// --- the choreography, in ms of page time ---------------------------------------------------------
const PARK = [W * 0.83, H * 0.33];
const HELMET_ROW = [66, 823];               // the card's second row, the same on both sites at 1440x900
const CHAPTERS = [
  [0, 'start'],
  [600, 'paint'],      // the pointer sweeps over the face: the fluid mask paints the helmet
  [4600, 'hover'],     // to the card's helmet row and hold: the whole mask comes on
  [8200, 'unhover'],   // away again
  [9800, 'scroll'],    // wheel bursts: scroll-out, signature, statement reveal, gallery, ON / OFF TRACK
];
const SCROLL_PX = 30, SCROLL_EVERY = 99, SCROLL_UNTIL = 7000; // px per burst, ms between bursts, stop at this page y
// pointer position at time t (or null = do not move)
function pointerAt(t) {
  if (t < 600) return null;
  if (t < 4600) { const u = (t - 600) / 4000; // an S over the helmet: two sweeps down and back
    return [W * (0.5 + 0.17 * Math.sin(u * Math.PI * 4)), H * (0.22 + 0.42 * u)]; }
  if (t < 5200) { const u = (t - 4600) / 600; const from = [W * 0.5, H * 0.64]; return [from[0] + (HELMET_ROW[0] - from[0]) * u, from[1] + (HELMET_ROW[1] - from[1]) * u]; }
  if (t < 8200) return HELMET_ROW;
  if (t < 8600) { const u = (t - 8200) / 400; return [HELMET_ROW[0] + (PARK[0] - HELMET_ROW[0]) * u, HELMET_ROW[1] + (PARK[1] - HELMET_ROW[1]) * u]; }
  return PARK;
}
// ----------------------------------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: W, height: H } })).newPage();
await p.clock.install(); // before any page script (shot-virtual.mjs)
await p.goto(url, { waitUntil: 'load' });
await sleep(+(waitS || 12) * 1000);   // loader + hero ready, real time
await p.mouse.move(PARK[0], PARK[1]);
await sleep(500);
await p.clock.pauseAt((await p.evaluate(() => Date.now())) + 100);
const log = [];
let lastPointer = null, lastWheel = -Infinity, scrollY = 0, t0 = performance.now();
for (let i = 0; i < FRAMES; i++) {
  const t = i * STEP;
  const pt = pointerAt(t);
  if (pt && (!lastPointer || pt[0] !== lastPointer[0] || pt[1] !== lastPointer[1])) { await p.mouse.move(pt[0], pt[1]); lastPointer = pt; }
  if (t >= 9800 && t - lastWheel >= SCROLL_EVERY && scrollY < SCROLL_UNTIL) { await p.mouse.wheel(0, SCROLL_PX); lastWheel = t; }
  await p.clock.runFor(STEP);
  scrollY = await p.evaluate(() => window.scrollY);
  await p.screenshot({ path: `${out}/f${String(i).padStart(5, '0')}.png`, timeout: 60000, animations: 'allow' });
  log.push({ i, t, y: Math.round(scrollY) });
  if (i % 150 === 0) console.log(`frame ${i}/${FRAMES}  t ${t} ms  scrollY ${Math.round(scrollY)}  (${((performance.now() - t0) / 1000).toFixed(0)} s real)`);
}
writeFileSync(`${out}/tour.json`, JSON.stringify({ step: STEP, chapters: CHAPTERS, frames: log }));
await b.close();
console.log('done:', FRAMES, 'frames ->', out);
