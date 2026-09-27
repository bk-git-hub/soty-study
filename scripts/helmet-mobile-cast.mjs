// Phone view of the hall of fame: a phone-sized, touch-emulating page scrolled through the grid in even
// steps, one screenshot per step (named t<step*100>.png so frames2gif.mjs can take them), plus the
// column offset at each step. Usage: node scripts/helmet-mobile-cast.mjs <outDir> [base] [stepPx=40]
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'node:fs';
const [out = 'compare/helmets-mobile', base = 'http://localhost:5173', stepS] = process.argv.slice(2);
const STEP = +(stepS || 40), W = 390, H = 844;
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36' });
const p = await ctx.newPage();
await p.goto(base + '/', { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 10000));
const { top, height } = await p.evaluate(() => { const r = document.querySelector('.helmet-stagger').getBoundingClientRect(); return { top: r.top + scrollY, height: r.height }; });
const from = top - H - 200, to = top + height + 100;
await p.evaluate((y) => window.scrollTo(0, y), from);
await new Promise((r) => setTimeout(r, 1500));
let i = 0;
for (let y = from; y <= to; y += STEP, i++) {
  await p.evaluate((yy) => window.scrollTo(0, yy), y);
  await new Promise((r) => setTimeout(r, 120));
  if (i % 10 === 0 || y + STEP > to) {
    const m = await p.evaluate(() => { const g = document.querySelector('.helmet-stagger'); const c = g.children; return { stagger: getComputedStyle(g).getPropertyValue('--stagger').trim(), diff: Math.round(c[1].getBoundingClientRect().top - c[0].getBoundingClientRect().top) }; });
    console.log(`step ${i} scrollY ${y} stagger ${m.stagger} col2-col1 ${m.diff}px`);
  }
  await p.screenshot({ path: `${out}/t${String(i * 100).padStart(5, '0')}.png` });
}
await b.close();
console.log('frames', i);
