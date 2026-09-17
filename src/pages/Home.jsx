import Hero from '../sections/home/Hero';
import MarqueeSection from '../sections/home/MarqueeSection';
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

export default function Home({ ready }) {
  return (
    <>
      <Hero ready={ready} />
      <MarqueeSection />
      <div className="bg-dark-green"><Impact parts={IMPACT} /></div>
      <HorizontalTrack items={HORIZONTAL} />
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
