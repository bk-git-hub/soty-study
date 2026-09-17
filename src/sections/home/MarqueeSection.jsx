import { useRef } from 'react';
import { useNavTheme } from '../../lib/navTheme';
import { cdn } from '../../lib/assets';
import RiveCanvas from '../../components/RiveCanvas';
import Marquee from '../../components/Marquee';
import Eyebrow from '../../components/Eyebrow';
import Contours from '../shared/Contours';

/**
 * "Message from Lando": dark-green full-screen section. The WebGL head lands in the centre
 * target, two lines of huge lime text scroll past (WebGL MSDF text in the original, DOM here),
 * and the lime signature draws itself on top (signature.riv, scroll-driven).
 */
export default function MarqueeSection() {
  const ref = useRef(null);
  useNavTheme(ref, 'light');
  return (
    <section ref={ref} className="relative bg-dark-green text-white overflow-clip flex items-center justify-center" style={{ minHeight: 'calc(var(--vh) * 100)' }}>
      <Contours className="absolute inset-0 text-[#3f4633]" />
      <div className="relative w-full h-[15rem]">
        <div className="absolute inset-x-0 -top-[10rem] flex flex-col items-center gap-[var(--gap)] text-center">
          <img src={cdn('ln4-LN-logo-svg.svg')} alt="" className="w-[2.4rem] h-[2.4rem]" />
          <Eyebrow>Message from lando</Eyebrow>
        </div>
        {/* marquee text lines */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col gap-2 text-lime select-none pointer-events-none">
          <Marquee speed={90} direction="left" gap="3rem">
            <span className="t-impact-lg whitespace-nowrap">WE DID IT ALL</span>
          </Marquee>
          <Marquee speed={90} direction="right" gap="3rem">
            <span className="t-impact-lg whitespace-nowrap">FOREVER GP WEEK</span>
          </Marquee>
        </div>
        {/* centre target where the WebGL head lands + photo carousel placeholder */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[35.375rem] h-[22.875rem] flex items-center justify-center">
          <div className="absolute inset-0 bg-white/10" />
          <div className="relative w-[120%] h-[140%] -top-[10%]">
            <RiveCanvas file="signature" artboard="signature" stateMachine="signature_play" inputs={{ color_lime: true }} className="w-full h-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
