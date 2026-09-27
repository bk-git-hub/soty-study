import { useEffect, useRef, useState } from 'react';
import { gsap } from '../lib/gsap';
import { cdn } from '../lib/assets';

/**
 * First-load intro, our own (replaces the original's page-transition Rive file):
 *  1. full lime screen; the J7 mark in the centre erases itself and redraws, again and again, while the
 *     page loads; the name small at the bottom;
 *  2. exit: the "7" becomes a window onto the page. It grows gently to about 4x, then shoots past the
 *     screen edges, so the exit zooms through the logo into the page.
 *
 * How the window works: the lime is one SVG rect with a mask. A mask shows what is white in it and hides
 * what is black, so the mask is a white full-screen rect plus the "7" in black: the lime gets a hole in
 * the shape of the 7, and scaling that black 7 scales the hole.
 * How the mark "draws": each stroke has pathLength = 1; dash 1, gap 1, and the offset animates between
 * 0 (all drawn) and 1 (nothing), keyframes in index.css (.loader-mark).
 */
const J = 'M12 3V27H3V19', SEVEN = 'M17 5H28L20 31'; // the monogram, same strokes as public/assets/identity/mark.svg
const MARK_H = 34, MIN_SHOWN = 1.2, GIVE_UP_S = 1.5, SMOOTH_MS = 34, SMOOTH_FRAMES = 3;

export default function Loader({ canExit, onDone }) {
  const wrap = useRef(null);
  const hole = useRef(null);
  const mark = useRef(null);
  const exit = useRef(canExit);
  exit.current = canExit;
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    let raf = 0, dead = false, leaving = false, last = performance.now(), smooth = 0, readySince = null;
    const shownAt = performance.now();
    const finish = () => { if (dead) return; dead = true; onDone?.(); };
    // Leave once the page is ready, after a few smooth frames (a tween started inside a long frame is over
    // before anyone sees it), but never wait longer than GIVE_UP_S for them.
    const tick = () => {
      if (dead) return;
      const now = performance.now(), dt = now - last; last = now;
      smooth = exit.current && dt < SMOOTH_MS ? smooth + 1 : 0;
      if (exit.current && readySince === null) readySince = now;
      const waited = readySince !== null && (now - readySince) / 1000 > GIVE_UP_S;
      if (!leaving && (smooth >= SMOOTH_FRAMES || waited) && (now - shownAt) / 1000 > MIN_SHOWN) {
        leaving = true;
        // svgOrigin: scale around the middle of the 7's strokes (its own units), not the SVG's corner
        gsap.timeline({ onComplete: finish })
          .set(mark.current, { opacity: 0 })
          .fromTo(hole.current, { scale: 1 }, { scale: 4, duration: 0.25, ease: 'power1.inOut', svgOrigin: '22 18' })
          .to(hole.current, { scale: 90, duration: 0.17, ease: 'power3.in', svgOrigin: '22 18' })
          .to(wrap.current.querySelector('.loader-label'), { opacity: 0, duration: 0.3, ease: 'none' }, 0);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { dead = true; cancelAnimationFrame(raf); };
  }, []);

  // the mark in screen space: 4.5rem tall, centred
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const k = (4.5 * rem) / MARK_H;
  const place = `translate(${size.w / 2 - 16 * k} ${size.h / 2 - 17 * k}) scale(${k})`;
  const stroke = { fill: 'none', strokeWidth: 5.2, strokeLinecap: 'square', strokeLinejoin: 'miter' };
  return (
    <div ref={wrap} className="fixed inset-0 z-[9999] text-dark-green">
      <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${size.w} ${size.h}`} aria-hidden>
        <defs>
          <mask id="loader-hole" maskUnits="userSpaceOnUse" x="0" y="0" width={size.w} height={size.h}>
            <rect width={size.w} height={size.h} fill="#fff" />
            <g transform={place}><g transform="skewX(-10) translate(4 0)"><path ref={hole} d={SEVEN} stroke="#000" {...stroke} /></g></g>
          </mask>
        </defs>
        <rect width={size.w} height={size.h} fill="#d2ff00" mask="url(#loader-hole)" />
        <g ref={mark} transform={place}>
          <g className="loader-mark" transform="skewX(-10) translate(4 0)" stroke="#282c20" {...stroke}>
            <path d={J} pathLength="1" /><path d={SEVEN} pathLength="1" style={{ animationDelay: '.08s' }} />
          </g>
        </g>
      </svg>
      <img src={cdn('ln4-lando-norris-text-mobile.svg')} alt="" className="loader-label absolute left-1/2 -translate-x-1/2 bottom-[var(--gap)] h-[1.4rem] w-auto" />
    </div>
  );
}
