import { useEffect, useRef, useState } from 'react';
import { useNavTheme } from '../lib/navTheme';
import { RESULTS } from '../data/results';
import RiveCanvas from '../components/RiveCanvas';
import Eyebrow from '../components/Eyebrow';
import Button from '../components/Button';
import ResultsTable from '../components/ResultsTable';
import CalendarTrack from '../components/CalendarTrack';
import Countdown from '../components/Countdown';
import Footer from '../components/Footer';
import Contours from '../sections/shared/Contours';

export default function Calendar() {
  const ref = useRef(null);
  useNavTheme(ref, 'light');
  const years = Object.keys(RESULTS).sort((a, b) => b - a);
  const [year, setYear] = useState(years[0]);
  const rows = (RESULTS[year] || []).map((r) => ({ ...r, round: String(r.round), time: r.lap || '-', gap: '' }));
  return (
    <div ref={ref} className="bg-black text-white relative">
      <Contours className="absolute inset-x-0 top-0 h-[100vh] text-[#2a2a28]" />
      <section className="container relative pt-[10rem]">
        <div className="flex flex-col items-center text-center relative">
          <h1 className="t-impact-lg">Upcoming<br /><span className="t-impact-lg-serif text-grey-on-track">2026 calendar</span></h1>
          <div className="absolute -top-[3rem] left-1/2 w-[14rem] h-[9rem] -translate-x-[10%]"><RiveCanvas file="signature" artboard="signature" stateMachine="signature_play" inputs={{ color_lime: true }} className="w-full h-full" /></div>
        </div>
        <div className="h-[12rem]" />
      </section>
      <section className="container relative">
        <div className="grid-main items-end">
          <div className="col-span-2"><h2 className="t-body-lg max-w-[22rem]">The Formula 1 season is underway, view Lando’s schedule below.</h2></div>
          <div className="col-span-2 flex items-end justify-between">
            <div className="flex gap-[calc(var(--gap)*2)]">
              <div className="flex flex-col gap-2"><Eyebrow>Standing</Eyebrow><div className="flex items-start"><span className="t-stat-major">4</span><span className="t-stat-sm text-grey-on-track">Th</span></div></div>
              <div className="flex flex-col gap-2"><Eyebrow>Round</Eyebrow><span className="t-stat-major">17</span></div>
            </div>
            <div className="flex gap-[var(--gap)]">
              <Button variant="tertiary" to="#track">track visualiser</Button>
              <Button variant="tertiary" to="#list">calendar list</Button>
            </div>
          </div>
        </div>
        <div className="h-[4rem]" />
        <div id="track"><CalendarTrack start={16} /></div>
        <div className="h-[10rem]" />
        <div id="list">
          <div className="grid-main items-end mb-[4rem]">
            <div className="col-span-2"><h2 className="t-title-lg flex flex-col"><span>Formula 1</span><span className="t-title-lg-serif text-grey-on-track">All Results</span></h2></div>
            <div className="col-span-2 flex justify-end gap-[var(--gap)]">
              {years.map((y) => <button key={y} type="button" onClick={() => setYear(y)} className={`t-btn px-3 py-2 rounded-[.5rem] border ${y === year ? 'bg-lime text-dark-green border-lime' : 'border-white/30 text-grey-on-track'}`}>{y}</button>)}
            </div>
          </div>
          <ResultsTable rows={rows} columns={['Round', 'Location', 'When', 'Finish', 'fastest lap']} showRound />
        </div>
      </section>
      <Countdown />
      <Footer theme="black" />
    </div>
  );
}
