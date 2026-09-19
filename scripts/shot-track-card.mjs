// Time series of the NEXT RACE card's track at 3x device pixels, to measure its rotation and tilt.
// Usage: node scripts/shot-track-card.mjs <outDir> <orig|local> [shots=24] [gapMs=400]
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'node:fs';
const [out, which, shotsS, gapS] = process.argv.slice(2);
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3 })).newPage();
await p.goto(which === 'orig' ? 'https://landonorris.com' : 'http://localhost:5173/', { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 10000));
if (which === 'orig') console.log('tracksScene params:', JSON.stringify(await p.evaluate(() => window.landoGL && window.landoGL.params && window.landoGL.params.tracksScene)));
const t0 = Date.now();
for (let i = 0; i < +(shotsS || 24); i++) {
  const t = Date.now() - t0;
  await p.screenshot({ path: `${out}/s${String(t).padStart(5, '0')}.png`, clip: { x: 17, y: 697, width: 99, height: 92 } });
  await new Promise((r) => setTimeout(r, +(gapS || 400)));
}
await b.close();
console.log('done', out);
