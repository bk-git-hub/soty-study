// Capture reference frames + scroll videos of the original site into reference/ (gitignored).
// Usage: node scripts/capture-reference.mjs [page...]   (pages: home on-track off-track calendar 404)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'https://landonorris.com';
const PAGES = { home: '/', 'on-track': '/on-track', 'off-track': '/off-track', calendar: '/calendar', '404': '/partnerships' };
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } };
const only = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
for (const [page, path] of Object.entries(PAGES)) {
  if (only.length && !only.includes(page)) continue;
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    const frames = join('reference/frames', page, vpName);
    const video = join('reference/video', page);
    mkdirSync(frames, { recursive: true }); mkdirSync(video, { recursive: true });
    const ctx = await browser.newContext({ ...vp, recordVideo: { dir: video, size: { width: vp.width, height: vp.height } },
      userAgent: vp.isMobile ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' : undefined });
    const p = await ctx.newPage();
    await p.goto(BASE + path, { waitUntil: 'networkidle' });
    await sleep(3000); // intro / loader
    await p.screenshot({ path: join(frames, '000-intro.png') });
    const total = await p.evaluate(() => document.documentElement.scrollHeight);
    const step = Math.round(vp.height / 2);
    let i = 1;
    for (let y = step; y < total + step; y += step, i++) {
      // wheel events so Lenis + ScrollTrigger react like a real user
      await p.mouse.wheel(0, step);
      await sleep(900);
      await p.screenshot({ path: join(frames, String(i).padStart(3, '0') + '.png') });
    }
    await sleep(1500);
    await ctx.close(); // flushes the video file
    console.log(page, vpName, 'frames:', i, 'height:', total);
  }
}
await browser.close();
