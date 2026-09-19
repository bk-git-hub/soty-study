import { useEffect, useState } from 'react';
import { getLenis } from '../lib/SmoothScroll';

/**
 * Touch devices only: a button that locks page scrolling so a finger can paint the helmet.
 * On a phone every swipe over the hero scrolls the page away, so the fluid reveal is hard to play with;
 * the original solves it with this toggle. Observed on the original with an emulated phone (2026-09-20):
 *  - hidden on desktop (display: none), fixed bottom-right on touch: a 43 px lime rounded square, one
 *    gap from the right and bottom edges, with a label to its left in white bold caps;
 *  - "TAP TO LOCK" + a touch icon  ->  tap  ->  "BACK TO SCROLL" + a cross, aria-pressed true;
 *  - while locked the smooth scroller is stopped and the root element clips its overflow;
 *  - it fades with the hero (shown only while the hero is on screen).
 * The two icons are drawn here from scratch (a touch point with ripples, a cross), not taken from the site.
 */
export default function HeroTouchLock({ visible }) {
  const [touch, setTouch] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    // By width, not by touch capability. First version asked the browser "is this a touch device?";
    // the original does not: its control shows at 991 px and below and hides from 992 px up, with or
    // without touch (checked at 1440 + touch: hidden; 800 without touch: shown; breakpoint walked
    // 1200..767). `touch` below therefore means "narrow layout".
    const mq = window.matchMedia('(max-width: 991px)');
    const on = () => setTouch(mq.matches);
    on(); mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // the lock itself; always released when the control goes away (scrolled past, route change, unmount)
  useEffect(() => {
    const root = document.documentElement;
    if (locked && visible && touch) {
      getLenis()?.stop();
      root.style.overflow = 'clip';
      root.style.overscrollBehavior = 'none'; // no pull-to-refresh while painting
      root.style.touchAction = 'none';
      return () => { getLenis()?.start(); root.style.overflow = ''; root.style.overscrollBehavior = ''; root.style.touchAction = ''; };
    }
  }, [locked, visible, touch]);
  useEffect(() => { if (!visible) setLocked(false); }, [visible]);

  if (!touch) return null;
  return (
    // Sizes in px, as measured on the original at 390 px wide (43 px button, 14 px from the edges).
    // In rem the button came out at 29 px: our fluid rem is 10.7 px on a phone, the original's is larger
    // there. That is a site-wide mobile type-scale difference, not something to fix from inside this control.
    <div className="fixed right-[14px] bottom-[14px] z-30 flex items-center gap-[11px] transition-opacity duration-300"
         style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}>
      {/* 8.5 px: "TAP TO LOCK" is 57 px wide on the original; at 13 px ours came out 87 px wide */}
      <span className="text-white font-bold uppercase text-[8.5px] leading-none tracking-[0.01em] select-none" aria-hidden>
        {locked ? 'Back to scroll' : 'Tap to lock'}
      </span>
      <button type="button" aria-pressed={locked} aria-label={locked ? 'Unlock scrolling' : 'Lock scrolling to draw on the helmet'}
              onClick={() => setLocked((v) => !v)}
              className="w-[43px] h-[43px] rounded-[10px] bg-lime text-dark-green flex items-center justify-center">
        {/* own drawings: a fingertip with its tap ripple, and a cross. Stroke ~4 px on screen, the cross
            17 px wide, as heavy as the original's icons (the first pass was half that and read as wifi). */}
        <svg viewBox="0 0 24 24" className="w-[24px] h-[24px]" fill="none" stroke="currentColor" strokeWidth="3.8" strokeLinecap="round" aria-hidden>
          {locked
            ? <path d="M4.5 4.5l15 15M19.5 4.5l-15 15" />
            : <><circle cx="12" cy="12" r="3.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="8.6" strokeWidth="2.8" /></>}
        </svg>
      </button>
    </div>
  );
}
