// Paint the helmet just above the breakpoint, then scroll across it and shoot at once: does the paint vanish
// with the crossing, or dissolve afterwards? Usage: node scripts/scroll-cross.mjs <outDir> <url> [fromY=380] [wheel=40]
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'node:fs';
const [out, url, fromS, wheelS] = process.argv.slice(2);
const W = 1440, H = 900, from = +(fromS || 380), wheel = +(wheelS || 40);
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: W, height: H } })).newPage();
await p.goto(url, { waitUntil: 'load' });
await sleep(12000);
await p.mouse.move(W * 0.8, H * 0.3);
const still = async () => { let a = await p.evaluate(() => window.scrollY); for (let i = 0; i < 40; i++) { await sleep(80); const c = await p.evaluate(() => window.scrollY); if (Math.abs(c - a) < 0.5) return c; a = c; } return a; };
for (let g = 0; g < 80; g++) { const y = await still(); if (y >= from - 2) break; await p.mouse.wheel(0, Math.max(4, Math.min(100, (from - y) * 0.9))); }
await sleep(600);
const sweep = async () => { for (let k = 0; k < 2; k++) for (let i = 0; i <= 24; i++) { const u = i / 24; await p.mouse.move(W * (0.38 + 0.24 * (k ? 1 - u : u)), H * (0.3 + 0.35 * u)); await sleep(20); } };
await sweep();
const t0 = performance.now();
const shoot = async (tag) => { const y = Math.round(await p.evaluate(() => window.scrollY)); await p.screenshot({ path: `${out}/${tag}.png` }); console.log(tag, 'scrollY', y, 'ms', Math.round(performance.now() - t0)); };
await shoot('a-before');
await p.mouse.wheel(0, wheel);
for (let i = 0; i < 6; i++) await shoot('b' + i);
await b.close();
