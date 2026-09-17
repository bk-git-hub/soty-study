import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from '../../lib/gsap';
import { useNavTheme } from '../../lib/navTheme';
import { cdn } from '../../lib/assets';
import Button from '../../components/Button';
import RiveCanvas from '../../components/RiveCanvas';
import Eyebrow from '../../components/Eyebrow';
import Contours from '../shared/Contours';

/**
 * "ON TRACK / OFF TRACK" split. Sticky screen: two big titles (serif ON/OFF + Mona TRACK),
 * a helmet photo pinned bottom-left and a profile photo pinned bottom-right. As you scroll,
 * both photos slide in from the sides and grow, then a full-bleed "helmet lifted" image takes over.
 */
export default function Otot() {
  const ref = useRef(null);
  useNavTheme(ref, 'dark');
  useEffect(() => {
    const el = ref.current;
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: true } });
    tl.fromTo(el.querySelector('.otot-l'), { xPercent: -60, yPercent: 20 }, { xPercent: 0, yPercent: 0, ease: 'none' }, 0)
      .fromTo(el.querySelector('.otot-r'), { xPercent: 60, yPercent: 20 }, { xPercent: 0, yPercent: 0, ease: 'none' }, 0)
      .fromTo(el.querySelector('.otot-end'), { yPercent: 10 }, { yPercent: -10, ease: 'none' }, 0.5);
    return () => { tl.scrollTrigger?.kill(); tl.kill(); };
  }, []);

  const Col = ({ side, serif, text, rest, to, rotate }) => (
    <div className={`flex flex-col gap-[var(--gap)] ${side === 'r' ? 'items-start' : 'items-start'}`}>
      <div className="flex flex-col relative">
        <h2 className="t-impact-reg-serif">{serif}</h2>
        <h2 className="t-impact-reg">TRACK</h2>
        {side === 'l' && (
          <div className="absolute -left-[1rem] -top-[1rem] w-[13rem] h-[10rem] pointer-events-none">
            <RiveCanvas file="phrases" artboard="phrase_on" stateMachine="phrase_on" className="w-full h-full" />
          </div>
        )}
      </div>
      <p className="t-body-reg max-w-[16rem] strong-lime"><strong className="text-dark-green-tint-1">{text}</strong>{rest}</p>
      <Button to={to} variant="icon" rotate={rotate} />
    </div>
  );

  return (
    <div ref={ref} className="relative bg-white text-dark-green-tint-1" style={{ height: 'calc(var(--vh) * 300)' }}>
      <div className="sticky top-0 h-[calc(var(--vh)*100)] overflow-clip">
        <Contours className="absolute inset-0 text-[#dcdcd3]" />
        <section className="relative h-full flex items-center justify-center z-10">
          <div className="flex gap-[calc(var(--gap)*3)]">
            <Col side="l" serif="ON" text="results" rest=", career stats and photos from trackside." to="/on-track" rotate />
            <Col side="r" serif="OFF" text="Campaigns" rest=", shoots and other such promotional materials for fans" to="/off-track" />
          </div>
        </section>
        <div className="absolute inset-0 z-0">
          <div className="otot-l absolute left-0 bottom-0 flex items-start" style={{ width: 'calc(var(--vh) * 34.75)', height: 'calc(var(--vh) * 82.67)', maxWidth: '27.625rem' }}>
            <img src={cdn('ln4-hp-lando-helmet.webp')} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="otot-r absolute right-0 bottom-0 flex items-start" style={{ width: 'calc(var(--vh) * 34.75)', height: 'calc(var(--vh) * 82.67)', maxWidth: '27.625rem' }}>
            <img src={cdn('ln4-hp-lando-head.webp')} alt="" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
      {/* end image */}
      <div className="relative flex justify-center items-start overflow-clip" style={{ minHeight: 'calc(var(--vh) * 100)' }}>
        <img src={cdn('ln-home-helm-large.webp')} alt="" className="otot-end absolute w-full object-cover" style={{ height: 'calc(var(--vh) * 120)' }} />
      </div>
    </div>
  );
}
