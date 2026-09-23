import PageWaves from '../gl/PageWaves';
import Hero from '../sections/home/Hero';
import Impact from '../sections/home/Impact';
import HorizontalTrack from '../sections/home/HorizontalTrack';
import Otot from '../sections/home/Otot';
import Helmets from '../sections/home/Helmets';
import Callout from '../sections/home/Callout';
import Store from '../sections/home/Store';
import Collabs from '../sections/home/Collabs';
import SocialsCallout from '../sections/home/SocialsCallout';
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
      <Helmets />
      <div className="bg-black text-white">
        <Callout text="See more helmets and highlights from Lando on the track" cta="view on track" to="/on-track" />
      </div>
      <Store />
      <Collabs />
      <SocialsCallout />
      <Footer theme="white" />
    </>
  );
}
