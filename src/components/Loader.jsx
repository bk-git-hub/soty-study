import { useEffect, useRef } from 'react';
import { Rive, Layout, Fit, Alignment } from '@rive-app/react-canvas';
import { gsap } from '../lib/gsap';
import { cdn, rive as riveUrl } from '../lib/assets';

/**
 * First-load intro, as observed on the original (screencast frames, 2026-09-20):
 *  1. full lime screen; a small mark in the exact centre erases itself to a dot (~0.35 s, accelerating)
 *     and redraws stroke by stroke (~0.5 s), again and again, 0.93-0.95 s per cycle, while assets load;
 *     "LANDO NORRIS" small at the bottom;
 *  2. exit: a window in the shape of the "4" opens in the centre, grows gently to about 4x in ~0.25 s,
 *     then explodes past the screen edges in ~0.17 s. The hero behind is already in its final state.
 *     That "4" is not a separate shape: it is the mark's own negative space, the gap between the L and
 *     the N (LN4), so the exit zooms *through the logo* into the page. The user caught this; I had
 *     logged it as "a 4-shaped window, not the mark". Consistent with the file (its logo artboard is
 *     built from parts named L, N and 4) and with the window starting exactly where the mark sits; not
 *     checked by overlaying the gap and the window at scale 1.
 * There is no mark shrinking to a dot and no diagonal wipe: that was the day-0 guess.
 *
 * Both steps are one Rive file, the same one the original uses for page transitions
 * (page-transition.riv, artboard and state machine "page-transition"). Found by listing the file's
 * contents and flipping its inputs on a scratch canvas:
 *   initial = true before the first frame  -> starts in "page-load-state" (step 1), no cover animation
 *   transition-in = true                   -> "page-in" (step 2, 0.51 s), then "ready"
 * The canvas is transparent wherever the file draws nothing, so the "4" really is a hole onto the page.
 */
const FILE = 'page-transition';
const MIN_SHOWN = 1.2; // s: never flash the loader for less than about one cycle of the mark
const PAGE_IN = 0.514; // s: length of the file's "page-in" animation
const SMOOTH_MS = 34;   // a frame counts as smooth below this (two 60 Hz frames)
const SMOOTH_FRAMES = 3;
const GIVE_UP_S = 1.5;  // stop waiting for smooth frames this long after the page is ready

export default function Loader({ canExit, onDone }) {
  const wrap = useRef(null);
  const canvas = useRef(null);
  const state = useRef({ rive: null, inputs: null, loading: false, leaving: false, shownAt: performance.now() });
  const exit = useRef(canExit);
  exit.current = canExit;

  useEffect(() => {
    const s = state.current, el = wrap.current, cv = canvas.current;
    let raf = 0, dead = false;
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(window.innerWidth * dpr); cv.height = Math.round(window.innerHeight * dpr);
      s.rive?.resizeDrawingSurfaceToCanvas();
    };
    const finish = () => { if (dead) return; dead = true; onDone?.(); };
    // no file (a build without the original's assets) or a broken one: plain fade instead of hanging
    const fallback = () => gsap.to(el, { opacity: 0, duration: 0.4, delay: 0.3, onComplete: finish });

    size();
    const r = new Rive({
      src: riveUrl(FILE), canvas: cv, artboard: FILE, stateMachines: FILE, autoplay: false,
      layout: new Layout({ fit: Fit.Cover, alignment: Alignment.Center }),
      onLoad: () => {
        s.inputs = Object.fromEntries(r.stateMachineInputs(FILE).map((i) => [i.name, i]));
        if (!s.inputs.initial || !s.inputs['transition-in']) { fallback(); return; }
        s.inputs.initial.value = true;
        r.play(FILE);
        // Two frames on, the file is painting the lime itself; the CSS lime underneath has to go, or it
        // would show through the "4". (Not driven by the runtime's StateChange event: in five scratch
        // experiments it arrived in two and never in the rest, with no rule I could find.)
        requestAnimationFrame(() => requestAnimationFrame(() => { s.loading = true; el.style.backgroundColor = 'transparent'; }));
      },
      onLoadError: fallback,
    });
    s.rive = r;

    // leave as soon as the page says it can, the file is in its loading state and the loader has been
    // up for a moment
    // Rive advances its animation by the real time since its last frame. If the exit is started inside a
    // long frame it is over before anyone sees it: the page reports "ready", React re-renders the whole
    // tree (one 600 ms frame in dev), and a 0.51 s "page-in" started there jumps straight to its end.
    // Measured from inside the page (scripts/loader-probe.mjs): lime fully opaque, next frame fully gone.
    // So the exit waits for a few smooth frames *after* the page is ready.
    // ...but not forever. On a machine (or a capture) where no frame ever comes in under SMOOTH_MS the
    // gate never opened and the loader stayed up for good: seen on a 3x capture with a second heavy page
    // open, 12 s of lime. After GIVE_UP_S of trying, a choppy exit beats no exit.
    let lastTick = performance.now(), smooth = 0, readySince = null;
    const tick = () => {
      if (dead) return;
      const now = performance.now(), dt = now - lastTick; lastTick = now;
      smooth = exit.current && dt < SMOOTH_MS ? smooth + 1 : 0;
      if (exit.current && readySince === null) readySince = now;
      const waitedEnough = readySince !== null && (now - readySince) / 1000 > GIVE_UP_S;
      if (!s.leaving && s.loading && (smooth >= SMOOTH_FRAMES || waitedEnough) && (now - s.shownAt) / 1000 > MIN_SHOWN) {
        s.leaving = true;
        s.inputs['transition-in'].value = true;
        // on the original the label is still faintly there when the "4" is already half open
        // (two frames of evidence, so the 0.45 s is an estimate)
        gsap.to(el.querySelector('.loader-label'), { opacity: 0, duration: 0.45, ease: 'none' });
        // "page-in" runs 0.514 s by the state machine's own clock (measured once when the event did
        // arrive). After it the artboard draws nothing, so unmounting a little late is invisible.
        setTimeout(finish, PAGE_IN * 1000 + 80);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener('resize', size);
    return () => { dead = true; cancelAnimationFrame(raf); window.removeEventListener('resize', size); try { r.cleanup(); } catch { /* already gone */ } };
  }, []);

  // lime from the first paint, before the Rive file has arrived
  return (
    <div ref={wrap} className="fixed inset-0 z-[9999] bg-lime text-dark-green">
      <canvas ref={canvas} className="absolute inset-0 w-full h-full" />
      <img src={cdn('ln4-lando-norris-text-mobile.svg')} alt="" className="loader-label absolute left-1/2 -translate-x-1/2 bottom-[var(--gap)] h-[1.4rem] w-auto" />
    </div>
  );
}
