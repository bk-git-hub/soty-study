// Hall of fame zigzag: at several scroll positions, how far apart are columns 1 and 2 (card tops, px),
// what does --stagger say, and where are the grid's top and bottom on screen? Also one screenshot each.
// Usage: node scripts/helmet-stagger-probe.mjs <outDir> [base=http://localhost:5173] [w=1440] [h=900]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [out = 'compare/helmets-stagger', base = 'http://localhost:5173', wS, hS] = process.argv.slice(2);
const W = +(wS || 1440), H = +(hS || 900);
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: W, height: H } })).newPage();
await p.goto(base + '/', { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 10000));
const read = () => p.evaluate(() => {
  const g = document.querySelector('.helmet-stagger'); if (!g) return null;
  const cards = [...g.children], r = g.getBoundingClientRect();
  return { scrollY: Math.round(scrollY), gridTop: Math.round(r.top), gridBottom: Math.round(r.bottom), stagger: getComputedStyle(g).getPropertyValue('--stagger').trim(),
    col1: Math.round(cards[0].getBoundingClientRect().top), col2: Math.round(cards[1].getBoundingClientRect().top), cardH: Math.round(cards[0].getBoundingClientRect().height) };
});
const gridPageTop = await p.evaluate(() => document.querySelector('.helmet-stagger').getBoundingClientRect().top + scrollY);
const gridH = await p.evaluate(() => document.querySelector('.helmet-stagger').getBoundingClientRect().height);
// targets: grid top at the bottom edge, a quarter, half, three quarters of the way, last row leaving, past it
const start = gridPageTop - H, end = gridPageTop + gridH;
const targets = [start - 200, start, start + (end - start) * 0.25, start + (end - start) * 0.5, start + (end - start) * 0.75, end - H * 0.3, end, end + 150];
for (const [i, t] of targets.entries()) {
  for (let k = 0; k < 60; k++) { const y = await p.evaluate(() => scrollY); const d = t - y; if (Math.abs(d) < 4) break; await p.mouse.wheel(0, Math.max(-600, Math.min(600, d))); await new Promise((r) => setTimeout(r, 60)); }
  await new Promise((r) => setTimeout(r, 1200));
  const m = await read();
  console.log(JSON.stringify({ i, ...m, col2MinusCol1: m.col2 - m.col1 }));
  await p.screenshot({ path: `${out}/p${i}.png` });
}
await b.close();
