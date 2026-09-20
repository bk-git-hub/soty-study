import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap, ScrollTrigger } from '../../lib/gsap';
import { useNavTheme } from '../../lib/navTheme';
import { cdn } from '../../lib/assets';
import HeroHead from '../../gl/HeroHead';
import TrackMini from '../../gl/TrackMini';
import HeroTouchLock from '../../components/HeroTouchLock';
import RiveCanvas from '../../components/RiveCanvas';
import Eyebrow from '../../components/Eyebrow';

/**
 * Home hero: white page, topographic contour lines, WebGL portrait + glass helmet,
 * "NEXT RACE" card bottom-left with the circuit outline Rive and the helmet-reef Rive.
 * The hero is sticky for ~2 screens; the WebGL head shrinks towards the marquee section target.
 */
export default function Hero({ ready, onHeroReady }) {
  const ref = useRef(null);
  const progress = useRef(0);
  // The lock button lives only while the hero fills the screen. It is told so imperatively: a React
  // state here re-rendered the whole hero at the boundary, and the WebGL canvases with it: one frame
  // of 467 ms (1440 wide) to 1284 ms (800 wide) exactly where the button faded. A speed bump.
  const lock = useRef(null);
  // pointer on the card's helmet row: the whole reveal mask goes on (a ref, so nothing re-renders)
  const helmetHover = useRef(false);
  useNavTheme(ref, 'dark');

  useEffect(() => {
    const st = ScrollTrigger.create({
      trigger: ref.current, start: 'top top', end: '+=100%', scrub: true,
      onUpdate: (self) => { progress.current = self.progress; lock.current?.setOnHero(self.progress < 0.3); },
    });
    return () => st.kill();
  }, []);

  return (
    <div ref={ref} className="relative bg-[#fcfcfa] text-dark-green" style={{ height: 'calc(var(--vh) * 200)' }}>
      <div className="sticky top-0 h-[calc(var(--vh)*100)] overflow-clip">
        {/* the contour lines are drawn in WebGL now (src/gl/BackgroundWaves.jsx) */}
        <section className="relative h-full flex items-center justify-center">
          <div className="absolute inset-0 z-10">
            <HeroHead onReady={onHeroReady} progressRef={progress} helmetHover={helmetHover} />
          </div>
          <h1 className="sr-only">Lando Norris</h1>
          <h2 className="sr-only">2025 McLaren Formula 1 Driver</h2>

          {/* next race card */}
          <div className="absolute left-[var(--gap)] bottom-[var(--gap)] z-10 w-[7.4375rem] h-[15.25rem] text-dark-green-tint-2 max-[479px]:hidden"
               style={{ clipPath: 'ellipse(100% 120% at 50% 0)' }}>
            <svg className="absolute inset-0 -z-[1] w-full h-full" viewBox="0 0 119 244" fill="none" aria-hidden>
              <path d="M118.5 6v232a5.5 5.5 0 0 1-5.5 5.5H6A5.5 5.5 0 0 1 .5 238V25A5.5 5.5 0 0 1 6 19.5h46.346c4.695 0 9.167-2 12.297-5.498l7.46-8.337A15.5 15.5 0 0 1 83.653.5H113a5.5 5.5 0 0 1 5.5 5.5Z" stroke="currentColor" />
            </svg>
            {/* Inner layout as measured on the original's DOM at 1440x900 (1 rem = 13.33 px): a 17 px notch
                for the label above the outline's lowered left shoulder, then two 92 px rows split by a
                hairline. Day 0 had the label ~25 px lower, which pushed the circuit and its name down
                (circuit centre at y 760 instead of 734). */}
            {/* Positioning goes on flex wrappers, never on <Eyebrow>: it carries its own `relative inline-block`,
                which beats an `absolute` passed in (the label then stays in flow and `bottom` lifts it), and
                as an inline-block in a plain block it sinks ~8 px into the parent's 20 px line box. */}
            <div className="h-[1.275rem]" />
            <div className="absolute left-0 top-[0.05rem] flex"><Eyebrow>Next Race</Eyebrow></div>
            <Link to="/calendar" className="relative block h-[6.9rem]">
              {/* the next race's circuit as a spinning 3D outline (was a flat Rive drawing on day 0);
                  centred 37 px below the row's top, its name centred 81 px below */}
              <TrackMini circuit="baku" className="absolute inset-x-0 top-[0.65rem] h-[4.25rem]" />
              <div className="absolute inset-x-0 bottom-[0.5rem] flex justify-center gap-1"><Eyebrow>Baku</Eyebrow><Eyebrow>gp</Eyebrow></div>
            </Link>
            <div className="mx-[.75rem] h-px bg-current" />
            <div className="relative h-[6.9rem]" onPointerEnter={() => { helmetHover.current = true; }} onPointerLeave={() => { helmetHover.current = false; }}>
              <RiveCanvas file="reef" artboard="helmet-reef" stateMachine="helmet-reef_play" className="absolute left-1/2 -translate-x-1/2 top-[0.95rem] w-[5.4rem] h-[2.95rem]" />
              <div className="absolute inset-x-[0.6rem] bottom-[0.95rem] flex justify-center"><Eyebrow className="text-center">mclaren f1<br />since 2019</Eyebrow></div>
            </div>
          </div>

          {/* touch devices: lock scrolling to paint the helmet with a finger */}
          <HeroTouchLock ref={lock} ready={ready} />

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
