import { useCallback, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import SmoothScroll, { getLenis } from './lib/SmoothScroll';
import { ScrollTrigger } from './lib/gsap';
import Nav from './components/Nav';
import Loader from './components/Loader';
import Home from './pages/Home';
import { OPTIONAL_PAGES, NotFoundPage } from './lib/pages';

function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => {
    getLenis()?.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
    // let the new page lay out, then recompute every ScrollTrigger
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    // Positions measured before the fonts swapped in are wrong by the text widths they change (the gallery's
    // track is as wide as its captions): every trigger below the gallery then sits 88 px late (2026-09-23).
    document.fonts.ready.then(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [pathname]);
  return null;
}

export default function App() {
  // ready: the loader has opened and is gone. heroReady: the page behind it can be shown.
  const [ready, setReady] = useState(false);
  const [heroReady, setHeroReady] = useState(false);
  const { pathname } = useLocation();
  // stable identity: an inline arrow here would defeat the memo on the hero's WebGL canvas
  const onHeroReady = useCallback(() => setHeroReady(true), []);
  useEffect(() => {
    // Only the home page has something to wait for (the WebGL hero). Everywhere else, and if the hero
    // never reports (no WebGL, a missing asset), the loader must still open.
    if (pathname !== '/') { setHeroReady(true); return; }
    const id = setTimeout(() => setHeroReady(true), 8000);
    return () => clearTimeout(id);
  }, [pathname]);
  useEffect(() => {
    // --vh: real viewport unit that ignores mobile browser chrome (the original does the same)
    const setVh = () => document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    setVh();
    window.addEventListener('resize', setVh);
    return () => window.removeEventListener('resize', setVh);
  }, []);

  return (
    <SmoothScroll>
      <ScrollReset />
      <Nav />
      {!ready && <Loader canExit={heroReady} onDone={() => setReady(true)} />}
      <div className="page-w relative w-full overflow-clip" data-ready={ready}>
        <main>
          <Routes>
            <Route path="/" element={<Home ready={ready} onHeroReady={onHeroReady} />} />
            {/* the other pages exist only where their files do (see lib/pages.js); unknown paths go home then */}
            {Object.entries(OPTIONAL_PAGES).map(([path, Page]) => Page && <Route key={path} path={path} element={<Page />} />)}
            <Route path="*" element={NotFoundPage ? <NotFoundPage /> : <Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </SmoothScroll>
  );
}
