import { gsap } from './gsap';

/*
 * "Highlight" reveal, the site's way of bringing text in: a lime-off block sweeps over the line from the
 * left, and when it sweeps away to the right the text is standing there. (The original marks these
 * elements data-anim-high="right, lime-off": highlight, direction, colour.)
 *
 * Measured on the original's impact statement, 1440x900, on a virtual clock at 33 ms steps
 * (scripts/reveal-virtual.mjs + line-reveal.mjs + fit-ease.mjs, 2026-09-22), seven lines:
 *  - grow: the block's right edge goes 0 -> 100 % of the line's width in 0.6 s, power2.out
 *    (fit error 0.003-0.009 on every line; power3.out is the runner-up at 0.007-0.014)
 *  - 0.39 s after a line starts (the block is at ~96 %), its left edge starts moving right and is gone
 *    0.42 s later, power1.inOut (first build: 0.43 s + 0.35 s, which lagged the original by 7-10 % over
 *    the first frames of the exit and caught up at the end; refit on the per-line curves); the text
 *    simply stands under the opaque block (no clip of its own: the text's visible edge equals the
 *    block's left edge to the pixel)
 *  - the next line starts 0.15 s after the previous one (gaps 157, 160, 130, 157, 145 ms); lines still
 *    below the screen animate unseen, so the stagger is time, not a trigger per line
 *  - the block is the line box (taller than the glyphs), the same #b2c73a as the lime words
 * The captions of the photos below use the same effect at eyebrow size (screencast, blocks ~90 x 9 px).
 */
export const HL_GROW = 0.6, HL_EXIT_AT = 0.39, HL_EXIT = 0.42, HL_STAGGER = 0.15;

/**
 * Wraps each element's content so a block can slide over it, and returns a paused timeline that plays
 * the reveal over them in order. The elements keep their layout: the wrapper is an inline-block the
 * width of the text, so the block covers the ink and not the whole row.
 *   const tl = highlightReveal([...lines]); tl.play();  // or drive it from a ScrollTrigger
 */
export function highlightReveal(elements, { stagger = HL_STAGGER } = {}) {
  const tl = gsap.timeline({ paused: true });
  const wraps = [];
  elements.forEach((el, i) => {
    const wrap = document.createElement('span'); wrap.className = 'hl';
    const text = document.createElement('span'); text.className = 'hl-text';
    while (el.firstChild) text.appendChild(el.firstChild);
    const block = document.createElement('span'); block.className = 'hl-block'; block.setAttribute('aria-hidden', 'true');
    wrap.append(text, block); el.appendChild(wrap); wraps.push(wrap);
    // the two edges are independent tweens on two custom properties (clip-path insets), so the grow can
    // keep finishing its last 3 % while the exit has already begun, as on the original
    const t = i * stagger;
    tl.fromTo(block, { '--hl-r': '100%' }, { '--hl-r': '0%', duration: HL_GROW, ease: 'power2.out' }, t);
    tl.set(text, { visibility: 'visible' }, t + HL_EXIT_AT);
    tl.fromTo(block, { '--hl-l': '0%' }, { '--hl-l': '100%', duration: HL_EXIT, ease: 'power1.inOut' }, t + HL_EXIT_AT);
  });
  // undo the wrapping (SplitText.revert needs the original nodes back)
  tl.revert = () => { tl.kill(); for (const w of wraps) { const el = w.parentNode, text = w.firstChild; while (text.firstChild) el.appendChild(text.firstChild); w.remove(); } };
  return tl;
}
