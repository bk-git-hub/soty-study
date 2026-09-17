// One screenshot of the local hero after the intro, 1440x900, GPU headless. Usage: node scripts/shot-local-hero.mjs [out] [waitSeconds=9]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const out = process.argv[2] || 'compare/hero/local.png'; const wait = +(process.argv[3] || 9);
mkdirSync('compare/hero', { recursive: true });
const b = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto('http://localhost:5173/', { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, wait * 1000));
await p.screenshot({ path: out, timeout: 60000, animations: 'allow' });
await b.close();
console.log('wrote', out);
