import { useEffect, useRef } from 'react';
import { gsap } from '../lib/gsap';
import { cdn } from '../lib/assets';

/**
 * First-load intro, observed on the original:
 *  1. full lime screen, LN mark centered, "LANDO NORRIS" small at the bottom
 *  2. mark shrinks to a dot (~0.7s)
 *  3. a diagonal lime band wipes off the screen to reveal the hero (~1s)
 * The original runs step 3 as a Rive animation (page-transition.riv); here it's a clip-path tween.
 */
export default function Loader({ onDone }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const mark = el.querySelector('.loader-mark');
    const tl = gsap.timeline({ onComplete: () => { gsap.set(el, { display: 'none' }); onDone?.(); } });
    tl.fromTo(mark, { scale: 1, opacity: 1 }, { scale: 0.08, duration: 0.7, ease: 'expo.in', delay: 0.6 })
      .to(mark, { opacity: 0, duration: 0.15 }, '-=0.05')
      // diagonal wipe: polygon goes from full cover to a thin band exiting top-right
      .fromTo(el,
        { clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' },
        { clipPath: 'polygon(130% 0, 200% 0, 170% 100%, 100% 100%)', duration: 1.1, ease: 'expo.inOut' }, '-=0.1');
    return () => tl.kill();
  }, []);
  return (
    <div ref={ref} className="fixed inset-0 z-[9999] bg-lime flex items-center justify-center text-dark-green">
      <img src={cdn('ln4-LN-logo-svg.svg')} alt="" className="loader-mark w-[3rem] h-[3rem]" />
      <img src={cdn('ln4-lando-norris-text-mobile.svg')} alt="" className="absolute bottom-[var(--gap)] h-[1.4rem] w-auto" />
    </div>
  );
}
