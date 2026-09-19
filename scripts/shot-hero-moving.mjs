// Screenshot while the pointer is moving (for effects driven by pointer speed). The pointer sweeps left to
// right across the left background for ~1.2 s and the shot is taken mid-sweep.
// Usage: node scripts/shot-hero-moving.mjs <out.png> <url> [wait=10]
import { chromium } from 'playwright';
const [out, url, wait] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto(url, { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, +(wait || 10) * 1000));
await p.mouse.move(60, 450);
for (let i = 0; i <= 40; i++) { await p.mouse.move(60 + i * 6, 450 + Math.sin(i / 4) * 60); await new Promise((r) => setTimeout(r, 25)); }
await p.screenshot({ path: out, timeout: 60000, animations: 'allow' });
await b.close();
console.log('wrote', out);
