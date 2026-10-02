import { useEffect, useImperativeHandle, useRef } from 'react';
import signature from '../data/signature';

/**
 * A handwritten signature that writes itself from a 0..1 progress value.
 *
 * Same handle as ScrollSignature (the Rive one), so either can be driven by the same ScrollTrigger:
 *   ref.current.set(0..1)
 * Driven through a handle rather than a prop because the value changes every scroll frame and
 * nothing here should re-render.
 *
 * How the drawing works: one dash as long as the path, offset by the same amount, puts the gap over
 * the whole path so nothing shows. Walking the offset back to 0 uncovers the path from its start,
 * which is exactly the pen's direction because the paths are stored in writing order.
 *
 * The 0..1 progress is split across the strokes by ARC LENGTH, not one slice per stroke: a short
 * stroke must take proportionally less of the scroll, or the pen visibly stalls on the small ones.
 */
export default function SignatureDraw({ ref, className = '', style, title }) {
  const paths = useRef([]);
  // lens from the data file are used for the first paint; the browser's own measurement replaces
  // them on mount, since the dash must match the rendered length exactly or the last bit never closes
  const state = useRef({ lens: signature.lens.slice(), total: signature.lens.reduce((a, b) => a + b, 0), value: 0 });

  const apply = (v) => {
    const s = state.current;
    let want = v * s.total;
    for (let i = 0; i < paths.current.length; i++) {
      const el = paths.current[i], len = s.lens[i];
      if (!el) continue;
      const local = Math.max(0, Math.min(1, want / len));
      want -= len;
      el.style.strokeDashoffset = len * (1 - local);
    }
  };

  useImperativeHandle(ref, () => ({
    set(v) {
      const s = state.current;
      s.value = Math.max(0, Math.min(1, v));
      apply(s.value);
    },
    get value() { return state.current.value; },
  }), []);

  useEffect(() => {
    const s = state.current;
    s.lens = paths.current.map((el, i) => el?.getTotalLength?.() ?? signature.lens[i]);
    s.total = s.lens.reduce((a, b) => a + b, 0);
    paths.current.forEach((el, i) => { if (el) el.style.strokeDasharray = `${s.lens[i]} ${s.lens[i]}`; });
    apply(s.value);
  }, []);

  return (
    <svg
      className={className}
      style={style}
      viewBox={signature.viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={signature.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {signature.paths.map((d, i) => (
        <path
          key={i}
          ref={(el) => { paths.current[i] = el; }}
          d={d}
          // inline so the very first paint is already blank, before the effect measures
          style={{ strokeDasharray: `${signature.lens[i]} ${signature.lens[i]}`, strokeDashoffset: signature.lens[i] }}
        />
      ))}
    </svg>
  );
}
