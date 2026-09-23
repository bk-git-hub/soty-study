// One screenshot of any local page. Usage: node scripts/shot-url.mjs <out.png> <path> [waitSeconds=8] [w=1440] [h=900]
import { chromium } from 'playwright';
const [out, path, waitS, wS, hS] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: +(wS || 1440), height: +(hS || 900) } })).newPage();
const errors = [];
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
p.on('pageerror', (e) => errors.push(String(e)));
p.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
await p.goto('http://localhost:5173' + path, { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, +(waitS || 8) * 1000));
await p.screenshot({ path: out, timeout: 60000, animations: 'allow' });
await b.close();
console.log('wrote', out, errors.length ? '\nconsole errors:\n' + errors.join('\n') : '(no console errors)');
