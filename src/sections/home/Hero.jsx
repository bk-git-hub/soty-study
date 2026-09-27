import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ScrollTrigger } from '../../lib/gsap';
import { cdn } from '../../lib/assets';
import HeroHead from '../../gl/HeroHead';
import TrackMini from '../../gl/TrackMini';
import { SIGN_FROM, SIGN_TO, TARGET_REM, power1InOut } from '../../gl/scrollOut';
import HeroTouchLock from '../../components/HeroTouchLock';
import SignatureStroke from '../../components/SignatureStroke';
import Marquee from '../../components/Marquee';
import RiveCanvas from '../../components/RiveCanvas';
import Eyebrow from '../../components/Eyebrow';
import { ID } from '../../data/identity';

/**
 * Home hero. Sticky for one screen of scrolling, during which the light page (a WebGL viewport, see
 * gl/scrollOut.js) shrinks to a box in the middle and becomes the photo of "Message from Lando".
 * Layers, bottom to top:
 *   0  the dark page with the same flowing contour lines (PageWaves, the page-wide canvas behind everything)
 *   1  two lines of huge text drifting in opposite directions, by time only (the original: ~85 px/s at
 *      1440 wide, the same at rest and while scrolling); they pass *behind* the rectangle
 *   2  the hero canvas: transparent outside the rectangle
 *   3  the signature, written by the scroll from half way until the box is already scrolling off
 *      (its own trigger: it runs past the sticky stretch); fixed size, not scaled with the rectangle;
 *      and the section label above the box
 *   4  the next-race card, the scroll lock, the phone title
 * Everything scroll-driven goes through refs and handles: a React state here re-rendered the canvases
 * at the boundary and cost one frame of 0.5 to 1.3 s (2026-09-20).
 */
// 85 px/s at 900 px of viewport height. The lines scale with the height (see index.css), so the speed is
// taken in the same unit; on narrow screens, where the letters are 0.56x the size, so is the speed (the
// narrow-screen speed itself was not measured).
const MARQUEE_VH_PER_S = 9.44, NARROW_TEXT_SCALE = 0.56;
const CARD_GONE_AT = 0.1;      // estimate: the card is there at 0 px and gone by 120 px of 900
// The section label fades in with the scroll (stills taken at rest show in-between values, so it is not a
// timed tween): brightness of its lime mark on the original at 706 / 732 / 754 / 779 / 806 / 855 px of 900
// = 5 / 50 / 69 / 85 / 95 / 100 %. power2.out over p 0.78..0.95 predicts 48 / 71 / 88 / 97 % for the middle
// four. (First guess: linear over 0.7..0.8, read off a contact sheet. Wrong on both counts.)
const LABEL_FROM = 0.78, LABEL_TO = 0.95;
const power2Out = (u) => 1 - (1 - Math.min(1, Math.max(0, u))) ** 3;
// between the label's text and the box. First guess 2.5 rem put the lime mark's top at 209 px (1440x900);
// on the original it sits at 151-152 px: 58 px = 4.35 rem higher (6.85 rem left it 2 px high, hence 6.7).
const LABEL_GAP_REM = 6.7;

export default function Hero({ ready, onHeroReady }) {
  const ref = useRef(null);
  const progress = useRef(0);
  const lock = useRef(null);
  const sign = useRef(null);
  const card = useRef(null), title = useRef(null), label = useRef(null);
  // pointer on the card's helmet row: the whole reveal mask goes on (a ref, so nothing re-renders)
  const helmetHover = useRef(false);
  const marqueeSpeed = useMemo(() => (MARQUEE_VH_PER_S * window.innerHeight / 100) * (window.innerWidth <= 767 ? NARROW_TEXT_SCALE : 1), []);

  useEffect(() => {
    const last = { card: -1, label: -1, theme: '' };
    const fade = (el, key, v) => {
      v = Math.min(1, Math.max(0, v));
      if (!el || Math.abs(v - last[key]) < 0.004) return;
      last[key] = v; el.style.opacity = v; el.style.pointerEvents = v > 0.5 ? '' : 'none';
    };
    const apply = (p) => {
      progress.current = p;
      lock.current?.setOnHero(p < 0.3);
      fade(card.current, 'card', 1 - p / CARD_GONE_AT);
      if (title.current) title.current.style.opacity = Math.min(1, Math.max(0, 1 - p / CARD_GONE_AT));
      fade(label.current, 'label', power2Out((p - LABEL_FROM) / (LABEL_TO - LABEL_FROM)));
      // nav: dark while the light page is still under it, light once the rectangle's top has passed below
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const top = power1InOut(p) * (window.innerHeight - TARGET_REM[1] * rem) / 2;
      const theme = top > 48 ? 'light' : 'dark';
      if (theme !== last.theme) { last.theme = theme; document.documentElement.dataset.navTheme = theme; }
    };
    const st = ScrollTrigger.create({
      trigger: ref.current, start: 'top top', end: '+=100%', scrub: true,
      onUpdate: (self) => apply(self.progress),
      onRefresh: (self) => apply(self.progress),
    });
    apply(0);
    // the signature's stretch, in scroll px from the hero's top (numbers, so it can end after the sticky part)
    const top = () => ref.current.getBoundingClientRect().top + window.scrollY;
    const signSt = ScrollTrigger.create({
      start: () => top() + window.innerHeight * SIGN_FROM, end: () => top() + window.innerHeight * SIGN_TO, scrub: true, invalidateOnRefresh: true,
      onUpdate: (self) => sign.current?.set(self.progress), onRefresh: (self) => sign.current?.set(self.progress),
    });
    return () => { st.kill(); signSt.kill(); };
  }, []);

  return (
    <div ref={ref} className="relative text-dark-green" style={{ height: 'calc(var(--vh) * 200)' }}>
      <div className="sticky top-0 h-[calc(var(--vh)*100)] overflow-clip">
        <section className="relative h-full">
          {/* 1: the two lines, behind the rectangle */}
          <div className="absolute inset-0 select-none pointer-events-none" aria-hidden>
            <Marquee className="hero-line hero-line-serif" speed={marqueeSpeed} direction="left">
              <span className="t-impact-lg-serif whitespace-nowrap text-lime-off pr-[0.27em]">WE DID IT AT HOME</span>
            </Marquee>
            <Marquee className="hero-line hero-line-sans" speed={marqueeSpeed} direction="right">
              <span className="t-impact-lg whitespace-nowrap text-[#dde1d2] pr-[0.27em]">A home race weekend I will never forget</span>
            </Marquee>
          </div>

          {/* 2: the hero canvas (contour lines, photo, helmet), drawn into the shrinking rectangle */}
          <div className="absolute inset-0 z-10">
            <HeroHead onReady={onHeroReady} progressRef={progress} helmetHover={helmetHover} />
          </div>
          <h1 className="sr-only">{ID.full}</h1>
          <h2 className="sr-only">{`2025 ${ID.team} ${ID.series} Driver`}</h2>

          {/* 3: signature and section label */}
          <SignatureStroke ref={sign} mode="scroll" className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 max-w-none pointer-events-none hero-sign" />
          <div ref={label} className="absolute inset-x-0 z-20 flex flex-col items-center gap-[var(--gap)] text-center text-white opacity-0 pointer-events-none"
               style={{ bottom: `calc(50% + ${TARGET_REM[1] / 2}rem + ${LABEL_GAP_REM}rem)` }}>
            <img src={cdn('ln4-LN-logo-svg.svg')} alt="" className="w-[2.4rem] h-[2.4rem]" />
            <Eyebrow>{`Message from ${ID.first.toLowerCase()}`}</Eyebrow>
          </div>

          {/* next race card */}
          <div ref={card} className="absolute left-[var(--gap)] bottom-[var(--gap)] z-20 w-[7.4375rem] h-[15.25rem] text-dark-green-tint-2 max-[479px]:hidden"
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
              <div className="absolute inset-x-[0.6rem] bottom-[0.95rem] flex justify-center"><Eyebrow className="text-center">{`${ID.team} ${ID.series}`.toLowerCase()}<br />since 2019</Eyebrow></div>
            </div>
          </div>

          {/* touch devices: lock scrolling to paint the helmet with a finger */}
          <HeroTouchLock ref={lock} ready={ready} />

          {/* mobile title */}
          <div ref={title} className="hidden max-[991px]:flex absolute inset-x-0 top-[7rem] z-20 flex-col items-center gap-3 pointer-events-none">
            <img src={cdn('ln4-lando-norris-text-mobile.svg')} alt={ID.full} className="w-[60vw]" />
            <Eyebrow>{`${ID.team} ${ID.series} since 2019`.toLowerCase()}</Eyebrow>
          </div>
        </section>
      </div>
    </div>
  );
}
