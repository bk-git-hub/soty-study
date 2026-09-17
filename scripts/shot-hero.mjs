// One screenshot of a hero (local or original) at a given viewport, GPU headless.
// Usage: node scripts/shot-hero.mjs <out.png> <url> <width> <height> [waitSeconds=9]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const [out, url, w, h, wait] = process.argv.slice(2);
mkdirSync(dirname(out), { recursive: true });
const b = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: +w, height: +h } });
const p = await ctx.newPage();
await p.goto(url, { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, +(wait || 9) * 1000));
await p.screenshot({ path: out, timeout: 60000, animations: 'allow' });
await b.close();
console.log('wrote', out);
