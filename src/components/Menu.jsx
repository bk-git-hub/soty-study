import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { gsap } from '../lib/gsap';
import { cdn } from '../lib/assets';
import { getLenis } from '../lib/SmoothScroll';
import RiveCanvas from './RiveCanvas';
import TextHover from './TextHover';
import { SOCIALS } from '../data/site';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/on-track', label: 'On Track' },
  { to: '/off-track', label: 'Off Track' },
  { to: '/calendar', label: 'Calendar' },
];
const IMAGES = ['ln4-menu-img-1.webp', 'ln4-menu-img-3.webp', 'ln4-menu-img-2.webp', 'ln4-menu-img-5.webp'];

/**
 * Full-screen dark-green menu. Opens with an elliptical clip-path wipe from the top
 * (observed: clip-path ellipse(120% 100% at 50% 20%) on the wrapper), links stagger up,
 * image tiles reveal with the same ellipse. The current page link gets a strike-through.
 */
export default function Menu({ open, onClose }) {
  const ref = useRef(null);
  const first = useRef(true);
  const { pathname } = useLocation();

  useEffect(() => {
    const el = ref.current;
    if (first.current) { first.current = false; if (!open) return; }
    const links = el.querySelectorAll('.menu-link');
    const imgs = el.querySelectorAll('.menu-img');
    const lenis = getLenis();
    if (open) {
      lenis?.stop();
      gsap.timeline()
        .set(el, { display: 'flex' })
        .fromTo(el, { clipPath: 'ellipse(120% 0% at 50% 0%)' }, { clipPath: 'ellipse(120% 100% at 50% 20%)', duration: 1, ease: 'expo.out' })
        .fromTo(links, { yPercent: 110 }, { yPercent: 0, stagger: 0.06, duration: 0.9, ease: 'expo.out' }, 0.15)
        .fromTo(imgs, { clipPath: 'ellipse(120% 0% at 50% 0%)' }, { clipPath: 'ellipse(120% 100% at 50% 20%)', stagger: 0.08, duration: 1, ease: 'expo.out' }, 0.2);
    } else {
      lenis?.start();
      gsap.to(el, { clipPath: 'ellipse(120% 0% at 50% 0%)', duration: 0.7, ease: 'expo.inOut', onComplete: () => gsap.set(el, { display: 'none' }) });
    }
  }, [open]);

  return (
    <div ref={ref} className="fixed inset-0 z-[110] bg-dark-green text-white hidden items-center justify-center overflow-clip"
         style={{ clipPath: 'ellipse(120% 0% at 50% 0%)', height: 'calc(var(--vh) * 100)' }}>
      <div className="absolute inset-0 -z-10 opacity-[.12] bg-repeat-x"
           style={{ backgroundImage: `url(${cdn('blobs_nav.svg')})`, backgroundSize: 'auto 170%', backgroundPosition: '50%' }} />
      <div className="container flex justify-between w-full h-full pl-[2.25rem] pr-[8rem] max-[991px]:px-0">
        <div className="flex items-center gap-[calc(var(--gap)*3)] max-[991px]:hidden" style={{ height: 'calc(var(--vh) * 100 - var(--gap) * 2)' }}>
          <div className="flex flex-col gap-[calc(var(--gap)*3)] justify-center">
            {IMAGES.slice(0, 2).map((n) => <img key={n} src={cdn(n)} alt="" className="menu-img w-[23rem] h-[25rem] object-cover" />)}
          </div>
          <div className="flex flex-col gap-[calc(var(--gap)*3)] justify-center">
            {IMAGES.slice(2).map((n) => <img key={n} src={cdn(n)} alt="" className="menu-img w-[23rem] h-[25rem] object-cover" />)}
          </div>
        </div>
        <div className="flex flex-col items-center justify-between text-center py-[calc(var(--gap)*4)] mx-auto min-[992px]:mx-0">
          <div />
          <div className="flex flex-col items-center gap-[calc(var(--gap)*2)] w-full">
            <div className="flex flex-col items-center text-green-off-white-1">
              {LINKS.map((l) => {
                const current = pathname === l.to;
                return (
                  <Link key={l.to} to={l.to} onClick={onClose} className="relative overflow-clip hover:text-lime-off">
                    <span className={`menu-link block t-nav-link relative ${current ? 'text-green-off-white-2' : ''}`}>
                      <TextHover>{l.label}</TextHover>
                      {current && <span className="absolute left-0 right-0 top-[52%] h-[.35rem] bg-lime-off rotate-[-3deg]" aria-hidden />}
                    </span>
                  </Link>
                );
              })}
            </div>
            <div className="flex flex-col items-center gap-[var(--gap)] text-green-off-white-2">
              <RiveCanvas file="reef" artboard="helmet-reef" stateMachine="helmet-reef_scroll"
                          inputs={{ 'color_green-off-white-2': true }} className="w-[5rem] h-[2.6rem]" />
              <span className="t-eyebrow">mclaren f1 since 2019</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-[2rem]">
            <a href="https://store.landonorris.com" target="_blank" rel="noreferrer" className="t-btn"><TextHover>Store</TextHover></a>
            <div className="flex gap-[var(--gap)] t-btn">
              {SOCIALS.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noreferrer"><TextHover>{label}</TextHover></a>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
