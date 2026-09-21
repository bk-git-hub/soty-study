// Ink bounding box of a Rive state machine at a series of values of one number input, in artboard units
// (0..1 of the canvas). Shows when each new stroke starts: the box suddenly grows.
// Usage: node scripts/rive-ink-box.mjs <file> <stateMachine> <input> <from> <to> <step> [base]
import { chromium } from 'playwright';
const [file, machine, input, fromS, toS, stepS, base = 'http://localhost:5173'] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chromium' });
const p = await (await b.newContext({ viewport: { width: 1100, height: 760 } })).newPage();
await p.goto(base + '/calendar', { waitUntil: 'load' });
const rows = await p.evaluate(async ({ file, machine, input, from, to, step }) => {
  const assets = await import('/src/lib/assets.js');
  const m = await import('/node_modules/.vite/deps/@rive-app_react-canvas.js');
  const Rive = m.Rive || m.default?.Rive;
  const W = 1030, H = 680; // the artboard's own size, so canvas px = artboard units
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  canvas.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#000'; document.body.appendChild(canvas);
  const r = await new Promise((res) => { const x = new Rive({ src: assets.rive(file), canvas, artboard: file, stateMachines: machine, autoplay: true, onLoad: () => res(x) }); });
  const inp = r.stateMachineInputs(machine).find((i) => i.name === input);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true });
  const out = [];
  for (let v = from; v <= to; v += step) {
    inp.value = v; await new Promise((q) => setTimeout(q, 220));
    g.clearRect(0, 0, W, H); g.drawImage(canvas, 0, 0); const d = g.getImageData(0, 0, W, H).data;
    let n = 0, x0 = W, x1 = 0, y0 = H, y1 = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 128) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    out.push([v, n, n ? [x0, y0, x1, y1] : null]);
  }
  return out;
}, { file, machine, input, from: +fromS, to: +toS, step: +stepS });
for (const [v, n, box] of rows) console.log(String(v).padStart(5), String(n).padStart(6), box ? box.join(',') : '');
await b.close();
