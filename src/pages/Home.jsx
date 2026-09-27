import PageWaves from '../gl/PageWaves';
import Hero from '../sections/home/Hero';
import Impact from '../sections/home/Impact';
import HorizontalTrack from '../sections/home/HorizontalTrack';
import Otot from '../sections/home/Otot';
import Helmets from '../sections/home/Helmets';
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
      {/* black, opaque: the contour field behind stops showing here */}
      <Helmets />
      {/* store, partners and socials are still out (the user stopped the page at ON / OFF TRACK on
          2026-09-23 and is adding sections back one by one); their components stay in src/sections/home */}
      <Footer theme="white" />
    </>
  );
}
