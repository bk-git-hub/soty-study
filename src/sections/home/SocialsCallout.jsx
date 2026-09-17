import { useEffect, useRef } from 'react';
import { gsap } from '../../lib/gsap';
import { useNavTheme } from '../../lib/navTheme';
import { cdn } from '../../lib/assets';
import { SOCIALS } from '../../data/site';
import { SOCIAL_CARDS } from '../../data/home';
import RiveCanvas from '../../components/RiveCanvas';
import TextHover from '../../components/TextHover';

/**
 * "What's up on socials": a fan of 7 tall rounded cards. On scroll the fan opens:
 * cards rotate out from a stacked centre (observed: cards start stacked, spread with rotation
 * -30..30deg and slight vertical arc). Cards are video streams on the original; images here.
 */
export default function SocialsCallout({ cards = SOCIAL_CARDS, theme = 'light' }) {
  const ref = useRef(null);
  useNavTheme(ref, theme === 'light' ? 'dark' : 'light');
  useEffect(() => {
    const items = ref.current.querySelectorAll('.social-card');
    const n = items.length; const mid = (n - 1) / 2;
    const tl = gsap.timeline({ scrollTrigger: { trigger: ref.current.querySelector('.fan'), start: 'top 80%', end: 'top 20%', scrub: 1 } });
    items.forEach((el, i) => {
      const k = i - mid;
      tl.fromTo(el, { x: 0, y: 0, rotation: 0 }, { x: `${k * 12.5}rem`, y: `${Math.abs(k) * 1.8}rem`, rotation: k * 9, ease: 'power2.out' }, 0);
    });
    return () => { tl.scrollTrigger?.kill(); tl.kill(); };
  }, []);
  const light = theme === 'light';
  return (
    <section ref={ref} className={`${light ? 'bg-white text-dark-green-tint-1' : 'bg-black text-white'} relative`}>
      <div className="container">
        <div className="h-[8rem]" />
        <div className="flex flex-col items-center text-center gap-[calc(var(--gap)*2)] w-full">
          <div className="w-[3rem] h-[3rem]"><RiveCanvas file="reef" artboard="off-icons" stateMachine="off-icons" inputs={{ 'color_green-off-white-2': true }} className="w-full h-full" /></div>
          <h2 className="t-title-lg flex flex-col items-center"><span>what’s up</span><span className="serif">On Socials</span></h2>
          <div className="fan relative w-full max-w-[80rem] h-[36rem] flex items-center justify-center">
            {cards.map((c, i) => (
              <div key={i} className="social-card absolute w-[20rem] h-[35rem] rounded-[3.31625rem] overflow-clip will-change-transform" style={{ zIndex: i }}>
                <img src={cdn(c)} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <div className="mt-[calc(var(--gap)*3)]"><p className="t-cta-intro">Follow Lando on social media</p></div>
          <div className="flex gap-[calc(var(--gap)*1.5)] t-btn">
            {SOCIALS.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noreferrer"><TextHover>{label}</TextHover></a>)}
          </div>
        </div>
      </div>
    </section>
  );
}
