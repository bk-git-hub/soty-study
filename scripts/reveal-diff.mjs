// Compare two line reveals sample by sample (json from line-reveal.mjs). Each line's clock is aligned on
// the moment its block's right edge crosses 50 % (interpolated; 20 % was above the first sample of some lines), then both recordings are resampled every
// 33 ms: grow = right edge, exit = left edge (while the block is still >= 12 % wide). Prints the two curves
// side by side per line and the mean absolute difference. Usage: node scripts/reveal-diff.mjs <a.json> <b.json>
import { readFileSync } from 'node:fs';
const [fa, fb] = process.argv.slice(2);
const A = JSON.parse(readFileSync(fa, 'utf8')), B = JSON.parse(readFileSync(fb, 'utf8'));
const series = (rows, line, key) => rows.filter((r) => r.line === line && !r.cut && r[key] !== null).map((r) => ({ ms: r.ms, p: Math.min(1, Math.max(0, r[key])) })).sort((a, b) => a.ms - b.ms);
const crossing = (s, level) => { for (let i = 1; i < s.length; i++) if (s[i - 1].p < level && s[i].p >= level) return s[i - 1].ms + (level - s[i - 1].p) / (s[i].p - s[i - 1].p) * (s[i].ms - s[i - 1].ms); return null; };
const at = (s, ms) => { if (!s.length || ms < s[0].ms || ms > s[s.length - 1].ms) return null; for (let i = 1; i < s.length; i++) if (s[i].ms >= ms) { const a = s[i - 1], b = s[i]; return a.p + (b.p - a.p) * (ms - a.ms) / (b.ms - a.ms); } return null; };
const lines = [...new Set(A.map((r) => r.line))].filter((l) => B.some((r) => r.line === l)).sort((a, b) => a - b);
const diffs = { grow: [], exit: [] };
for (const l of lines) {
  const ga = series(A, l, 'b1'), gb = series(B, l, 'b1');
  const t0a = crossing(ga, 0.5), t0b = crossing(gb, 0.5);
  if (t0a === null || t0b === null) { console.log(`L${l}: no 50 % crossing`); continue; }
  // exit: left edge, only while the block is still wide enough to be detected on both
  const ea = series(A, l, 'b0').filter((q) => q.p > 0.02), eb = series(B, l, 'b0').filter((q) => q.p > 0.02);
  const rowG = [], rowE = [];
  for (let k = -33; k <= 900; k += 33) {
    const a = at(ga, t0a + k), b = at(gb, t0b + k);
    if (a !== null && b !== null) { rowG.push(`${Math.round(a * 100)}/${Math.round(b * 100)}`); diffs.grow.push(Math.abs(a - b)); }
    const xa = at(ea, t0a + k), xb = at(eb, t0b + k);
    if (xa !== null && xb !== null && xa < 0.87 && xb < 0.87) { rowE.push(`${Math.round(xa * 100)}/${Math.round(xb * 100)}`); diffs.exit.push(Math.abs(xa - xb)); }
  }
  console.log(`L${l} (t0 ${Math.round(t0a)} vs ${Math.round(t0b)} ms)  grow a/b: ${rowG.join(' ')}`);
  console.log(`   exit a/b: ${rowE.join(' ') || '(no overlap)'}`);
}
for (const k of ['grow', 'exit']) { const d = diffs[k]; console.log(`${k}: ${d.length} paired samples, mean |diff| ${(d.reduce((s, x) => s + x, 0) / d.length * 100).toFixed(1)} %, max ${(Math.max(...d) * 100).toFixed(0)} %`); }
