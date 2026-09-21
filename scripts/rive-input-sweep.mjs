// How does a number input of a Rive state machine map to what is drawn? Sets the input to a series of
// values on a scratch canvas (the project's own runtime, through the dev server) and counts drawn pixels.
// Usage: node scripts/rive-input-sweep.mjs <file> <stateMachine> <input> <v1,v2,...> [base=http://localhost:5173]
import { chromium } from 'playwright';
const [file, machine, input, valuesS, base = 'http://localhost:5173'] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chromium' });
const p = await (await b.newContext({ viewport: { width: 900, height: 700 } })).newPage();
await p.goto(base + '/calendar', { waitUntil: 'load' });
const out = await p.evaluate(async ({ file, machine, input, values }) => {
  const assets = await import('/src/lib/assets.js');
  const m = await import('/node_modules/.vite/deps/@rive-app_react-canvas.js');
  const Rive = m.Rive || m.default?.Rive;
  const canvas = document.createElement('canvas'); canvas.width = 800; canvas.height = 600;
  canvas.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#000'; document.body.appendChild(canvas);
  const r = await new Promise((res) => { const x = new Rive({ src: assets.rive(file), canvas, artboard: file, stateMachines: machine, autoplay: true, onLoad: () => res(x) }); });
  const inp = r.stateMachineInputs(machine).find((i) => i.name === input);
  const count = () => { const c = document.createElement('canvas'); c.width = 800; c.height = 600; const g = c.getContext('2d'); g.drawImage(canvas, 0, 0); const d = g.getImageData(0, 0, 800, 600).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 128) n++; return n; };
  const rows = [];
  for (const v of values) { inp.value = v; await new Promise((q) => setTimeout(q, 700)); rows.push([v, inp.value, count()]); }
  return { bounds: r.bounds, rows };
}, { file, machine, input, values: valuesS.split(',').map(Number) });
console.log('artboard bounds', JSON.stringify(out.bounds));
for (const [v, got, n] of out.rows) console.log('set', String(v).padStart(5), ' reads', String(got).padStart(5), ' drawn px', n);
await b.close();
