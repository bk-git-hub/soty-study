// What is inside a .riv file? Lists artboards, animations (with length) and state machines with their inputs,
// using the project's own Rive runtime through the dev server. Usage: node scripts/rive-contents.mjs <name> [base=http://localhost:5173]
import { chromium } from 'playwright';
const [name, base = 'http://localhost:5173'] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chromium' });
const p = await (await b.newContext()).newPage();
await p.goto(base + '/calendar', { waitUntil: 'load' });
const out = await p.evaluate(async (name) => {
  const assets = await import('/src/lib/assets.js');
  // the pre-bundled module is CommonJS underneath: the class may sit on the namespace or on its default export
  const m = await import('/node_modules/.vite/deps/@rive-app_react-canvas.js');
  const Rive = m.Rive || m.default?.Rive;
  if (!Rive) return 'no Rive export; keys: ' + Object.keys(m).join(',') + ' / default: ' + Object.keys(m.default || {}).join(',');
  const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 300;
  return await new Promise((res) => {
    const r = new Rive({ src: assets.rive(name), canvas, autoplay: false,
      onLoad: () => res(JSON.stringify(r.contents, null, 1)), onLoadError: (e) => res('load error ' + JSON.stringify(e)) });
  });
}, name);
console.log(out);
await b.close();
