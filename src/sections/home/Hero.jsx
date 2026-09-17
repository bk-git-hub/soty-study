import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap, ScrollTrigger } from '../../lib/gsap';
import { useNavTheme } from '../../lib/navTheme';
import { cdn } from '../../lib/assets';
import HeroHead from '../../gl/HeroHead';
import RiveCanvas from '../../components/RiveCanvas';
import Eyebrow from '../../components/Eyebrow';
import Contours from '../shared/Contours';

/**
 * Home hero: white page, topographic contour lines, WebGL portrait + glass helmet,
 * "NEXT RACE" card bottom-left with the circuit outline Rive and the helmet-reef Rive.
 * The hero is sticky for ~2 screens; the WebGL head shrinks towards the marquee section target.
 */
export default function Hero({ ready }) {
  const ref = useRef(null);
  const progress = useRef(0);
  useNavTheme(ref, 'dark');

  useEffect(() => {
    const st = ScrollTrigger.create({
      trigger: ref.current, start: 'top top', end: '+=100%', scrub: true,
      onUpdate: (self) => { progress.current = self.progress; },
    });
    return () => st.kill();
  }, []);

  return (
    <div ref={ref} className="relative bg-[#f9f9f5] text-dark-green" style={{ height: 'calc(var(--vh) * 200)' }}>
      <div className="sticky top-0 h-[calc(var(--vh)*100)] overflow-clip">
        <Contours className="absolute inset-0 text-[#dcdcd3]" />
        <section className="relative h-full flex items-center justify-center">
          <div className="absolute inset-0 z-10">
            <HeroHead ready={ready} progressRef={progress} />
          </div>
          <h1 className="sr-only">Lando Norris</h1>
          <h2 className="sr-only">2025 McLaren Formula 1 Driver</h2>

          {/* next race card */}
          <div className="absolute left-[var(--gap)] bottom-[var(--gap)] z-10 w-[7.4375rem] h-[15.25rem] text-dark-green-tint-2 max-[479px]:hidden"
               style={{ clipPath: 'ellipse(100% 120% at 50% 0)' }}>
            <svg className="absolute inset-0 -z-[1] w-full h-full" viewBox="0 0 119 244" fill="none" aria-hidden>
              <path d="M118.5 6v232a5.5 5.5 0 0 1-5.5 5.5H6A5.5 5.5 0 0 1 .5 238V25A5.5 5.5 0 0 1 6 19.5h46.346c4.695 0 9.167-2 12.297-5.498l7.46-8.337A15.5 15.5 0 0 1 83.653.5H113a5.5 5.5 0 0 1 5.5 5.5Z" stroke="currentColor" />
            </svg>
            <div className="pt-[1.7rem] px-[.6rem]"><Eyebrow>Next Race</Eyebrow></div>
            <Link to="/calendar" className="flex flex-col items-center justify-center gap-[calc(var(--gap)*.5)] h-[6.9rem]">
              <RiveCanvas file="circuits" artboard="circuits" stateMachine="circuits" className="w-[4.5rem] h-[3.8rem]" />
              <div className="flex gap-1"><Eyebrow>Baku</Eyebrow><Eyebrow>gp</Eyebrow></div>
            </Link>
            <div className="mx-[.6rem] h-px bg-current opacity-50" />
            <div className="flex flex-col items-center justify-center gap-[calc(var(--gap)*.5)] h-[6.9rem]">
              <RiveCanvas file="reef" artboard="helmet-reef" stateMachine="helmet-reef_play" className="w-[5rem] h-[2.6rem]" />
              <Eyebrow className="text-center">mclaren f1 since 2019</Eyebrow>
            </div>
          </div>

          {/* mobile title */}
          <div className="hidden max-[991px]:flex absolute inset-x-0 top-[7rem] flex-col items-center gap-3">
            <img src={cdn('ln4-lando-norris-text-mobile.svg')} alt="Lando Norris" className="w-[60vw]" />
            <Eyebrow>mclaren f1 since 2019</Eyebrow>
          </div>
        </section>
      </div>
    </div>
  );
}
