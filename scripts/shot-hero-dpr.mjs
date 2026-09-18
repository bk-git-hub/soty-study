// Like shot-hero.mjs but with a device scale factor. Usage: node scripts/shot-hero-dpr.mjs <out.png> <url> <w> <h> <dpr> [wait=9]
import { chromium } from 'playwright';
const [out, url, w, h, dpr, wait] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dpr });
const p = await ctx.newPage();
await p.goto(url, { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, +(wait || 9) * 1000));
await p.screenshot({ path: out, timeout: 60000, animations: 'allow' });
await b.close();
console.log('wrote', out);
