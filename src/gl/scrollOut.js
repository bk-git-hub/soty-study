/*
 * The hero's scroll-out, as measured on the original (stills at known scroll positions, 1440 and 672 wide;
 * scripts/scroll-series, rect-track, scroll-poke, lime-count, filter-sample; private devlog 2026-09-21).
 *
 * p = scrollY / viewport height, 0..1 over the sticky stretch. e = power1.inOut(p).
 *  - the light page shrinks to a box in the middle of the screen: rect = lerp(screen, target, e).
 *    16 positions on two widths agree with this to the third decimal. The target is 35.375 x 22.875 rem.
 *    What is inside scales with the rect's *height* and gains width when the rect gets relatively wider
 *    (672 px: portrait screen -> landscape box), which is what a WebGL viewport with its own camera
 *    aspect does. So the rect is a viewport, not a CSS clip.
 *  - but the picture shrinks less than the rectangle: the camera also moves in. First build, side by
 *    side: our face was 1.18x too small at 433 px and 1.5x at the end. scripts/scale-match.mjs gives the
 *    magnification that lays ours over the original at seven positions; read as a camera distance
 *    (magnification = 3 / (3 - d)) it is d = 1.00 * e, within 2 % everywhere: z goes from 3 to 2.
 *    (An eyeballed "the face stays 78 % of the rectangle" had hidden this; day 0 had guessed a camera
 *    moving *back*.)
 *  - the same e mixes every colour inside towards a filtered version of itself, in linear light:
 *      page  -> a dark grey-green;   photo -> that same dark colour + the photo's luminance * a pale green
 *    (brightest skin and darkest hair followed through ten positions; the intercept of the fit *is* the
 *    dark page colour, and the mid points land within 0.007).
 *  - below p ~ 0.445 the hero is alive (fluid paint, idle cursor, helmet-row hover). Paint made at 395 px
 *    is whole, at 407 px there is none. Crossing with paint on screen leaves a translucent ghost 0.6 s
 *    later: a short fade started by the crossing, not a value tied to the scroll position. Its length
 *    (0.5 s) is an estimate.
 *  - the blueprint lines thin out before that: clear at p 0.2, faint at 0.41, all but gone at 0.44.
 *    Modelled as a straight fade to zero at the same point (estimate).
 *  - the signature is written by the scroll from p = 0.5 to p ~ 1.21, i.e. it is still being finished
 *    while the box already scrolls away. Found by pairing *events* (the ink's bounding box suddenly
 *    growing: first stroke lands, reach to the right, big loop to the left, far right) between the
 *    original's stills and our file at known input values (scripts/rive-ink-box.mjs): input = 1.57 *
 *    (scrollY - 450) at 900 px of viewport height, within 5 % at six events. A first reading from pixel
 *    counts ("done at 0.95") was wrong: the count rests for a while there, then grows again.
 *    It sits in the middle of the screen and does not scale with the rectangle. Its size is set in
 *    index.css (.hero-sign): min(64.75vw, 800px), not rem as first fitted at a single width.
 */

export const TARGET_REM = [35.375, 22.875];
export const CAMERA_DOLLY = 1.0; // world units towards the head, times e
export const ALIVE_UNTIL = 0.445;
export const ALIVE_FADE = 0.5; // s, estimate
export const SIGN_FROM = 0.5, SIGN_TO = 1.21;

export const power1InOut = (u) => (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u));

// The rectangle in CSS px, origin top-left, centred on the screen. Whole pixels: a DOM layer (the
// signature) is laid over it and must not shimmer against the canvas.
export function rectAt(e, vw, vh, tw, th, out) {
  out.w = Math.round(vw + (tw - vw) * e);
  out.h = Math.round(vh + (th - vh) * e);
  out.x = Math.round((vw - out.w) / 2);
  out.y = Math.round((vh - out.h) / 2);
  return out;
}

// Shared by every shader that draws inside the rectangle. Colours are in the shaders' working space
// (linear): the measured screen colours 73,77,64 (page at the end) decoded from sRGB.
export const SCROLL_FILTER_GLSL = /* glsl */ `
  uniform float uFilter;
  const vec3 FILTER_PAGE = vec3(0.0666, 0.0742, 0.0513);
  const vec3 FILTER_TINT = vec3(0.377, 0.420, 0.291);
  vec3 filterPage(vec3 c) { return mix(c, FILTER_PAGE, uFilter); }
  // the photo turns into a one-colour print on the dark page: only its luminance survives
  vec3 filterPhoto(vec3 c) { return mix(c, FILTER_PAGE + dot(c, vec3(0.2126, 0.7152, 0.0722)) * FILTER_TINT, uFilter); }
`;
