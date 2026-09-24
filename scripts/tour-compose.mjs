// Two frame folders from tour-capture.mjs -> one side-by-side mp4 (1920x1080, 30 fps): the original left,
// ours right, a label over each pane and a caption for the current chapter below. Labels and captions are
// rendered once per chapter through a browser page (no text rasteriser in Node); the frames are scaled
// 1440x900 -> 960x600 with a bilinear filter and blitted under the overlay.
// Usage: node scripts/tour-compose.mjs <origDir> <localDir> <out.mp4> <ffmpegPath> [workDir]
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { PNG } from 'pngjs';
const [origDir, localDir, outMp4, ffmpeg, workDirArg] = process.argv.slice(2);
const work = workDirArg || `${outMp4}.frames`;
const OUT_W = 1920, OUT_H = 1080, PANE_W = 960, PANE_H = 600, PANE_Y = 240, BG = [40, 44, 32];
const CAPTIONS = {
  start: '왼쪽 원본 · 오른쪽 우리. 같은 마우스와 스크롤 입력',
  paint: '마우스가 지나간 자리에 헬멧이 칠해진다',
  hover: 'NEXT RACE 카드의 헬멧 칸에 마우스를 올리면 마스크가 통째로 켜진다',
  unhover: '마우스를 떼면 커튼이 걷힌다',
  scroll: '스크롤: 흰 네모가 줄고 사인이 쓰인다 → REDEFINING 문장의 하이라이트 리빌 → 갤러리 · ON / OFF TRACK',
};
const tour = JSON.parse(readFileSync(`${origDir}/tour.json`, 'utf8'));
const chapterAt = (t) => { let c = tour.chapters[0][1]; for (const [at, name] of tour.chapters) if (t >= at) c = name; return c; };

// overlays: one transparent 1920x1080 PNG per chapter
rmSync(work, { recursive: true, force: true }); mkdirSync(work, { recursive: true });
const b = await chromium.launch({ channel: 'chromium' });
const page = await (await b.newContext({ viewport: { width: OUT_W, height: OUT_H }, deviceScaleFactor: 1 })).newPage();
const overlays = {};
for (const name of Object.keys(CAPTIONS)) {
  await page.setContent(`<html><body style="margin:0;width:${OUT_W}px;height:${OUT_H}px;background:transparent;font-family:'Segoe UI',Arial,sans-serif;color:#f4f4ed">
    <div style="position:absolute;left:0;top:150px;width:960px;text-align:center;font-size:30px;font-weight:600;letter-spacing:.02em">landonorris.com <span style="opacity:.6;font-weight:400">(원본, OFF+BRAND)</span></div>
    <div style="position:absolute;left:960px;top:150px;width:960px;text-align:center;font-size:30px;font-weight:600;letter-spacing:.02em">soty-study <span style="opacity:.6;font-weight:400">(따라 만든 것)</span></div>
    <div style="position:absolute;left:0;top:890px;width:1920px;text-align:center;font-size:34px;line-height:1.3;padding:0 120px;box-sizing:border-box">${CAPTIONS[name]}</div>
    <div style="position:absolute;left:0;top:1020px;width:1920px;text-align:center;font-size:20px;opacity:.55">github.com/bk-git-hub/soty-study · 관찰로 재현하는 학습 프로젝트, 원본과 무관</div>
  </body></html>`);
  overlays[name] = PNG.sync.read(await page.screenshot({ omitBackground: true }));
}
await b.close();

// bilinear scale of a 1440x900 PNG into a PANE_W x PANE_H buffer
const scaleInto = (src, dst, dx, dy) => {
  const sx = src.width / PANE_W, sy = src.height / PANE_H;
  for (let y = 0; y < PANE_H; y++) { const fy = (y + 0.5) * sy - 0.5, y0 = Math.max(0, Math.floor(fy)), y1 = Math.min(src.height - 1, y0 + 1), wy = fy - y0;
    for (let x = 0; x < PANE_W; x++) { const fx = (x + 0.5) * sx - 0.5, x0 = Math.max(0, Math.floor(fx)), x1 = Math.min(src.width - 1, x0 + 1), wx = fx - x0;
      const o = ((dy + y) * OUT_W + dx + x) * 4;
      for (let c = 0; c < 3; c++) {
        const a = src.data[(y0 * src.width + x0) * 4 + c], bb = src.data[(y0 * src.width + x1) * 4 + c], cc = src.data[(y1 * src.width + x0) * 4 + c], d = src.data[(y1 * src.width + x1) * 4 + c];
        dst.data[o + c] = Math.round((a * (1 - wx) + bb * wx) * (1 - wy) + (cc * (1 - wx) + d * wx) * wy);
      }
      dst.data[o + 3] = 255;
    } }
};
const frame = new PNG({ width: OUT_W, height: OUT_H });
const n = tour.frames.length;
for (let i = 0; i < n; i++) {
  const name = `f${String(i).padStart(5, '0')}.png`;
  if (!existsSync(`${origDir}/${name}`) || !existsSync(`${localDir}/${name}`)) { console.log('stopping at', i, '(a frame is missing)'); break; }
  for (let k = 0; k < frame.data.length; k += 4) { frame.data[k] = BG[0]; frame.data[k + 1] = BG[1]; frame.data[k + 2] = BG[2]; frame.data[k + 3] = 255; }
  scaleInto(PNG.sync.read(readFileSync(`${origDir}/${name}`)), frame, 0, PANE_Y);
  scaleInto(PNG.sync.read(readFileSync(`${localDir}/${name}`)), frame, PANE_W, PANE_Y);
  const ov = overlays[chapterAt(tour.frames[i].t)];
  for (let k = 0; k < frame.data.length; k += 4) { const a = ov.data[k + 3] / 255; if (!a) continue; for (let c = 0; c < 3; c++) frame.data[k + c] = Math.round(ov.data[k + c] * a + frame.data[k + c] * (1 - a)); }
  writeFileSync(`${work}/${name}`, PNG.sync.write(frame, { deflateLevel: 1 }));
  if (i % 200 === 0) console.log('composed', i, '/', n);
}
execFileSync(ffmpeg, ['-y', '-framerate', String(1000 / tour.step), '-i', `${work}/f%05d.png`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', outMp4], { stdio: 'inherit' });
console.log('wrote', outMp4);
