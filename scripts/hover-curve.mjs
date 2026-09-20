// Colour progress of the card's circuit line, grey (83,84,80) -> lime (210,255,0), per screencast frame.
// Anti-aliased line pixels are blends with the page, so each pixel's (R - B) is normalised by how much
// it is covered (its drop in blue): rho = sum(R - B - 2) / sum(250 - B), and for a line colour
// grey + t (lime - grey): rho(t) = (1 + 207 t) / (170 + 80 t)  ->  t = (170 rho - 1) / (207 - 80 rho).
// Also reports the amount of ink (covered blue-drop), which grows when the line gets thicker.
// Usage: node scripts/hover-curve.mjs <dir> [onMs] [offMs]
import { readFileSync, readdirSync } from 'node:fs';
import { PNG } from 'pngjs';
const [dir, onS, offS] = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => /^f\d+\.png$/.test(f)).sort();
const rows = [];
for (const f of files) {
  const img = PNG.sync.read(readFileSync(`${dir}/${f}`)); const d = img.data, W = img.width;
  let num = 0, den = 0;
  for (let y = 702; y < 762; y++) for (let x = 22; x < 112; x++) { const o = (y * W + x) * 4; const dB = 250 - d[o + 2]; if (dB > 40) { num += d[o] - d[o + 2] - 2; den += dB; } }
  if (den < 200) continue;
  const rho = num / den, t = (170 * rho - 1) / (207 - 80 * rho);
  rows.push([+f.slice(1, -4), Math.max(0, Math.min(1, t)), den]);
}
const on = +(onS || 0), off = +(offS || 1e9);
for (const [ms, t, ink] of rows) console.log(String(ms).padStart(6), 'ms', ms < on ? '      ' : ms < off ? ' HOVER' : ' after', ' t =', t.toFixed(2), ' ink', String(Math.round(ink / 100)).padStart(4));
const first = (pred) => (rows.find(pred) || [null])[0];
console.log('\nhover-in : t crosses 0.1 at', first((r) => r[0] >= on && r[1] > 0.1), ' 0.5 at', first((r) => r[0] >= on && r[1] > 0.5), ' 0.9 at', first((r) => r[0] >= on && r[1] > 0.9), '(pointer on at', on + ')');
console.log('hover-out: t drops below 0.9 at', first((r) => r[0] >= off && r[1] < 0.9), ' 0.5 at', first((r) => r[0] >= off && r[1] < 0.5), ' 0.1 at', first((r) => r[0] >= off && r[1] < 0.1), '(pointer off at', off + ')');
