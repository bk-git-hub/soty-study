// Record the original hero at rest (no pointer, no scroll) as a 25 fps WebM using GPU headless
// Chromium, then split it into PNG frames named by time (t00000.png = 0 ms, 40 ms per frame).
// Usage: node scripts/capture-hero-idle.mjs [seconds=20] [url=https://landonorris.com/] [outdir=reference/frames/home/hero-idle]
import { chromium } from 'playwright';
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';

const seconds = +(process.argv[2] || 20);
const url = process.argv[3] || 'https://landonorris.com/';
const out = process.argv[4] || 'reference/frames/home/hero-idle';
const FPS = 25;
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: out, size: { width: 1440, height: 900 } } });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, seconds * 1000));
await ctx.close();
await browser.close();

const webm = readdirSync(out).find((f) => f.endsWith('.webm'));
renameSync(join(out, webm), join(out, 'idle.webm'));
const ffmpegDir = readdirSync(join(homedir(), 'AppData/Local/ms-playwright')).find((d) => d.startsWith('ffmpeg'));
const ffmpeg = join(homedir(), 'AppData/Local/ms-playwright', ffmpegDir, 'ffmpeg-win64.exe');
execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', join(out, 'idle.webm'), '-r', String(FPS), join(out, 'f%05d.png')]);
let n = 0;
for (const f of readdirSync(out).filter((f) => /^f\d+\.png$/.test(f)).sort()) {
  const idx = +f.slice(1, -4) - 1; const ms = Math.round(idx * 1000 / FPS);
  renameSync(join(out, f), join(out, `t${String(ms).padStart(5, '0')}.png`)); n++;
}
console.log('frames:', n, '->', out);
