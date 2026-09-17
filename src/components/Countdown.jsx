import { useEffect, useState } from 'react';
import RiveCanvas from './RiveCanvas';
import Eyebrow from './Eyebrow';

/** "next race begins in..." with D/h/m/s digits and the race-day Rive phrase. */
export default function Countdown({ date = '2026-09-26T12:00:00Z', label = '26/9/2026 12:00', track = 'baku' }) {
  const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    const target = new Date(date).getTime();
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      setT({ d: Math.floor(diff / 864e5), h: Math.floor(diff / 36e5) % 24, m: Math.floor(diff / 6e4) % 60, s: Math.floor(diff / 1e3) % 60 });
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [date]);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    <section className="container py-[8rem]">
      <div className="flex flex-col items-center gap-[calc(var(--gap)*2)] text-center">
        <div className="relative w-[14rem] h-[8rem]">
          <RiveCanvas file="phrases" artboard="race-day" stateMachine="race-day" className="absolute inset-0" />
          <RiveCanvas file="circuits" artboard="circuits" stateMachine="circuits" className="absolute inset-[15%]" />
        </div>
        <Eyebrow className="text-grey-on-track">next race begins in...</Eyebrow>
        <div className="t-descriptor text-grey-on-track">{label}</div>
        <div className="flex items-end gap-[var(--gap)] text-white">
          {[['d', 'D'], ['h', 'h'], ['m', 'm'], ['s', 's']].map(([k, u]) => (
            <div key={k} className="flex items-end gap-1">
              <span className="t-stat-major tabular-nums">{pad(t[k])}</span>
              <span className="t-descriptor text-grey-on-track pb-2">{u}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
