// How does a block of text reveal itself, line by line? Reads a scroll-cast recording (f<ms>.png +
// scroll.json). The lines are located on the LAST frame (rows of ink, in page coordinates); then, for every
// frame, each line's own ink rows are looked at (screen row = page row - scrollY at that time): where is the
// solid lime block (runs >= RUN px, taken as the median over the rows that have one) and how far does the
// text show (off-white pixels and short lime runs = lime words)? Both in % of the line's final ink width.
// Usage: node scripts/line-reveal.mjs <castDir> [RUN=120] [yMinFinal=90] [minInkRow=25] [json=<out.json>]
//   json: also write every (ms, line, block x0/x1 %, text x1 %) sample for fitting (scripts/fit-ease.mjs)
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
const [dir, runS, yMinS, minInkS, jsonOut] = process.argv.slice(2);
const rowsOut = [];
const files = readdirSync(dir).filter((f) => /^f\d+\.png$/.test(f)).sort((a, b) => +a.slice(1, -4) - +b.slice(1, -4));
const samples = JSON.parse(readFileSync(`${dir}/scroll.json`, 'utf8'));
const scrollAt = (ms) => { if (ms <= samples[0].ms) return samples[0].y; for (let i = 1; i < samples.length; i++) if (ms <= samples[i].ms) { const a = samples[i - 1], b = samples[i]; return a.y + (b.y - a.y) * (ms - a.ms) / (b.ms - a.ms); } return samples[samples.length - 1].y; };
const isLime = (r, g, b) => g > 185 && b < 100 && r > 140 && r < 235;
const isWhite = (r, g, b) => r > 170 && g > 170 && b > 150;
const RUN = +(runS || 120), MIN_INK = +(minInkS || 25);
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
// one screen row -> { block: [x0,x1] | null, text: [x0,x1] | null, ink: n }
const scanRow = (png, y) => {
  const W = png.width, lime = new Uint8Array(W); let text = 0, tx0 = W, tx1 = -1;
  for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, r = png.data[i], g = png.data[i + 1], b = png.data[i + 2]; if (isLime(r, g, b)) lime[x] = 1; else if (isWhite(r, g, b)) { text++; tx0 = Math.min(tx0, x); tx1 = Math.max(tx1, x); } }
  let block = null, x = 0;
  while (x < W) { if (!lime[x]) { x++; continue; } let e = x; while (e < W && lime[e]) e++; const len = e - x;
    if (len >= RUN) block = block ? [Math.min(block[0], x), Math.max(block[1], e - 1)] : [x, e - 1]; else { text += len; tx0 = Math.min(tx0, x); tx1 = Math.max(tx1, e - 1); } x = e; }
  return { block, text: text >= MIN_INK ? [tx0, tx1] : null, ink: text };
};
// lines from the last frame
const lastF = files[files.length - 1], lastPng = PNG.sync.read(readFileSync(`${dir}/${lastF}`)), lastY = scrollAt(+lastF.slice(1, -4));
const lines = []; let cur = null;
for (let y = +(yMinS || 90); y < lastPng.height; y++) { const r = scanRow(lastPng, y);
  if (r.text) { if (!cur) cur = { a: y, b: y, x0: r.text[0], x1: r.text[1] }; else { cur.b = y; cur.x0 = Math.min(cur.x0, r.text[0]); cur.x1 = Math.max(cur.x1, r.text[1]); } }
  else if (cur && y - cur.b > 6) { lines.push(cur); cur = null; } }
if (cur) lines.push(cur);
const L = lines.filter((l) => l.b - l.a >= 8).map((l) => ({ top: l.a + lastY, bottom: l.b + lastY, x0: l.x0, x1: l.x1 }));
console.log('lines from the last frame (page rows, ink x):', L.map((l, i) => `L${i + 1} ${Math.round(l.top)}-${Math.round(l.bottom)} [${l.x0}-${l.x1}]`).join('  '));
const pct = (x, l) => ((x - l.x0) / (l.x1 - l.x0) * 100).toFixed(0).padStart(4);
const first = L.map(() => null);
for (const f of files) {
  const ms = +f.slice(1, -4), sy = scrollAt(ms), png = PNG.sync.read(readFileSync(`${dir}/${f}`));
  const cells = [];
  L.forEach((l, i) => {
    const ya = Math.round(l.top - sy), yb = Math.round(l.bottom - sy);
    if (yb < 90 || ya >= png.height) return;
    const bx0 = [], bx1 = []; let tx0 = png.width, tx1 = -1, inkRows = 0;
    for (let y = Math.max(90, ya); y <= Math.min(png.height - 1, yb); y++) { const r = scanRow(png, y); if (r.block) { bx0.push(r.block[0]); bx1.push(r.block[1]); } if (r.text) { inkRows++; tx0 = Math.min(tx0, r.text[0]); tx1 = Math.max(tx1, r.text[1]); } }
    const blk = bx0.length >= 12 ? [median(bx0), median(bx1)] : null;
    if (!blk && inkRows < 8) return;
    if (first[i] === null && (blk || inkRows >= 8)) first[i] = { ms, sy, screenTop: ya, seen: yb < png.height ? 'whole' : 'cut' };
    if (jsonOut) rowsOut.push({ ms, line: i + 1, b0: blk ? (blk[0] - l.x0) / (l.x1 - l.x0) : null, b1: blk ? (blk[1] - l.x0) / (l.x1 - l.x0) : null, t1: inkRows >= 8 ? (tx1 - l.x0) / (l.x1 - l.x0) : null, cut: yb >= png.height });
    cells.push(`| L${i + 1} blk ${blk ? `${pct(blk[0], l)}..${pct(blk[1], l)}` : '    -    '} txt ${inkRows >= 8 ? `${pct(tx0, l)}..${pct(tx1, l)}` : '    -    '}${yb >= png.height ? '*' : ' '}`);
  });
  if (cells.length) console.log(String(ms).padStart(5), `y${String(Math.round(sy)).padStart(4)}`, cells.join(' '));
}
if (jsonOut) { writeFileSync(jsonOut, JSON.stringify(rowsOut)); console.log('wrote', jsonOut, rowsOut.length, 'samples'); }
console.log('first sight of each line (ms, scrollY, line top on screen; * = line cut by the screen bottom):');
first.forEach((f, i) => f && console.log(`  L${i + 1}: ${f.ms} ms, scrollY ${Math.round(f.sy)}, top at screen ${f.screenTop} = ${(f.screenTop / lastPng.height * 100).toFixed(1)} % of ${lastPng.height}${f.seen === 'cut' ? ' *' : ''}`));
