import { useEffect, useRef } from 'react';
import { gsap } from '../../lib/gsap';
import { useNavTheme } from '../../lib/navTheme';
import { cdn } from '../../lib/assets';
import { STORE } from '../../data/home';
import Button from '../../components/Button';
import Eyebrow from '../../components/Eyebrow';

/**
 * "World Drivers' Champion" store promo. White section with a black visor-shaped top edge
 * bleeding from the helmets section, headline + copy left, a stack of product photos right
 * that parallax at different speeds (images are 4rem taller than their frames).
 */
export default function Store() {
  const ref = useRef(null);
  useNavTheme(ref, 'dark');
  useEffect(() => {
    const imgs = ref.current.querySelectorAll('.p-img');
    const tweens = [...imgs].map((img, i) => gsap.fromTo(img, { y: '-2rem' }, { y: '2rem', ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: true } }));
    return () => tweens.forEach((t) => t.kill());
  }, []);
  return (
    <section ref={ref} className="relative bg-white text-dark-green-tint-1 overflow-clip">
      <div className="absolute -top-px inset-x-0 h-[8rem] bg-black" style={{ clipPath: 'ellipse(70% 100% at 50% 0)' }} />
      <div className="container relative z-[1] px-[11rem] max-[991px]:px-[var(--gap)]">
        <div className="h-[16rem]" />
        <div className="grid grid-cols-2 gap-[var(--gap)]">
          <div className="relative">
            <div className="flex flex-col items-start gap-[calc(var(--gap)*1.5)] relative z-[5]">
              <Eyebrow className="large">{STORE.eyebrow}</Eyebrow>
              <h2 className="t-impact-lg reduce">{STORE.title[0]}<br /><span className="serif">{STORE.title[1]}</span></h2>
              <p className="t-body-reg max-w-[32.4375rem]">{STORE.text}</p>
              <Button to="https://store.landonorris.com" external>{STORE.cta}</Button>
            </div>
            <div className="absolute -left-[14rem] -bottom-[8rem] w-[16.375rem] h-[11.875rem] overflow-clip z-0">
              <img src={cdn(STORE.images.left)} alt="" className="p-img w-full object-cover" style={{ height: 'calc(100% + 4rem)' }} />
            </div>
          </div>
          <div className="relative">
            <div className="relative -top-[4rem] w-[39.375rem] h-[52.0625rem] overflow-clip flex justify-center items-start">
              <img src={cdn(STORE.images.main)} alt="" className="p-img w-full object-cover" style={{ height: 'calc(100% + 4rem)' }} />
            </div>
            <div className="absolute top-[8rem] -right-[16rem] w-[25rem] h-[17.875rem] overflow-clip">
              <img src={cdn(STORE.images.clip)} alt="" className="p-img w-full h-full object-contain" />
            </div>
            <div className="absolute -bottom-[8rem] -left-[11.3rem] w-[14.1875rem] h-[18.125rem] overflow-clip">
              <img src={cdn(STORE.images.small)} alt="" className="p-img w-full object-cover" style={{ height: 'calc(100% + 4rem)' }} />
            </div>
            <div className="absolute -bottom-[2rem] right-[8rem] w-[15.1875rem] h-[11.5rem]">
              <img src={cdn(STORE.images.sticker)} alt="" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
        <div className="h-[8rem]" />
      </div>
    </section>
  );
}
