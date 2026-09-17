import { useEffect, useRef } from 'react';
import { gsap } from '../lib/gsap';
import { useNavTheme } from '../lib/navTheme';
import { cdn } from '../lib/assets';
import { OFF_TRACK as D } from '../data/offTrack';
import { PARTNER_LOGOS } from '../data/site';
import RiveCanvas from '../components/RiveCanvas';
import Eyebrow from '../components/Eyebrow';
import Marquee from '../components/Marquee';
import Footer from '../components/Footer';
import Impact from '../sections/home/Impact';
import HorizontalTrack from '../sections/home/HorizontalTrack';
import SocialsCallout from '../sections/home/SocialsCallout';
import Contours from '../sections/shared/Contours';

/**
 * Off Track hero: cream page, "OFF TRACK" title (OFF in Mona with a gap, TRACK cut by the right
 * edge), quote-style meta (name, age, icon), the long paragraph with a serif lime-off phrase,
 * a hero photo on the right that "flips" down into the impact section, and a horizontal media strip.
 */
function Hero() {
  const ref = useRef(null);
  useNavTheme(ref, 'dark');
  useEffect(() => {
    const strip = ref.current.querySelector('.strip');
    const t = gsap.fromTo(strip, { x: '0vw' }, { x: '-40vw', ease: 'none', scrollTrigger: { trigger: strip, start: 'top bottom', end: 'bottom top', scrub: true } });
    return () => t.kill();
  }, []);
  return (
    <div ref={ref} className="relative bg-white text-dark-green-tint-1 overflow-clip">
      <Contours className="absolute inset-0 text-[#dcdcd3]" />
      <section className="container relative pt-[6rem]" style={{ minHeight: 'calc(var(--vh) * 100)' }}>
        <h1 className="t-hero-heading leading-none whitespace-nowrap"><span className="mr-[6rem]">OFF</span>TRACK</h1>
        <div className="grid-main -mt-[1rem]">
          <div className="t-quote">Lando Norris</div>
          <div className="t-quote">26 y.o</div>
          <div className="w-[3rem] h-[3rem]"><RiveCanvas file="reef" artboard="off-icons" stateMachine="off-icons" inputs={{ 'color_green-off-white-2': true }} className="w-full h-full" /></div>
        </div>
        <div className="grid-main mt-[6rem]">
          <div className="col-span-2 flex flex-col gap-[var(--gap)]">
            <Eyebrow className="text-grey-on-track">bringing the fight</Eyebrow>
            <h2 className="t-body-lg">{D.heroPara[0]}<span className="t-body-lg-serif text-green-off-white-2">{D.heroPara[1]}</span>{D.heroPara[2]}</h2>
            <div className="w-[10rem] h-[5rem]"><RiveCanvas file="signature" artboard="signature" stateMachine="signature_play" inputs={{ 'color_dark-green-tint-2': true }} className="w-full h-full" /></div>
          </div>
          <div className="col-start-3 col-span-2 relative">
            <img src={cdn(D.heroImage)} alt="" className="absolute -top-[26rem] right-[-8rem] w-[38rem] h-[24rem] object-cover" />
          </div>
        </div>
        <div className="grid-main mt-[4rem]">
          <div className="col-start-2 col-span-1"><p className="t-body-sm max-w-[16rem]">{D.subPara}</p></div>
        </div>
        <div className="relative w-screen -left-[var(--padding-container)] mt-[4rem] max-[991px]:hidden">
          <Marquee speed={40} direction="right" gap="7rem">
            {PARTNER_LOGOS.slice(0, 6).map((l) => <img key={l} src={cdn(l)} alt="" className="h-[5.125rem] w-auto" />)}
          </Marquee>
        </div>
      </section>
      <div className="strip flex gap-[var(--gap)] pl-[var(--gap)] pb-[8rem] will-change-transform">
        {D.scrollMedia.map((m) => <img key={m} src={cdn(m)} alt="" className="w-[18rem] h-[22rem] object-cover rounded-[.75rem] flex-none" />)}
      </div>
    </div>
  );
}

export default function OffTrack() {
  return (
    <div className="bg-white text-dark-green-tint-1">
      <Hero />
      <div className="bg-white text-dark-green-tint-1 [&_.t-impact-lg]:text-dark-green-tint-1 [&_.text-green-off-white-1]:text-dark-green-tint-1">
        <Impact parts={D.impact} />
      </div>
      <HorizontalTrack items={D.horizontal} from="#f4f4ed" to="#f4f4ed" captionFrom="#535450" captionTo="#535450" />
      <SocialsCallout cards={D.socialCards} />
      <Footer theme="white" />
    </div>
  );
}
