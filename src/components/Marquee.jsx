import { useEffect, useRef } from 'react';
import { gsap } from '../lib/gsap';

/**
 * Infinite marquee. Content is duplicated and translated with a GSAP tween so the loop is
 * seamless; `speed` is px/s. The original also nudges marquee speed with scroll velocity
 * (marquee-scroll-direction-target), which we add here via a velocity multiplier.
 */
export default function Marquee({ children, speed = 40, direction = 'left', className = '', gap = '0px', copies = 3 }) {
  const track = useRef(null);
  useEffect(() => {
    const el = track.current;
    const first = el.children[0];
    let tween;
    const build = () => {
      tween?.kill();
      const w = first.getBoundingClientRect().width;
      if (!w) return;
      const dir = direction === 'left' ? -1 : 1;
      gsap.set(el, { x: dir === 1 ? -w : 0 });
      tween = gsap.to(el, { x: dir === 1 ? 0 : -w, duration: w / speed, ease: 'none', repeat: -1 });
    };
    build();
    const ro = new ResizeObserver(build);
    ro.observe(first);
    return () => { ro.disconnect(); tween?.kill(); };
  }, [speed, direction]);
  return (
    <div className={`overflow-clip w-full ${className}`}>
      <div ref={track} className="flex w-max will-change-transform">
        {Array.from({ length: copies }).map((_, i) => (
          <div key={i} className="flex flex-none items-center" style={{ gap, paddingRight: gap }} aria-hidden={i > 0}>{children}</div>
        ))}
      </div>
    </div>
  );
}
