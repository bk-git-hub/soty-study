import { useEffect, useRef, useState } from 'react';
import { gsap, ScrollTrigger, SplitText } from '../../lib/gsap';
import { useNavTheme } from '../../lib/navTheme';
import { cdn } from '../../lib/assets';
import Button from '../../components/Button';
import RiveCanvas from '../../components/RiveCanvas';
import { setWaveStop, removeWaveStop, WAVES_WHITE } from '../../lib/waves';
import { highlightReveal } from '../../lib/highlight';

/**
 * "ON TRACK / OFF TRACK". Measured on the original's DOM and stills at 1440x900 (2026-09-23):
 *  - a container two screens tall; a sticky screen inside it, and after that, in flow, the end photo
 *    (one screen). While the sticky screen is pinned the end photo scrolls up over it; at the container's
 *    end both leave together. (Day 0 had a three-screen container: the end photo passed and the titles
 *    came back for a whole screen.)
 *  - two columns 21.25 rem wide, 3.75 rem apart (the original's column box is 283.3 px, ON at x 411.5 pinned), centred both ways: serif ON / OFF over sans TRACK
 *    (line-height .85 here, .81 for the serif), the description 2.5 rem below, flush with the column's
 *    inner edge (right under ON, left under OFF), the square button
 *    1.2 rem below that. The ON column is right-aligned throughout (ON's ink at the right edge, the
 *    description's lines and the button too), the OFF column left-aligned. One word of each description
 *    is a <strong> (results, Campaigns) that looks like the rest: the original keeps the body's Mona Sans
 *    at "wght" 500 on it (a variation setting beats font-weight 700 on a variable font), so the strong is
 *    semantic only. Ours had the site-wide serif strong there: "results" came out 2.7 px narrower in Brier
 *    and the first line took one more word ("... career stats and" against the original's "... career stats").
 *  - titles and descriptions come in with the highlight sweep in dark-green-tint-1 (59,60,56 sampled on
 *    the frames; the original marks them data-anim-high "right, dark-green-tint..."), each element on its own
 *    trigger at 90 % of the viewport, and the description line by line with the sweep's 0.15 s stagger.
 *    Block widths per frame on the virtual-clock recording (scripts/otot-blocks): ON starts at ~115 ms,
 *    TRACK at ~185, the first text line at ~315, the second at ~450; the first three gaps are exactly the
 *    79 / 113 px between the elements at the scroll speed of those frames (1.2 / 0.85 px per ms), the
 *    last is the line stagger. (A middle version had one trigger per column: TRACK came 85 ms late.)
 *    The buttons have no sweep: they are there as they scroll in (a first reading of a still had them
 *    missing; a closer crop showed them).
 *  - the lime "ON" scribble (phrases / phrase_on) 16 x 12.15 rem, 6.3 rem in from the column's left, top
 *    on the title's top; it plays when its box's top passes ~45 % of the viewport (absent on the still
 *    with it at 52 %, drawn on the next with it at 41 %).
 *  - the columns come in from 5 rem apart from their places (ON from the left, OFF from the right) and
 *    close in linearly over the first 1.2 screens after the container's top enters the viewport, i.e. to
 *    0.2 screens into the pin (the original's ON column: x 344.8 -> 411.5 in even 3.1 px steps per 50 px of
 *    scroll, from scroll 5070 to 6150 with the pin at 5970).
 *  - photos: helmet at the left edge, profile at the right, both from 6.3 rem below the top to the
 *    bottom, 25.75 / 27.7 rem wide; they slide in from 20 rem outside with power2.out over the whole
 *    range from the container's top entering the viewport to the pin's end (267 * (1 - u)^3 px, nine
 *    positions within 0.5 px).
 *  - the end photo is 120 vh tall in a 100 vh clip; as its box travels from the bottom of the screen to
 *    the top it scales 1 -> 1.05 about its centre and moves up 10 vh, linearly.
 */
// A column. Defined outside Otot on purpose: as an inner function it was a new component type on every
// render, so the first state change (the scribble) remounted both columns and the reveal wrappers that
// highlightReveal had put around the titles were gone with the old nodes (2026-09-23).
function Col({ side, serif, text, to, rotate, scribble }) {
  return (
    <div className={`otot-col flex flex-col w-[21.25rem] ${side === 'l' ? 'items-end text-right' : 'items-start'}`}>
      <div className="relative w-full">
        <h2 className="otot-reveal t-impact-reg-serif">{serif}</h2>
        <h2 className="otot-reveal t-impact-reg" style={{ lineHeight: 0.85 }}>TRACK</h2>
        {side === 'l' && (
          <div className="otot-scribble absolute left-[6.3rem] top-0 w-[16rem] h-[12.15rem] pointer-events-none">
            <RiveCanvas file="phrases" artboard="phrase_on" stateMachine="phrase_on" play={scribble} className="w-full h-full" />
          </div>
        )}
      </div>
      {/* 21 rem at the column's inner edge (the original: 280 px under the 284 px title, flush right under ON,
          flush left under OFF); at the full 284 px the first line took one more word and its sweep block was
          268 px wide, not 235. strong-plain: the site-wide serif strong is an unlayered rule, a Tailwind
          utility on the paragraph cannot beat it */}
      <p className="otot-reveal strong-plain t-body-reg w-[21rem] mt-[2.5rem]">{text}</p>
      {/* no sweep on the button: on the original it is simply there as it scrolls in (visible at the
          bottom edge at 94 % while the text above it is still being covered) */}
      <Button to={to} variant="icon" rotate={rotate} className="mt-[1.2rem]" />
    </div>
  );
}

export default function Otot() {
  const ref = useRef(null);
  const [scribble, setScribble] = useState(false);
  useNavTheme(ref, 'dark');
  useEffect(() => {
    const el = ref.current;
    const slide = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom bottom', scrub: true } });
    slide.fromTo(el.querySelector('.otot-l img'), { x: '-20rem' }, { x: '0rem', ease: 'power2.out', duration: 1 }, 0)
      .fromTo(el.querySelector('.otot-r img'), { x: '20rem' }, { x: '0rem', ease: 'power2.out', duration: 1 }, 0);
    // the columns close in over the first 1.2 of the range's 2 screens: 0.6 of the scrubbed timeline
    const [onCol, offCol] = el.querySelectorAll('.otot-col');
    slide.fromTo(onCol, { x: '-5rem' }, { x: '0rem', ease: 'none', duration: 0.6 }, 0)
      .fromTo(offCol, { x: '5rem' }, { x: '0rem', ease: 'none', duration: 0.6 }, 0);
    const endW = el.querySelector('.otot-end-w');
    const end = gsap.fromTo(endW.querySelector('img'), { scale: 1, y: 0 }, { scale: 1.05, y: () => -window.innerHeight * 0.1, ease: 'none', scrollTrigger: { trigger: endW, start: 'top bottom', end: 'top top', scrub: true, invalidateOnRefresh: true } });
    const st = ScrollTrigger.create({ trigger: el.querySelector('.otot-scribble'), start: 'top 45%', once: true, onEnter: () => setScribble(true) });
    // each title and description on its own trigger; the description split into lines (fonts first, as
    // SplitText measures them)
    const reveals = []; let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled) return;
      el.querySelectorAll('.otot-reveal').forEach((node) => {
        const split = node.tagName === 'P' ? new SplitText(node, { type: 'lines' }) : null;
        const tl = highlightReveal(split ? split.lines : [node], { color: 'var(--color-dark-green-tint-1)' });
        const t = ScrollTrigger.create({ trigger: node, start: 'top 90%', once: true, onEnter: () => tl.play() });
        reveals.push({ tl, t, split });
      });
    });
    return () => { cancelled = true; slide.scrollTrigger?.kill(); slide.kill(); end.scrollTrigger?.kill(); end.kill(); st.kill(); reveals.forEach(({ tl, t, split }) => { t.kill(); tl.revert(); split?.revert(); }); };
  }, []);

  // the page-wide field behind this section: white, 1 px lines, frozen (see src/lib/waves.js)
  useEffect(() => { setWaveStop('otot', { el: ref.current, pair: WAVES_WHITE }); return () => removeWaveStop('otot'); }, []);


  return (
    <div ref={ref} className="relative text-dark-green" style={{ height: 'calc(var(--vh) * 200)' }}>
      <div className="sticky top-0 h-[calc(var(--vh)*100)] overflow-clip">
        {/* the two photos, behind the columns */}
        <div className="otot-l absolute left-0 top-[6.3rem] bottom-0 w-[25.75rem]">
          <img src={cdn('ln4-hp-lando-helmet.webp')} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="otot-r absolute right-0 top-[6.3rem] bottom-0 w-[27.7rem]">
          <img src={cdn('ln4-hp-lando-head.webp')} alt="" className="w-full h-full object-cover" />
        </div>
        <section className="absolute inset-0 flex items-center justify-center">
          <div className="flex gap-[3.75rem]">
            <Col side="l" serif="ON" text={<>Most recent <strong>results</strong>, career stats and photos from trackside.</>} to="/on-track" rotate scribble={scribble} />
            <Col side="r" serif="OFF" text={<><strong>Campaigns</strong>, shoots and other such promotional materials for fans</>} to="/off-track" />
          </div>
        </section>
      </div>
      {/* the end photo, scrolling up over the pinned screen */}
      <div className="otot-end-w relative h-[calc(var(--vh)*100)] overflow-clip">
        <img src={cdn('ln-home-helm-large.webp')} alt="" className="w-full object-cover origin-center" style={{ height: 'calc(var(--vh) * 120)' }} />
      </div>
    </div>
  );
}
