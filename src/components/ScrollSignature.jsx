import { useEffect, useImperativeHandle, useRef } from 'react';
import { Rive, Layout, Fit, Alignment } from '@rive-app/react-canvas';
import { rive as riveUrl } from '../lib/assets';

/**
 * The signature that is written across the hero's photo as the page scrolls.
 * The file has two state machines: "signature_play" writes it by time (footer), "signature_scroll"
 * follows a number input `scroll`. Day 0 had put the timed one here; scripts/rive-contents.mjs lists both.
 * The input runs 0..1000, not 0..100 as the animation names ("scroll_0", "scroll_100") suggest: with
 * 0..100 only the first stroke was ever written. scripts/rive-input-sweep.mjs: drawn pixels keep growing
 * up to 1000 and are identical at 1000 and 1500.
 * Driven through a handle, not props: the value changes every scroll frame and nothing should re-render.
 *   ref.current.set(0..1)
 */
const FILE = 'signature', MACHINE = 'signature_scroll', RANGE = 1000;

export default function ScrollSignature({ ref, className = '', style }) {
  const canvas = useRef(null);
  const state = useRef({ rive: null, input: null, value: 0 });

  useImperativeHandle(ref, () => ({
    set(v) {
      const s = state.current;
      s.value = Math.min(1, Math.max(0, v));
      if (s.input) s.input.value = s.value * RANGE;
    },
  }), []);

  useEffect(() => {
    const s = state.current, cv = canvas.current;
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2), r = cv.getBoundingClientRect();
      cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
      s.rive?.resizeDrawingSurfaceToCanvas();
    };
    size();
    const r = new Rive({
      src: riveUrl(FILE), canvas: cv, artboard: FILE, stateMachines: MACHINE, autoplay: true,
      layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
      onLoad: () => {
        s.input = r.stateMachineInputs(MACHINE)?.find((i) => i.name === 'scroll') || null;
        if (s.input) s.input.value = s.value * RANGE;
        size();
      },
    });
    s.rive = r;
    window.addEventListener('resize', size);
    return () => { window.removeEventListener('resize', size); s.input = null; try { r.cleanup(); } catch { /* already gone */ } };
  }, []);

  return <canvas ref={canvas} className={className} style={style} aria-hidden />;
}
