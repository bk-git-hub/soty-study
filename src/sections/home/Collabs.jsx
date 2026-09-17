import { useRef } from 'react';
import { useNavTheme } from '../../lib/navTheme';
import { cdn } from '../../lib/assets';
import { PARTNER_LOGOS } from '../../data/site';
import Marquee from '../../components/Marquee';

/**
 * Partners & campaigns: title left, copy right, a logo marquee, and a huge lime handwritten
 * "Collabs" Rive word (phrases.riv / collabs artboard) drawn diagonally behind the title.
 */
import RiveCanvas from '../../components/RiveCanvas';

export default function Collabs() {
  const ref = useRef(null);
  useNavTheme(ref, 'dark');
  return (
    <section ref={ref} className="relative bg-white text-dark-green-tint-1 overflow-clip">
      <div className="container relative z-[5]">
        <div className="h-[20rem]" />
        <div className="grid-main">
          <div className="col-span-2 flex flex-col">
            <h2 className="t-title-lg">partners</h2>
            <h2 className="t-title-lg"><span className="t-title-lg-serif">&amp;campaigns</span></h2>
          </div>
          <div className="col-span-2 flex gap-[calc(var(--gap)*2)]">
            <p className="t-body-reg max-w-[25rem]">Lando is proud to collaborate with a range of partners, who share his passion for performance across a range of industries.</p>
          </div>
        </div>
        <div className="h-[8rem]" />
        <div className="relative w-screen -left-[var(--gap)] max-w-[var(--fluid-container)] overflow-clip">
          <Marquee speed={40} direction="right" gap="7rem">
            {PARTNER_LOGOS.map((l) => <img key={l} src={cdn(l)} alt="" className="h-[5.125rem] w-auto" />)}
          </Marquee>
        </div>
        <div className="absolute -z-[1] w-[79.625rem] h-[49.875rem] top-[4rem] -left-[9rem] pointer-events-none">
          <RiveCanvas file="phrases" artboard="collabs" stateMachine="page_home" className="w-full h-full" />
        </div>
      </div>
      <div className="h-[20rem]" />
    </section>
  );
}
