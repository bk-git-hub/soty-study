// Fit an easing to a reveal measured by line-reveal.mjs (json). For each line and phase, the samples are
// (ms, progress): grow = the block's right edge b1 (while the left edge is still ~0), exit = the block's
// left edge b0 (once the right edge is ~1). For every candidate easing the start time t0 and duration T
// that minimise the error are searched; the best few are printed per line, then the median T per phase.
// Usage: node scripts/fit-ease.mjs <samples.json> [minMs=0] [maxMs=inf]
import { readFileSync } from 'node:fs';
const [file, minS, maxS] = process.argv.slice(2);
const rows = JSON.parse(readFileSync(file, 'utf8')).filter((r) => r.ms >= +(minS || 0) && r.ms <= +(maxS || Infinity) && !r.cut);
const E = {
  'power1.out': (t) => 1 - (1 - t) ** 2, 'power2.out': (t) => 1 - (1 - t) ** 3, 'power3.out': (t) => 1 - (1 - t) ** 4, 'power4.out': (t) => 1 - (1 - t) ** 5,
  'expo.out': (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)), 'circ.out': (t) => Math.sqrt(1 - (t - 1) ** 2),
  'power1.inOut': (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) ** 2), 'power2.inOut': (t) => (t < 0.5 ? 4 * t ** 3 : 1 - 4 * (1 - t) ** 3), 'power3.inOut': (t) => (t < 0.5 ? 8 * t ** 4 : 1 - 8 * (1 - t) ** 4),
  'expo.inOut': (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 2 ** (20 * t - 10) / 2 : 1 - 2 ** (-20 * t + 10) / 2),
  'power1.in': (t) => t * t, 'power2.in': (t) => t ** 3, 'power3.in': (t) => t ** 4, 'none': (t) => t,
  'site (.19,1,.22,1)': (t) => bez(t, 0.19, 1, 0.22, 1), 'anim (.65,.05,0,1)': (t) => bez(t, 0.65, 0.05, 0, 1),
};
function bez(x, x1, y1, x2, y2) { let lo = 0, hi = 1; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2, bx = 3 * (1 - m) ** 2 * m * x1 + 3 * (1 - m) * m * m * x2 + m ** 3; if (bx < x) lo = m; else hi = m; } const m = (lo + hi) / 2; return 3 * (1 - m) ** 2 * m * y1 + 3 * (1 - m) * m * m * y2 + m ** 3; }
const lines = [...new Set(rows.map((r) => r.line))].sort((a, b) => a - b);
const fit = (pts) => { // pts: [{ms, p}]
  if (pts.length < 4) return null;
  const out = [];
  for (const [name, f] of Object.entries(E)) {
    let best = { err: Infinity };
    const tmin = Math.min(...pts.map((q) => q.ms)) - 700, tmax = Math.min(...pts.filter((q) => q.p > 0.02).map((q) => q.ms));
    for (let T = 150; T <= 1500; T += 10) for (let t0 = tmin; t0 <= tmax; t0 += 5) {
      let err = 0; for (const q of pts) { const t = Math.min(1, Math.max(0, (q.ms - t0) / T)); err += (f(t) - q.p) ** 2; }
      err = Math.sqrt(err / pts.length); if (err < best.err) best = { err, T, t0 };
    }
    out.push({ name, ...best });
  }
  return out.sort((a, b) => a.err - b.err);
};
const perPhase = { grow: [], exit: [] };
for (const ln of lines) {
  const r = rows.filter((q) => q.line === ln);
  const grow = r.filter((q) => q.b1 !== null && q.b0 < 0.05).map((q) => ({ ms: q.ms, p: Math.min(1, Math.max(0, q.b1)) }));
  const lastGrow = grow.length ? Math.max(...grow.map((q) => q.ms)) : 0;
  const exit = r.filter((q) => q.b0 !== null && q.b0 >= 0.05 && q.b1 > 0.9).map((q) => ({ ms: q.ms, p: Math.min(1, Math.max(0, q.b0)) }));
  // the block's disappearance = exit complete: first frame after the exit began with no block but text to 100 %
  const gone = r.filter((q) => q.b0 === null && q.t1 !== null && q.t1 > 0.97 && q.ms > lastGrow).map((q) => q.ms);
  if (gone.length) exit.push({ ms: Math.min(...gone), p: 1 });
  for (const [phase, pts] of [['grow', grow], ['exit', exit]]) {
    const fits = fit(pts); if (!fits) { console.log(`L${ln} ${phase}: ${pts.length} samples, too few`); continue; }
    console.log(`L${ln} ${phase} (${pts.length} samples, ${pts[0].ms}..${pts[pts.length - 1].ms} ms): ` + fits.slice(0, 4).map((f) => `${f.name} T=${f.T} t0=${f.t0} err=${f.err.toFixed(3)}`).join(' | '));
    perPhase[phase].push(fits);
  }
}
for (const phase of ['grow', 'exit']) {
  const names = Object.keys(E), score = names.map((n) => ({ n, err: perPhase[phase].reduce((s, fits) => s + fits.find((f) => f.name === n).err, 0) / Math.max(1, perPhase[phase].length), T: perPhase[phase].map((fits) => fits.find((f) => f.name === n).T).sort((a, b) => a - b) }));
  score.sort((a, b) => a.err - b.err);
  console.log(`${phase}: best over all lines ->`, score.slice(0, 4).map((s) => `${s.n} mean err ${s.err.toFixed(3)} T median ${s.T[Math.floor(s.T.length / 2)]}`).join(' | '));
}
// starts per line (from the best grow fit) -> stagger
const starts = perPhase.grow.map((fits) => fits[0].t0);
console.log('grow start per line (best fit):', starts.map((s, i) => `L${lines[i]} ${s}`).join('  '), ' -> gaps', starts.slice(1).map((s, i) => s - starts[i]).join(', '));
