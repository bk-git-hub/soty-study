import { useEffect, useImperativeHandle, useRef } from 'react';
import { SIGNATURE_D, SIGNATURE_VIEWBOX } from '../data/signaturePath';

/**
 * The fictional driver's signature, written stroke by stroke. Replaces the original's Rive file.
 * How the "writing" works: the path gets pathLength = 1, so its whole length counts as 1 unit; a dash
 * of 1 followed by a gap of 1, shifted by stroke-dashoffset, shows exactly the first (1 - offset) of the
 * line. Offset 1 = nothing written, 0 = all of it.
 *  - mode "play": writes itself once when it comes into view (like the Rive "signature_play")
 *  - mode "scroll": driven from outside, ref.current.set(0..1), like the hero's "signature_scroll"
 */
const COLOURS = { lime: '#d2ff00', 'dark-green-tint-2': '#535450', 'grey-on-track': '#b9bbad', white: '#f4f4ed' };

export default function SignatureStroke({ ref, mode = 'play', color = 'lime', duration = 1.8, className = '', style }) {
  const path = useRef(null);

  useImperativeHandle(ref, () => ({
    set(v) { if (path.current) path.current.style.strokeDashoffset = String(1 - Math.min(1, Math.max(0, v))); },
  }), []);

  useEffect(() => {
    if (mode !== 'play') return undefined;
    const el = path.current;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      // ease in-out like a pen: slow start, quick middle, slow finish
      el.style.transition = `stroke-dashoffset ${duration}s cubic-bezier(.65,0,.35,1)`;
      el.style.strokeDashoffset = '0';
      io.disconnect();
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [mode, duration]);

  return (
    <svg viewBox={SIGNATURE_VIEWBOX} className={className} style={{ display: 'block', ...style }} fill="none" aria-hidden preserveAspectRatio="xMidYMid meet">
      <path ref={path} d={SIGNATURE_D} pathLength="1" strokeDasharray="1" strokeDashoffset="1"
        stroke={COLOURS[color] || color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
