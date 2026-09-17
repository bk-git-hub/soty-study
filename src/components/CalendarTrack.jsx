import { useState } from 'react';
import { cdn } from '../lib/assets';
import { ROUNDS } from '../data/calendar';
import Button from './Button';
import RiveCanvas from './RiveCanvas';
import Eyebrow from './Eyebrow';

/**
 * Track visualiser: one round at a time inside a "visor" frame. Left column = when / length /
 * first competed / distance / laps, right column = "Lando at <circuit>" blurb + session schedule.
 * The original renders the circuit as a 3D line model (tracks GLB) with a matcap; here the
 * circuits Rive artboard draws it (same outline art the hero card uses). Prev/next cycle rounds.
 */
export default function CalendarTrack({ start = 0 }) {
  const [i, setI] = useState(start);
  const r = ROUNDS[i];
  const go = (d) => setI((v) => (v + d + ROUNDS.length) % ROUNDS.length);
  const Stat = ({ label, value, unit }) => (
    <div className="flex flex-col gap-2">
      <Eyebrow className="text-grey-on-track">{label}</Eyebrow>
      <div className="flex items-end gap-1"><span className="t-stat-large text-lime">{value}</span>{unit && <span className="t-stat-sm text-green-off-white-1 pb-1">{unit}</span>}</div>
    </div>
  );
  return (
    <div className="relative">
      <div className="relative rounded-[1.5rem] border border-white/20 overflow-clip" style={{ aspectRatio: '1688 / 760' }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <RiveCanvas key={r.track} file="circuits" artboard="circuits" stateMachine="circuits" className="w-[46%] h-[70%] text-lime" />
        </div>
        <div className="absolute inset-0 flex justify-between p-[calc(var(--gap)*2)]">
          <div className="flex flex-col gap-[calc(var(--gap)*2)] w-[18rem]">
            <div className="flex flex-col gap-2">
              <Eyebrow className="text-grey-on-track">When</Eyebrow>
              <div className="t-stat-major text-lime">{r.dates}</div>
              <div className="t-stat-major text-green-off-white-1">{r.month}</div>
            </div>
            <div className="flex gap-[calc(var(--gap)*2)]">
              <Stat label="Length" value={r.length} unit="km" />
              <Stat label="First Competed" value={r.first} />
            </div>
            <div className="flex gap-[calc(var(--gap)*2)]">
              <Stat label="Distance" value={r.distance} unit="km" />
              <Stat label="Laps" value={r.laps} />
            </div>
          </div>
          <div className="flex flex-col gap-[calc(var(--gap)*2)] w-[22rem]">
            <div className="flex flex-col gap-2">
              <div className="flex gap-1 text-grey-on-track"><Eyebrow>lando at</Eyebrow><Eyebrow>{r.circuit}</Eyebrow></div>
              <p className="t-body-sm text-green-off-white-1">{r.about}</p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-3 text-grey-on-track"><Eyebrow>Schedule</Eyebrow><Eyebrow>{r.past ? 'Result' : ''}</Eyebrow><Eyebrow>{r.past ? 'Time/Gap' : ''}</Eyebrow></div>
              {r.schedule.map(([label, date, time], k) => (
                <div key={k} className="grid grid-cols-3 t-stat-sm text-white"><span>{label}</span><span>{date}</span><span>{time}</span></div>
              ))}
              <div className="t-eyebrow text-grey-on-track mt-2">*uk time</div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute left-0 -bottom-[2rem] flex items-center gap-[var(--gap)]">
        <div className="t-title-lg text-white">{r.circuit}</div>
        {r.flag && <img src={cdn(r.flag)} alt="" className="w-[2.2rem] h-[1.5rem] object-cover rounded-[3px]" />}
      </div>
      <div className="absolute right-0 -bottom-[4rem] flex gap-[var(--gap)]">
        <button type="button" onClick={() => go(-1)} aria-label="previous"><Button variant="icon" rotate /></button>
        <button type="button" onClick={() => go(1)} aria-label="next"><Button variant="icon" /></button>
      </div>
    </div>
  );
}
