// Where does a text wrap? For each pattern: the innermost element wider than 100 px whose text matches it,
// its box and font, and the words of each rendered line (one Range per word, grouped by baseline). The
// check behind the ON TRACK description wrap and the statement lines (2026-09-23).
// Usage: node scripts/text-lines.mjs <url> <pattern> [<pattern> ...]   (patterns are case-insensitive regexes)
import { chromium } from 'playwright';
const [url, ...patterns] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chromium' });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto(url, { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 9000));
await p.evaluate(() => document.fonts.ready);
console.log(await p.evaluate((patterns) => patterns.map((src) => {
  const re = new RegExp(src, 'i');
  const ok = (e) => re.test(e.textContent) && e.getBoundingClientRect().width > 100;
  const el = [...document.querySelectorAll('body *')].find((e) => ok(e) && ![...e.children].some(ok));
  if (!el) return `${src}: not found`;
  const r = el.getBoundingClientRect();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const lines = new Map(); let n;
  while ((n = walker.nextNode())) {
    const t = n.textContent, w = /\S+/g; let m;
    while ((m = w.exec(t))) {
      const range = document.createRange(); range.setStart(n, m.index); range.setEnd(n, m.index + m[0].length);
      const rr = range.getBoundingClientRect(); if (!rr.width) continue;
      const key = Math.round(rr.bottom / 4); if (!lines.has(key)) lines.set(key, []); lines.get(key).push(m[0]);
    }
  }
  const cls = [...el.classList].slice(0, 2).join('.');
  return `${src}: <${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}> x ${Math.round(r.left)} w ${Math.round(r.width)} h ${Math.round(r.height)} font ${getComputedStyle(el).fontFamily.split(',')[0]}\n  ` + [...lines.entries()].sort((a, b) => a[0] - b[0]).map(([, ws]) => ws.join(' ')).join('\n  ');
}).join('\n'), patterns));
await b.close();
