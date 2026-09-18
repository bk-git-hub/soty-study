// Screenshot of a hero with the pointer parked at a given position (for the pointer-follow), GPU headless.
// The mouse is moved there in a few steps right after load, then we wait for the easing to settle.
// Usage: node scripts/shot-hero-mouse.mjs <out.png> <url> <width> <height> <mouseX> <mouseY> [waitSeconds=9]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const [out, url, w, h, mx, my, wait] = process.argv.slice(2);
mkdirSync(dirname(out), { recursive: true });
const b = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: +w, height: +h } });
const p = await ctx.newPage();
await p.goto(url, { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 1500));
await p.mouse.move(+w / 2, +h / 2);
await p.mouse.move(+mx, +my, { steps: 12 });
await new Promise((r) => setTimeout(r, +(wait || 9) * 1000));
await p.mouse.move(+mx + 1, +my); // keep the original's "moving" state alive (its idle cursor takes over after 2 s)
await new Promise((r) => setTimeout(r, 300));
await p.screenshot({ path: out, timeout: 60000, animations: 'allow' });
await b.close();
console.log('wrote', out);
