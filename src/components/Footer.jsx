import { Link, useLocation } from 'react-router-dom';
import { cdn } from '../lib/assets';
import { PAGES, SOCIALS, FOOTER_LOGOS } from '../data/site';
import Button from './Button';
import RiveCanvas from './RiveCanvas';
import TextHover from './TextHover';
import Marquee from './Marquee';

/**
 * Footer: a dark-green card masked into a "visor" shape (mask-image SVG), page + social links,
 * "ALWAYS BRINGING THE FIGHT." with the animated signature above, the 360 helmet at the bottom,
 * partner logo marquee behind it and a lime radial glow on the page background.
 * theme: 'white' (home/off-track), 'black' (on-track / calendar) sets the page bg behind the card.
 */
export default function Footer({ theme = 'white' }) {
  const { pathname } = useLocation();
  const bg = theme === 'black' ? 'bg-black' : theme === 'green' ? 'bg-dark-green' : 'bg-white';
  return (
    <section className={`relative ${bg}`} data-nav-theme="dark">
      <div className="h-[14rem]" />
      <div className="container relative z-[5] py-[var(--gap)]">
        <div className="relative">
          <div className="footer-clip relative w-full bg-dark-green text-white"
               style={{ aspectRatio: '1688 / 896', WebkitMaskImage: `url(${cdn('ln4-footer-mask-desktop.svg')})`, maskImage: `url(${cdn('ln4-footer-mask-desktop.svg')})`, WebkitMaskSize: 'cover', maskSize: 'cover', maskRepeat: 'no-repeat', maskPosition: 'center' }}>
            <div className="flex flex-col h-full">
              {/* statement */}
              <div className="absolute inset-x-0 top-[12rem] flex justify-center text-center">
                <div className="relative flex flex-col items-center w-[48rem] mx-auto">
                  <div className="absolute -top-[6.8rem] w-[13.0625rem] h-[8.5rem] z-[5]">
                    <RiveCanvas file="signature" artboard="signature" stateMachine="signature_play" inputs={{ color_lime: true }} className="w-full h-full" />
                  </div>
                  <h2 className="t-impact-sm">
                    Always <span className="t-impact-sm-serif text-lime-off">bringing</span> the <span className="t-impact-sm-serif text-lime-off">fight</span>.
                  </h2>
                </div>
              </div>
              {/* links */}
              <div className="relative flex justify-between w-full mt-auto mb-[14rem] px-[12.8rem] max-[991px]:px-[4.1rem]">
                <div className="flex flex-col items-center">
                  <span className="t-eyebrow text-green-off-white-2">pages</span>
                  <div className="flex flex-col items-center gap-[calc(var(--gap)*.2)] mt-4 mb-8">
                    {PAGES.map(([label, to]) => (
                      <Link key={to} to={to} className={`t-btn footer ${pathname === to ? 'text-green-off-white-2' : ''}`}><TextHover>{label}</TextHover></Link>
                    ))}
                  </div>
                  <a href="https://store.landonorris.com" target="_blank" rel="noreferrer" className="t-btn nav text-lime"><TextHover>Store</TextHover></a>
                </div>
                <div className="flex flex-col items-center">
                  <span className="t-eyebrow text-green-off-white-2">Follow On</span>
                  <div className="flex flex-col items-center gap-[calc(var(--gap)*.2)] mt-4 mb-8">
                    {SOCIALS.map(([label, href]) => (
                      <a key={label} href={href} target="_blank" rel="noreferrer" className="t-btn footer"><TextHover>{label}</TextHover></a>
                    ))}
                  </div>
                  <a href="#signup" className="t-btn nav text-lime"><TextHover>Sign Up</TextHover></a>
                </div>
              </div>
              {/* helmet */}
              <div className="absolute inset-x-0 bottom-0 flex justify-center items-end pointer-events-none z-[5]">
                <div className="relative flex justify-center items-end">
                  <img src={cdn('ln-360-helm-1.webp')} alt="" className="w-[48.75rem] h-[39.875rem] relative -bottom-[3rem] object-contain flex-none" />
                  <div className="absolute bottom-[1.75rem] pointer-events-auto">
                    <Button to="mailto:business@landonorris.com" external>business enquiries</Button>
                  </div>
                </div>
              </div>
              {/* logo marquee */}
              <div className="absolute inset-x-0 bottom-[3.75rem] h-[2.625rem] -z-[1] overflow-clip text-lime">
                <Marquee speed={30} direction="left" gap="calc(var(--gap)*2)">
                  {FOOTER_LOGOS.map((l) => <img key={l} src={cdn(l)} alt="" className="h-[2.625rem] w-auto mr-[3rem]" />)}
                </Marquee>
              </div>
              <div className="absolute inset-0 -z-[1] opacity-[.12]">
                <img src={cdn('blobs_footer_1.svg')} alt="" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 flex justify-between t-small-label text-dark-green-tint-2 px-2 pb-1 max-[991px]:relative max-[991px]:mt-8 max-[991px]:flex-row-reverse max-[991px]:justify-center max-[991px]:gap-[var(--gap)]">
            <div className="flex gap-[var(--gap)]"><span><b className="font-semibold">© 2026 Lando Norris.</b> All rights reserved</span></div>
            <div className="flex gap-[var(--gap)] t-btn">
              <Link to="/legal/privacy-policy"><TextHover>Privacy Policy</TextHover></Link>
              <Link to="/legal/terms-conditions"><TextHover>Terms</TextHover></Link>
            </div>
          </div>
        </div>
      </div>
      {/* lime glow rising from the bottom */}
      <div className="absolute inset-x-0 bottom-0 h-full pointer-events-none overflow-clip"
           style={{ backgroundImage: 'radial-gradient(circle farthest-corner at 50% -190%, #d2ff0000 68%, #d2ff00 83%)' }} />
    </section>
  );
}
