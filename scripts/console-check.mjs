// Load a page in GPU headless Chromium and print console warnings/errors and page errors.
// Usage: node scripts/console-check.mjs <url> [width=1440] [height=900] [waitSeconds=8]
import { chromium } from 'playwright';
const [url, w, h, wait] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: +(w || 1440), height: +(h || 900) } });
const p = await ctx.newPage();
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[' + m.type() + ']', m.text().slice(0, 1200)); });
p.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 600)));
await p.goto(url, { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, +(wait || 8) * 1000));
await b.close();
console.log('done');
