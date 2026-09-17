import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from '../lib/gsap';

/**
 * Small uppercase label with the site's "highlight wipe" reveal:
 * a lime bar scales in from the left over the text, then scales out to the right
 * (transform-origin flips at the midpoint) while the text becomes visible underneath.
 * Observed on every eyebrow / paragraph on the site (data-anim-high="right, lime").
 */
export default function Eyebrow({ children, className = '', color = 'var(--color-lime)', delay = 0, as: Tag = 'div' }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const bar = el.querySelector('.hl-bar');
    const txt = el.querySelector('.hl-text');
    const tl = gsap.timeline({
      paused: true,
      defaults: { ease: 'power3.inOut' },
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      delay,
    });
    tl.set(txt, { clipPath: 'inset(0 100% 0 0)' })
      .fromTo(bar, { scaleX: 0, transformOrigin: 'left center' }, { scaleX: 1, duration: 0.5 })
      .set(bar, { transformOrigin: 'right center' })
      .to(bar, { scaleX: 0, duration: 0.5 })
      .to(txt, { clipPath: 'inset(0 0% 0 0)', duration: 0.5 }, '<');
    return () => { tl.scrollTrigger?.kill(); tl.kill(); };
  }, [delay]);
  return (
    <Tag ref={ref} className={`t-eyebrow relative inline-block ${className}`}>
      <span className="hl-text relative block">{children}</span>
      <span className="hl-bar absolute inset-0 z-[5]" style={{ background: color, transform: 'scaleX(0)' }} aria-hidden />
    </Tag>
  );
}
