import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cdn } from '../lib/assets';
import Menu from './Menu';
import TextHover from './TextHover';

/**
 * Fixed nav: brand (top-left), LN mark (center), STORE + hamburger (top-right).
 * Sections flip the nav between light/dark text by setting data-nav-theme on <html>
 * (see useNavTheme in lib/navTheme.js). The brand SVG uses currentColor so it follows.
 */
export default function Nav() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => { document.documentElement.classList.toggle('menu-open', open); }, [open]);

  return (
    <>
      <div className="nav fixed inset-x-0 top-0 z-[120] pointer-events-none">
        <div className="flex items-center justify-between p-[var(--gap)] relative">
          <Link to="/" className="pointer-events-auto max-[991px]:hidden nav-brand" aria-label="Lando Norris home">
            <span className="nav-brand-text flex flex-col leading-none text-dark-green">
              <span className="serif text-[1.55rem] tracking-[-.02em]">LANDO</span>
              <span className="text-[1.5rem] -mt-[.15rem]" style={{ fontVariationSettings: '"wght" 800, "wdth" 92' }}>NORRIS</span>
            </span>
          </Link>
          <Link to="/" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto nav-mark" aria-label="Home">
            <img src={cdn('ln4-LN-logo-svg.svg')} alt="" className="w-[2.75rem] h-[2.75rem] nav-mark-img" />
          </Link>
          <div className="flex items-center gap-[var(--gap)] pointer-events-auto ml-auto">
            <a href="https://store.landonorris.com" target="_blank" rel="noreferrer"
               className="bg-lime text-dark-green h-[3.75rem] px-4 rounded-[.54rem] inline-flex items-center gap-2 t-btn nav">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path d="M6 8h12l1 13H5L6 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" />
              </svg>
              <TextHover>Store</TextHover>
            </a>
            <button type="button" onClick={() => setOpen((v) => !v)} aria-label={open ? 'Close menu' : 'Open menu'}
              className="nav-ham w-[3.75rem] h-[3.75rem] rounded-[.74rem] bg-white text-black flex items-center justify-center">
              <span className="relative block w-5 h-3">
                <span className="absolute left-0 top-0 h-[2px] w-full bg-current transition-transform duration-500"
                      style={{ transform: open ? 'translateY(5px) rotate(45deg)' : 'translateX(3px)' }} />
                <span className="absolute left-0 bottom-0 h-[2px] w-full bg-current transition-transform duration-500"
                      style={{ transform: open ? 'translateY(-5px) rotate(-45deg)' : 'translateX(-3px)' }} />
              </span>
            </button>
          </div>
        </div>
      </div>
      <Menu open={open} onClose={() => setOpen(false)} />
    </>
  );
}
