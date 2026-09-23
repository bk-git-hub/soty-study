import PageWaves from '../gl/PageWaves';
import Hero from '../sections/home/Hero';
import Impact from '../sections/home/Impact';
import HorizontalTrack from '../sections/home/HorizontalTrack';
import Otot from '../sections/home/Otot';
import Footer from '../components/Footer';
import { HORIZONTAL, IMPACT } from '../data/home';

export default function Home({ ready, onHeroReady }) {
  return (
    <>
      {/* the live contour field behind the hero and the impact statement (the sections below paint over
          it); the hero's sticky stretch is one screen high, below it the field is attached to the page */}
      <PageWaves scrollFrom={() => window.innerHeight} />
      <Hero ready={ready} onHeroReady={onHeroReady} />
      <Impact parts={IMPACT} />
      <HorizontalTrack items={HORIZONTAL} waves />
      <Otot />
      {/* the sections after ON / OFF TRACK (helmets, store, partners, socials) are out for now: the user
          asked to stop the page here (2026-09-23); their components stay in src/sections/home */}
      <Footer theme="white" />
    </>
  );
}
