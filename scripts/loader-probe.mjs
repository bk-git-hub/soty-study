// Measure OUR loader from inside the page, one sample per animation frame: is the lime still opaque at
// the corner / near the top centre of the loader canvas, and how long did the frame take. The screencast
// drops frames exactly when the hero finishes loading, so it cannot show whether the exit plays.
// Usage: node scripts/loader-probe.mjs [url=http://localhost:5173/]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:5173/';
const b = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.addInitScript(() => {
  window.__probe = []; let last = performance.now();
  const tick = (t) => {
    const wrap = document.querySelector('[class*="z-[9999]"]'); const cv = wrap && wrap.querySelector('canvas');
    let corner = null, top = null;
    if (cv && cv.width > 0) { try { const c = cv.getContext('2d'); corner = c.getImageData(8, 8, 1, 1).data[3]; top = c.getImageData(cv.width >> 1, Math.round(cv.height * 0.2), 1, 1).data[3]; } catch (e) { corner = -1; } }
    window.__probe.push([Math.round(t), Math.round(t - last), wrap ? getComputedStyle(wrap).backgroundColor === 'rgba(0, 0, 0, 0)' ? 'css-clear' : 'css-lime' : 'gone', corner, top]);
    last = t; if (window.__probe.length < 1500) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
await p.goto(url, { waitUntil: 'commit' });
await new Promise((r) => setTimeout(r, 9000));
const rows = await p.evaluate(() => window.__probe);
await b.close();
// print only the changes, plus every frame while the exit is under way
let prev = '';
for (const [t, dt, css, corner, top] of rows) {
  const key = `${css}|${corner}|${top}`; const exiting = css === 'css-clear' && (corner !== 255 || top !== 255) && css !== 'gone';
  if (key !== prev || exiting || dt > 60) console.log(String(t).padStart(6), 'ms  frame', String(dt).padStart(4), 'ms ', css.padEnd(9), 'corner', String(corner).padStart(4), ' top', String(top).padStart(4));
  prev = key;
}
