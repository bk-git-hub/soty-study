// A short series of real PNG screenshots (not video frames: the recorder's codec smears and delays faint
// thin lines) with their actual timestamps. Usage:
//   node scripts/shot-series.mjs <outDir> <url> [count=4] [gapMs=500] [waitSeconds=12] [w=1440] [h=900]
// Files are named by elapsed ms since the first shot: s00000.png, s00530.png, ...
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'node:fs';
const [out, url, countS, gapS, waitS, wS, hS] = process.argv.slice(2);
const count = +(countS || 4), gap = +(gapS || 500);
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: +(wS || 1440), height: +(hS || 900) } });
const p = await ctx.newPage();
await p.goto(url, { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, +(waitS || 12) * 1000));
const t0 = performance.now();
for (let i = 0; i < count; i++) {
  const t = Math.round(performance.now() - t0);
  await p.screenshot({ path: `${out}/s${String(t).padStart(5, '0')}.png`, timeout: 60000, animations: 'allow' });
  console.log('shot at', t, 'ms');
  await new Promise((r) => setTimeout(r, gap));
}
await b.close();
