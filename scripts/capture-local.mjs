// Capture the local build the same way as the reference (same viewport, same scroll steps) into compare/<date>/.
// Usage: node scripts/capture-local.mjs [date] [page...]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'http://localhost:5173';
const PAGES = { home: '/', 'on-track': '/on-track', 'off-track': '/off-track', calendar: '/calendar', '404': '/partnerships' };
const date = process.argv[2] || new Date().toISOString().slice(0, 10);
const only = process.argv.slice(3);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [page, path] of Object.entries(PAGES)) {
  if (only.length && !only.includes(page)) continue;
  const dir = join('compare', date, page, 'desktop');
  mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(BASE + path, { waitUntil: 'load' });
  await sleep(12000); // loader + WebGL warm-up
  const shot = (file) => p.screenshot({ path: file, timeout: 30000, animations: 'allow' }).catch((e) => console.warn('screenshot failed', file, e.message));
  await shot(join(dir, '000-intro.png'));
  const total = await p.evaluate(() => document.documentElement.scrollHeight);
  const step = 450; let i = 1;
  for (let y = step; y < total + step; y += step, i++) {
    await p.mouse.wheel(0, step);
    await sleep(900);
    await shot(join(dir, String(i).padStart(3, '0') + '.png'));
  }
  await ctx.close();
  console.log(page, 'frames:', i, 'height:', total);
}
await browser.close();
