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
      // Not `once: true`. A once-trigger kills itself the moment it fires, i.e. it removes itself from
      // ScrollTrigger's list. At phone widths a label is already inside the viewport at load, so it fired
      // while *another* trigger (the hero's nav theme) was being created and was walking that same list:
      // ScrollTrigger read the vanished slot ("Cannot read properties of undefined (reading 'end')"),
      // the error escaped an effect, and React unmounted the whole app. That was the "phone capture
      // stays dark" of the first four days. `play none none none` plays once just the same (replaying a
      // finished timeline does nothing) and never mutates the list.
      scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' },
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
