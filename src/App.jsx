import { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import SmoothScroll, { getLenis } from './lib/SmoothScroll';
import { ScrollTrigger } from './lib/gsap';
import Nav from './components/Nav';
import Loader from './components/Loader';
import Home from './pages/Home';
import OnTrack from './pages/OnTrack';
import OffTrack from './pages/OffTrack';
import Calendar from './pages/Calendar';
import NotFound from './pages/NotFound';

function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => {
    getLenis()?.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
    // let the new page lay out, then recompute every ScrollTrigger
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [pathname]);
  return null;
}

export default function App() {
  const [ready, setReady] = useState(false);
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
      {!ready && <Loader onDone={() => setReady(true)} />}
      <div className="page-w relative w-full overflow-clip" data-ready={ready}>
        <main>
          <Routes>
            <Route path="/" element={<Home ready={ready} />} />
            <Route path="/on-track" element={<OnTrack />} />
            <Route path="/off-track" element={<OffTrack />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </SmoothScroll>
  );
}
