import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
const root = process.cwd() + '/public/orig/runtime/gl/textures/helmet/webp/';
const jobs = [['gold/Norris_Helmet_mat_BaseColor.webp','orig-gold'],['dark/Norris_Helmet_mat_BaseColor.webp','orig-dark'],['grid/Norris_Helmet_mat_BaseColor.webp','orig-grid'],['Norris_Helmet_mat_Normal.webp','orig-normal'],['Norris_Helmet_mat_Roughness.webp','orig-rough']];
const b = await chromium.launch({ channel: 'chromium' });
const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
for (const [f, name] of jobs) {
  await p.goto(pathToFileURL(root + f).href);
  const nat = await p.evaluate(() => { const i = document.querySelector('img'); i.style.width = '1024px'; i.style.height = 'auto'; document.body.style.margin = '0'; return [i.naturalWidth, i.naturalHeight]; });
  await p.locator('img').screenshot({ path: `compare/helmet-livery/${name}.png` });
  console.log(name, nat.join('x'));
}
await b.close();
