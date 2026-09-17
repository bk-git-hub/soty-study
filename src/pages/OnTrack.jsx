import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from '../lib/gsap';
import { useNavTheme } from '../lib/navTheme';
import { cdn } from '../lib/assets';
import { ON_TRACK as D } from '../data/onTrack';
import HelmetSpin from '../gl/HelmetSpin';
import RiveCanvas from '../components/RiveCanvas';
import Eyebrow from '../components/Eyebrow';
import Button from '../components/Button';
import ResultsTable from '../components/ResultsTable';
import Countdown from '../components/Countdown';
import CalendarTrack from '../components/CalendarTrack';
import Footer from '../components/Footer';
import Impact from '../sections/home/Impact';
import HorizontalTrack from '../sections/home/HorizontalTrack';
import { HelmetGrid } from '../sections/home/Helmets';
import SocialsCallout from '../sections/home/SocialsCallout';
import Callout from '../sections/home/Callout';
import Contours from '../sections/shared/Contours';

function Hero() {
  const ref = useRef(null);
  const spin = useRef(0);
  useNavTheme(ref, 'light');
  useEffect(() => {
    const st = ScrollTrigger.create({ trigger: ref.current, start: 'top top', end: 'bottom top', scrub: true, onUpdate: (s) => { spin.current = s.progress; } });
    return () => st.kill();
  }, []);
  return (
    <section ref={ref} className="relative bg-black text-white overflow-clip" style={{ minHeight: 'calc(var(--vh) * 100)' }}>
      <Contours className="absolute inset-0 text-[#2a2a28]" />
      {/* helmet, left, overlapping the title */}
      <div className="absolute left-[-10vw] top-[8vh] w-[50vw] h-[80vh] z-[5] pointer-events-none">
        <HelmetSpin className="!w-full !h-full" scrollRef={spin} />
      </div>
      <div className="container relative pt-[6rem]">
        <h1 className="sr-only">On Track</h1>
        <div className="relative flex justify-end items-start">
          <div className="absolute left-[13rem] top-[1rem] w-[16rem] h-[12rem] text-lime"><RiveCanvas file="phrases" artboard="phrase_on" stateMachine="phrase_on" className="w-full h-full" /></div>
          <div className="t-hero-heading leading-none pr-[2rem]">TRACK</div>
        </div>
        <div className="grid-main mt-[-1rem]">
          <div className="col-start-2 col-span-3 flex justify-between text-grey-on-track">
            <div className="t-stat-reg max-[991px]:hidden">last lap lando</div>
            <div className="t-stat-reg">26 y.o</div>
            <div className="flex items-center gap-3 t-stat-reg">Bristol, UK <img src={cdn('ln4-flag-UK.svg')} alt="" className="w-[1.6rem] h-[1.1rem] object-cover rounded-[2px]" /></div>
          </div>
        </div>
        <div className="grid-main mt-[6rem]">
          <div className="col-start-3 col-span-2 flex flex-col gap-[var(--gap)]">
            <Eyebrow className="text-grey-on-track">bringing the fight</Eyebrow>
            <h2 className="t-body-lg">{D.heroPara[0]}<span className="t-body-lg-serif text-lime">{D.heroPara[1]}</span>{D.heroPara[2]}</h2>
            {/* stats UI boxes */}
            <div className="flex gap-[var(--gap)] mt-[2rem] text-green-off-white-1">
              <div className="relative w-[7.4375rem] h-[15.25rem] max-[991px]:hidden">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 119 244" fill="none" aria-hidden><path d="M118.5 6v232a5.5 5.5 0 0 1-5.5 5.5H6A5.5 5.5 0 0 1 .5 238V25A5.5 5.5 0 0 1 6 19.5h46.346c4.695 0 9.167-2 12.297-5.498l7.46-8.337A15.5 15.5 0 0 1 83.653.5H113a5.5 5.5 0 0 1 5.5 5.5Z" stroke="currentColor" /></svg>
                <div className="pt-[1.7rem] px-[.6rem]"><Eyebrow>previous</Eyebrow></div>
                <div className="flex flex-col items-center justify-center gap-2 h-[6.9rem]">
                  <RiveCanvas file="circuits" artboard="circuits" stateMachine="circuits" className="w-[4.5rem] h-[3.8rem]" />
                  <div className="flex gap-1"><Eyebrow>{D.previous.name}</Eyebrow><Eyebrow>{D.previous.gp}</Eyebrow></div>
                </div>
                <div className="mx-[.6rem] h-px bg-current opacity-40" />
                <div className="flex items-center justify-center h-[6.9rem] t-stat-reg">{D.previous.result}</div>
              </div>
              <div className="relative flex-1 rounded-[1rem] border border-white/20 p-[var(--gap)] flex flex-col justify-between min-h-[15.25rem]">
                <div className="flex justify-between items-start">
                  <Eyebrow>Next</Eyebrow>
                  <div className="flex items-center gap-3"><span className="t-stat-reg">Rnd.</span><span className="t-stat-reg">{D.next.round}</span></div>
                </div>
                <div className="flex items-center gap-3"><img src={cdn(D.next.flag)} alt="" className="w-[2rem] h-[1.4rem] object-cover rounded-[2px]" /><Eyebrow>{D.next.name}</Eyebrow></div>
                <div className="flex items-center gap-3">
                  <RiveCanvas file="reef" artboard="helmet-reef" stateMachine="helmet-reef_play" inputs={{ 'color_grey-on-track': true }} className="w-[4rem] h-[2rem]" />
                  <Eyebrow>mclaren f1 since 2019</Eyebrow>
                </div>
              </div>
              <div className="relative w-[12rem] rounded-[1rem] border border-white/20 p-[var(--gap)] flex flex-col justify-between">
                <RiveCanvas file="circuits" artboard="circuits" stateMachine="circuits" className="w-[5rem] h-[4rem]" />
                <div className="flex flex-col gap-1"><Eyebrow>{D.next.country}</Eyebrow><div className="flex gap-1"><Eyebrow>{D.next.dates}</Eyebrow><Eyebrow>{D.next.month}</Eyebrow></div></div>
                <RiveCanvas file="signature" artboard="signature" stateMachine="signature_play" inputs={{ 'color_grey-on-track': true }} className="w-[6rem] h-[3rem] self-end" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Podiums() {
  const ref = useRef(null);
  useEffect(() => {
    const strip = ref.current.querySelector('.strip');
    const t = gsap.fromTo(strip, { x: '10vw' }, { x: '-30vw', ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: true } });
    return () => t.kill();
  }, []);
  return (
    <section ref={ref} className="container relative overflow-clip">
      <div className="h-[12rem]" />
      <div className="relative flex items-end gap-[var(--gap)]">
        <div className="t-number-gigantic text-white leading-[.85]" style={{ fontSize: '40rem' }}>{D.podiums}</div>
        <div className="t-number text-white pb-[3rem]" style={{ fontSize: '8rem' }}>podiums</div>
      </div>
      <div className="strip flex gap-[var(--gap)] mt-[2rem] will-change-transform">
        {D.podiumImages.map((p) => <img key={p} src={cdn(p)} alt="" className="w-[14rem] h-[18rem] object-cover rounded-[.75rem] flex-none" />)}
      </div>
      <div className="h-[8rem]" />
    </section>
  );
}

function Career() {
  return (
    <section className="container">
      <div className="grid-main">
        <div className="col-span-2 flex flex-col gap-[var(--gap)]">
          <h2 className="t-title-lg max-w-[25rem]">f1 career<br /><span className="t-title-lg-serif text-grey-on-track">since 2019</span></h2>
          <img src={cdn(D.carImage)} alt="" className="w-full aspect-[4/3] object-cover rounded-[.75rem]" />
        </div>
        <div className="col-span-2 grid grid-cols-2 gap-[calc(var(--gap)*2)]">
          {D.stats.map(([label, num, dec]) => (
            <div key={label} className="flex flex-col gap-2">
              <h3 className="t-descriptor">{label}</h3>
              <div className="flex items-start"><span className="t-number">{num}</span>{dec && <span className="t-stat-large text-grey-on-track pt-[1rem]">{dec}</span>}</div>
            </div>
          ))}
          <div className="col-span-2 flex flex-col gap-3">
            <h3 className="t-descriptor">F1 Seasons</h3>
            <div className="grid grid-cols-3 text-grey-on-track"><Eyebrow>Year</Eyebrow><Eyebrow>Finish</Eyebrow><Eyebrow>Podiums</Eyebrow></div>
            {D.seasons.map(([y, pos, suf, pod]) => (
              <div key={y} className="grid grid-cols-3 border-t border-white/15 py-2 items-baseline">
                <h3 className="t-stat-reg">{y}</h3>
                <div className="flex items-start gap-1"><span className="t-stat-reg">{pos}</span><span className="t-descriptor">{suf}</span></div>
                <div className="t-stat-reg">{pod}</div>
              </div>
            ))}
            <div className="mt-4"><Button to="/calendar">full schedule &amp; results</Button></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Highlights() {
  return (
    <section className="container">
      <div className="h-[14rem]" />
      <div className="grid-main">
        <div className="col-span-2"><h2 className="t-title-lg flex flex-col"><span>f1 result</span><span className="t-title-lg-serif text-grey-on-track">highlights</span></h2></div>
        <div className="col-span-2 text-grey-on-track"><p className="t-body-reg max-w-[26rem]">{D.highlightsIntro}</p></div>
      </div>
      <div className="h-[8.75rem]" />
      <ResultsTable rows={D.highlights} />
    </section>
  );
}

function PreF1() {
  return (
    <section className="container relative">
      <div className="h-[12rem]" />
      <div className="grid-main items-start">
        <div className="col-span-2 flex flex-col gap-[var(--gap)]">
          <h2 className="t-title-lg flex flex-col"><span>{D.preF1.title[0]}</span><span className="t-title-lg-serif text-grey-on-track">{D.preF1.title[1]}</span></h2>
          <p className="t-body-reg text-grey-on-track max-w-[26rem]">{D.preF1.text}</p>
          <div className="flex gap-[var(--gap)] mt-[2rem]">
            {D.preF1.images.map((img) => <img key={img} src={cdn(img)} alt="" className="w-[16rem] h-[20rem] object-cover rounded-[.75rem]" />)}
          </div>
        </div>
        <div className="col-span-2 grid grid-cols-2 gap-[calc(var(--gap)*2)]">
          {D.preF1.titles.map(([t, y]) => (
            <div key={t + y} className="flex flex-col gap-3 border-t border-white/15 pt-4">
              <RiveCanvas file="reef" artboard="reef" stateMachine="reef_play" inputs={{ color_lime: true }} className="w-[3rem] h-[2rem]" />
              <div className="t-descriptor">{t}</div>
              <div className="t-stat-reg text-grey-on-track">{y}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="h-[8rem]" />
    </section>
  );
}

export default function OnTrack() {
  return (
    <div className="bg-black text-white">
      <Hero />
      <Impact parts={D.impact} eyebrow="mclaren f1 since 2019" />
      <Podiums />
      <Career />
      <Highlights />
      <div className="mt-[8rem]"><HorizontalTrack items={D.horizontal} from="#111112" to="#f4f4ed" captionFrom="#b4b8a5" captionTo="#535450" /></div>
      <PreF1 />
      <Countdown />
      <section className="container pb-[10rem]"><CalendarTrack start={16} /></section>
      <div className="relative flex justify-center items-start overflow-clip" style={{ minHeight: 'calc(var(--vh) * 100)' }}>
        <img src={cdn('ln4-otot-home-end-img.webp')} alt="" className="absolute w-full object-cover" style={{ height: 'calc(var(--vh) * 120)' }} />
      </div>
      <section className="container pt-[calc(var(--gap)*2)] pb-[var(--gap)]">
        <div className="grid-main">
          <div className="col-span-2 flex flex-col"><h2 className="t-title-lg">Helmets</h2><h2 className="t-title-lg"><span className="t-title-lg-serif text-lime-off">Hall of Fame</span></h2></div>
          <div className="col-span-2 text-grey-on-track"><p className="t-body-reg max-w-[26rem]">From his iconic blobs to innovative one-off designs, Lando has always been passionate about designing innovative and memorable helmets.</p></div>
        </div>
        <div className="h-[8.75rem]" />
        <HelmetGrid />
      </section>
      <SocialsCallout cards={D.socialCards} theme="dark" />
      <Callout text="Explore the exclusive collection of 1:2 and 1:5 scale replicas" cta="buy minis" to="https://store.landonorris.com" />
      <Footer theme="black" />
    </div>
  );
}
