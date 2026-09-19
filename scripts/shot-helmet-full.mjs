// One screenshot with the whole painted helmet forced on, for comparing materials without the fluid mask.
//  - original: its own debug switch, params.headScene.SHOW_HELMET_PERMANENTLY, is read once when the head
//    scene is built, so it is flipped from an init script as soon as the params object exists;
//  - local: ?debug=helmet.
// Usage: node scripts/shot-helmet-full.mjs <out.png> <orig|local> [waitSeconds=12] [w=1440] [h=900]
import { chromium } from 'playwright';
const [out, which, waitS, wS, hS] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: +(wS || 1440), height: +(hS || 900) } })).newPage();
if (which === 'orig') {
  await p.addInitScript(() => {
    const t = setInterval(() => {
      const hs = window.landoGL && window.landoGL.params && window.landoGL.params.headScene;
      if (hs) { hs.SHOW_HELMET_PERMANENTLY = true; clearInterval(t); }
    }, 1);
  });
}
// LOCAL_QUERY adds dev params on our side, e.g. LOCAL_QUERY="rough=0.15"
const extra = process.env.LOCAL_QUERY ? `&${process.env.LOCAL_QUERY}` : '';
await p.goto(which === 'orig' ? 'https://landonorris.com' : `http://localhost:5173/?debug=helmet${extra}`, { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, +(waitS || 12) * 1000));
if (which === 'orig') console.log('flag:', await p.evaluate(() => window.landoGL.params.headScene.SHOW_HELMET_PERMANENTLY), 'variant:', await p.evaluate(() => window.landoGL.params.headScene.VARIANT));
await p.screenshot({ path: out, timeout: 60000, animations: 'allow' });
await b.close();
console.log('wrote', out);
