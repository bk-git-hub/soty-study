// Hover the NEXT RACE card's circuit row and record what happens, frame by frame (screencast), plus a
// 3x still of the hovered state. Timeline: 1 s idle, pointer onto the row, hold, pointer away, 2 s more.
// Usage: node scripts/hover-track.mjs <outDir> <orig|local> [holdMs=2500] [x=66] [y=735]
//   (66,735) = the circuit row of the card, (66,836) = the helmet row below it
// Files: f<ms since recording start>.png, hover-3x.png; the pointer times are printed (same clock).
import { chromium } from 'playwright';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
const [out, which, holdS, xS, yS] = process.argv.slice(2);
const HX = +(xS || 66), HY = +(yS || 735);
const hold = +(holdS || 2500);
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto(which === 'orig' ? 'https://landonorris.com' : 'http://localhost:5173/', { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 10000));
await p.mouse.move(720, 300); // somewhere neutral first
const cdp = await ctx.newCDPSession(p);
let t0 = null; const pending = [];
cdp.on('Page.screencastFrame', async (f) => {
  const t = f.metadata.timestamp * 1000; if (t0 === null) t0 = t;
  writeFileSync(`${out}/f${String(Math.round(t - t0)).padStart(5, '0')}.png`, Buffer.from(f.data, 'base64'));
  await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'png', maxWidth: 1440, maxHeight: 900, everyNthFrame: 1 });
const wall0 = Date.now();
const mark = (label) => console.log(label, 'at', Date.now() - wall0, 'ms after recording start (wall clock)');
await new Promise((r) => setTimeout(r, 1000));
await p.mouse.move(HX, HY, { steps: 4 }); mark('pointer ON the row');
await new Promise((r) => setTimeout(r, hold));
await p.mouse.move(720, 300, { steps: 4 }); mark('pointer OFF the row');
await new Promise((r) => setTimeout(r, 2000));
await cdp.send('Page.stopScreencast').catch(() => {});
// a sharp still of the hovered state (the recording page is closed first: two heavy pages at once
// kept our loader waiting for smooth frames that never came)
await p.close();
const q = await (await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3 })).newPage();
await q.goto(which === 'orig' ? 'https://landonorris.com' : 'http://localhost:5173/', { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 10000));
await q.mouse.move(HX, HY, { steps: 4 }); await new Promise((r) => setTimeout(r, 1800));
await q.screenshot({ path: `${out}/hover-3x.png`, clip: { x: 0, y: 660, width: 140, height: 240 } });
await q.screenshot({ path: `${out}/hover-full.png` }); // the whole page in the hovered state, 3x
await b.close();
console.log('done', out);
