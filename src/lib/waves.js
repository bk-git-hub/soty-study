import * as THREE from 'three';

/*
 * The page-wide contour background (PageWaves.jsx) paints one colour pair at a time: the page colour and
 * the line colour. Sections say which pair applies from their top down, and one (the photo gallery) fades
 * to the next pair over a scroll range. Measured on the original's stills every 300 px (2026-09-22):
 *   dark green 40,44,32 with lines 54,59,37 from the hero to the gallery; through the gallery the page
 *   goes 70 -> 117 -> 156 -> 188 -> 213 -> 231 -> 241 -> 244 (grey channel, every 300 px from 3000):
 *   power1.out over ~2100 px (the eight samples sit on 1 - (1 - u)^2 within 0.03; power2.out ran ahead
 *   by up to 0.13); then off-white 244,244,237 with lines 227,227,220. The black sections and
 *   the footer paint their own backgrounds over it.
 * Below the impact statement the original's lines no longer move (0-2 % of line pixels change in 3 s, vs
 * 93 % above): from the gallery on they are static art, attached to the page, 2 px wide through the fade
 * and 1 px on the white section. Here the same field is simply frozen: its clock stops once the page
 * reaches the gallery, and the frozen frame scrolls with the page like any drawing would.
 */
const stops = new Map();
const srgb = (r, g, b) => new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
export const WAVES_DARK = { bg: srgb(40, 44, 32), line: srgb(54, 59, 37), thin: 0 };
export const WAVES_WHITE = { bg: srgb(244, 244, 237), line: srgb(227, 227, 220), thin: 1 };
// the pair in force right now; dark until a section says otherwise. thin: 0 = 2 px lines, 1 = 1 px
export const wavesPalette = { bg: WAVES_DARK.bg.clone(), line: WAVES_DARK.line.clone(), thin: 0 };

// The field's own clock: it runs while the page is above the freeze point (a stop with `freeze`) and
// stands still below it, so every canvas that draws the field shows the same frozen frame there.
export const fieldClock = { t: 0, last: null, freezeAt: Infinity };
export function tickFieldClock(now, scrollY) {
  if (fieldClock.last === null) fieldClock.last = now;
  const dt = Math.min(0.1, (now - fieldClock.last) / 1000); fieldClock.last = now;
  if (scrollY < fieldClock.freezeAt) fieldClock.t += dt;
  return fieldClock.t;
}

/**
 * Register the colour pair that applies from `el`'s top. `fade`: { to, end } makes the pair fade into
 * `to` between el's top and the page position `end()` (a function: pins move it), with power1.out.
 * `freeze`: the field's clock stops once the page reaches el's top. `top`: a function giving the page
 * position instead of el's box: a pinned section's box moves with the scroll, its ScrollTrigger start does not.
 */
export function setWaveStop(id, { el, pair, fade, freeze, top }) { stops.set(id, { el, pair, fade, freeze, top }); }
export function removeWaveStop(id) { stops.delete(id); }

const power1Out = (u) => 1 - (1 - u) ** 2;
const tmpA = new THREE.Color(), tmpB = new THREE.Color();
/** Writes the pair for the viewport top `scrollY` into wavesPalette (colours lerped in linear light). */
export function updateWavesPalette(scrollY) {
  let best = null, bestTop = -Infinity, freezeAt = Infinity;
  for (const s of stops.values()) {
    const top = s.top ? s.top() : s.el.getBoundingClientRect().top + window.scrollY;
    if (s.freeze) freezeAt = Math.min(freezeAt, top);
    if (top <= scrollY + 1 && top > bestTop) { best = s; bestTop = top; }
  }
  fieldClock.freezeAt = freezeAt;
  if (!best) return;
  let bg = best.pair.bg, line = best.pair.line, thin = best.pair.thin || 0;
  if (best.fade) {
    const end = best.fade.end();
    const u = power1Out(Math.min(1, Math.max(0, (scrollY - bestTop) / Math.max(1, end - bestTop))));
    bg = tmpA.copy(best.pair.bg).lerp(best.fade.to.bg, u);
    line = tmpB.copy(best.pair.line).lerp(best.fade.to.line, u);
    thin = thin + ((best.fade.to.thin || 0) - thin) * u;
  }
  wavesPalette.bg.copy(bg); wavesPalette.line.copy(line); wavesPalette.thin = thin;
}
