import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap, ScrollTrigger } from './gsap';

// Lenis drives the scroll position; GSAP's ticker drives Lenis so ScrollTrigger and
// smooth scrolling share one frame clock (no double-rAF jitter).
let lenis = null;
export const getLenis = () => lenis;

export default function SmoothScroll({ children }) {
  useEffect(() => {
    lenis = new Lenis({
      lerp: 0.1, // scroll "weight": lower = heavier/slower settle (tuned against reference later)
      wheelMultiplier: 1,
      smoothWheel: true,
    });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    window.lenis = lenis;
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenis = null;
    };
  }, []);
  return children;
}
