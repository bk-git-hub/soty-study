import { useEffect, useRef } from 'react';
import { ScrollTrigger } from '../../lib/gsap';
import { useNavTheme } from '../../lib/navTheme';
import { cdn } from '../../lib/assets';
import { HELMETS } from '../../data/helmets';
import Eyebrow from '../../components/Eyebrow';
import { ID } from '../../data/identity';

/**
 * Helmets Hall of Fame: black section, 4-column grid of "visor" shaped cards.
 * Each card: outline frame SVG (grey; lime overlay fades in on hover), base helmet image
 * (scales 1.1 on hover) and a reveal image wiped in with clip-path ellipse from the top,
 * plus a name / year label bottom-right. Card shape is a mask-image on the item.
 *
 * Stagger (home page): the columns start in a zigzag, 1st and 3rd raised, 2nd and 4th lowered, and
 * straighten as the page scrolls: fully level by the time the last row leaves the top of the screen.
 * One number drives it: --stagger on the grid, 1 = full zigzag, 0 = level, written by a scrubbed
 * ScrollTrigger from "grid top enters at the bottom" to "grid bottom leaves at the top" (or the page end). Each card
 * moves by translateY(dir * stagger * AMP%), where % is of the card's own height and dir is -1 for odd
 * children, +1 for even ones: with 4 columns (or 2 on phones) odd children are always columns 1 and 3.
 */
const FRAME = 'M8 .5h170.12a7.5 7.5 0 0 1 7.5 7.5v154.61a7.5 7.5 0 0 1-7.5 7.5H60.681a10.5 10.5 0 0 0-8.21 3.954l-7.86 9.858a9.5 9.5 0 0 1-7.427 3.578H8A7.5 7.5 0 0 1 .5 180V8A7.5 7.5 0 0 1 8 .5Z';

export function HelmetGrid({ stagger = false }) {
  const grid = useRef(null);
  useEffect(() => {
    if (!stagger) return undefined;
    const el = grid.current;
    const st = ScrollTrigger.create({
      trigger: el, start: 'top bottom',
      // level when the last row leaves the top of the screen, or at the end of the page if that comes
      // first: on phones the footer is shorter than the screen and the last row never gets to leave
      end: () => Math.min(el.getBoundingClientRect().bottom + window.scrollY, ScrollTrigger.maxScroll(window)),
      onUpdate: (self) => el.style.setProperty('--stagger', (1 - self.progress).toFixed(4)),
      onRefresh: (self) => el.style.setProperty('--stagger', (1 - self.progress).toFixed(4)),
    });
    return () => st.kill();
  }, [stagger]);
  return (
    <div ref={grid} className={`grid grid-cols-4 gap-[var(--gap)] max-[991px]:grid-cols-2 ${stagger ? 'helmet-stagger' : ''}`}>
      {HELMETS.map((h, i) => (
        <div key={i} className="helmet-card relative group">
          <div className="helmet-item relative w-full flex" style={{ aspectRatio: '406.89 / 411' }}>
            <svg className="absolute inset-0 w-full h-full text-dark-green-tint-2 z-10 pointer-events-none" viewBox="0 0 187 188" fill="none" aria-hidden>
              <path d={FRAME} stroke="currentColor" strokeWidth="1" />
            </svg>
            <svg className="absolute inset-0 w-full h-full text-lime z-10 pointer-events-none opacity-0 transition-opacity duration-700 group-hover:opacity-100" viewBox="0 0 187 188" fill="none" aria-hidden>
              <path d={FRAME} stroke="currentColor" strokeWidth="2" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center overflow-clip" style={{ WebkitMaskImage: `url(${cdn('ln4-2-helm-mask-fill.svg')})`, maskImage: `url(${cdn('ln4-2-helm-mask-fill.svg')})`, maskSize: 'cover', maskRepeat: 'no-repeat', maskPosition: 'center' }}>
              <img src={cdn(h.base)} alt={`${h.name} helmet ${h.year}`} className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110" style={{ transitionTimingFunction: 'cubic-bezier(.65,.05,0,1)' }} />
              <img src={cdn(h.hover)} alt="" className="helmet-reveal absolute inset-0 w-full h-full object-contain" style={{ backgroundImage: `url(${cdn('transp.webp')})`, backgroundSize: 'cover' }} />
            </div>
          </div>
          <div className="absolute right-0 bottom-0 h-8 flex items-center justify-end z-[5] pr-1">
            <h3 className="t-small-label text-white">{h.name}</h3>
            <span className="t-small-label text-lime-off ml-[.8rem]">{h.year}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Helmets() {
  const ref = useRef(null);
  useNavTheme(ref, 'light');
  return (
    <div ref={ref} className="bg-black text-white">
      <section className="container relative pt-[calc(var(--gap)*2)] pb-[var(--gap)]">
        <div className="grid-main">
          <div className="col-span-2 flex flex-col">
            <h2 className="t-title-lg">Helmets</h2>
            <h2 className="t-title-lg"><span className="t-title-lg-serif text-lime-off">Hall of Fame</span></h2>
          </div>
          <div className="col-span-2 text-grey-on-track flex flex-col items-start">
            <p className="t-body-reg max-w-[26rem]">From bold contour lines to one-off specials, {ID.first} treats every helmet as a canvas worth remembering.</p>
          </div>
        </div>
        <div className="h-[8.75rem]" />
        <HelmetGrid stagger />
      </section>
    </div>
  );
}
