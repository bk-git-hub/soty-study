import * as THREE from 'three';

/*
 * The page-wide contour background (PageWaves.jsx) paints one colour pair at a time: the page colour and
 * the line colour. Sections say which pair applies from their top down, and one (the photo gallery) fades
 * to the next pair over a scroll range. Measured on the original's stills every 300 px (2026-09-22):
 *   dark green 40,44,32 with lines 54,59,37 from the hero to the gallery; through the gallery the page
 *   goes 70 -> 117 -> 156 -> 188 -> 213 -> 231 -> 241 -> 244 (grey channel, every 300 px from 3000):
 *   an ease-out over ~2100 px; then off-white 244,244,237 with lines 227,227,220. The black sections and
 *   the footer paint their own backgrounds over it.
 */
const stops = new Map();
const srgb = (r, g, b) => new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
export const WAVES_DARK = { bg: srgb(40, 44, 32), line: srgb(54, 59, 37) };
export const WAVES_WHITE = { bg: srgb(244, 244, 237), line: srgb(227, 227, 220) };
// the pair in force right now; dark until a section says otherwise
export const wavesPalette = { bg: WAVES_DARK.bg.clone(), line: WAVES_DARK.line.clone() };

/**
 * Register the colour pair that applies from `el`'s top. `fade`: { to, end } makes the pair fade into
 * `to` between el's top and the page position `end()` (a function: pins move it), with power2.out.
 */
export function setWaveStop(id, { el, pair, fade }) { stops.set(id, { el, pair, fade }); }
export function removeWaveStop(id) { stops.delete(id); }

const power2Out = (u) => 1 - (1 - u) ** 3;
const tmpA = new THREE.Color(), tmpB = new THREE.Color();
/** Writes the pair for the viewport top `scrollY` into wavesPalette (colours lerped in linear light). */
export function updateWavesPalette(scrollY) {
  let best = null, bestTop = -Infinity;
  for (const s of stops.values()) {
    const top = s.el.getBoundingClientRect().top + window.scrollY;
    if (top <= scrollY + 1 && top > bestTop) { best = s; bestTop = top; }
  }
  if (!best) return;
  let bg = best.pair.bg, line = best.pair.line;
  if (best.fade) {
    const end = best.fade.end();
    const u = power2Out(Math.min(1, Math.max(0, (scrollY - bestTop) / Math.max(1, end - bestTop))));
    bg = tmpA.copy(best.pair.bg).lerp(best.fade.to.bg, u);
    line = tmpB.copy(best.pair.line).lerp(best.fade.to.line, u);
  }
  wavesPalette.bg.copy(bg); wavesPalette.line.copy(line);
}
