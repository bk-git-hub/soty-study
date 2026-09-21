// Which element is the box the hero's rectangle lands on, and how big is it at different widths?
// Looks for elements in the first two screens whose box has the target's aspect (35.375 : 22.875).
// Usage: node scripts/target-box.mjs <url> [widths=390,672,991,1200,1440,1920]
import { chromium } from 'playwright';
const [url, widthsS = '390,672,991,1200,1440,1920'] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
for (const w of widthsS.split(',').map(Number)) {
  const p = await (await b.newContext({ viewport: { width: w, height: 900 } })).newPage();
  await p.goto(url, { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 6000));
  const found = await p.evaluate(() => {
    const out = [], rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect(); if (r.width < 100 || r.height < 60) continue;
      const top = r.top + scrollY; if (top > innerHeight * 2.2) continue;
      if (Math.abs(r.width / r.height - 35.375 / 22.875) > 0.02) continue;
      out.push({ tag: el.tagName.toLowerCase(), cls: (el.className && el.className.baseVal === undefined ? el.className : '').toString().slice(0, 60), w: +r.width.toFixed(1), h: +r.height.toFixed(1), pageTop: Math.round(top), left: Math.round(r.left), wRem: +(r.width / rem).toFixed(3) });
    }
    return { rem, out: out.slice(0, 6) };
  });
  console.log('width', w, 'rem', found.rem.toFixed(3)); for (const o of found.out) console.log('   ', JSON.stringify(o));
  await p.close();
}
await b.close();
