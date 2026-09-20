// Which texture upload is slow, when, and where? Wraps texSubImage2D / texImage2D before the page runs
// and reports every call over 40 ms with its source, the time since navigation and scrollY.
// Usage: node scripts/tex-upload-log.mjs [url] [scroll=1|0]
import { chromium } from 'playwright';
const [url = 'http://localhost:5173/', scrollS = '1'] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.addInitScript(() => {
  window.__tex = [];
  for (const proto of [window.WebGL2RenderingContext && WebGL2RenderingContext.prototype, window.WebGLRenderingContext && WebGLRenderingContext.prototype]) {
    if (!proto) continue;
    for (const name of ['texSubImage2D', 'texImage2D', 'texStorage2D']) {
      const orig = proto[name];
      proto[name] = function (...args) {
        const t0 = performance.now(); const r = orig.apply(this, args); const ms = performance.now() - t0;
        if (ms > 40) {
          const src = args.find((a) => a && (a instanceof HTMLImageElement || a instanceof ImageBitmap || a instanceof HTMLCanvasElement || a instanceof HTMLVideoElement || ArrayBuffer.isView(a)));
          const what = src instanceof HTMLImageElement ? `img ${src.naturalWidth}x${src.naturalHeight} ${src.src.split('/').slice(-3).join('/')}` : src instanceof ImageBitmap ? `bitmap ${src.width}x${src.height}` : src instanceof HTMLCanvasElement ? `canvas ${src.width}x${src.height}` : src ? `typed array ${src.length}` : 'no source';
          window.__tex.push({ name, ms: Math.round(ms), at: Math.round(performance.now()), scrollY: Math.round(scrollY), what, canvas: `${this.canvas.width}x${this.canvas.height}` });
        }
        return r;
      };
    }
  }
});
await p.goto(url, { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 11000));
if (scrollS === '1') { await p.mouse.move(720, 450); for (let i = 0; i < 50; i++) { await p.mouse.wheel(0, 40); await new Promise((r) => setTimeout(r, 50)); } }
await new Promise((r) => setTimeout(r, scrollS === '1' ? 3000 : 9000));
for (const e of await p.evaluate(() => window.__tex)) console.log(JSON.stringify(e));
console.log('final scrollY', await p.evaluate(() => Math.round(scrollY)));
await b.close();
