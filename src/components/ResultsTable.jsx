import { useRef } from 'react';
import { cdn } from '../lib/assets';
import Eyebrow from './Eyebrow';

/**
 * Results list (on-track highlights + calendar). Rows: series | name+flag | date | finish+trophy | time.
 * Hovering a row shows its photo following the cursor (mouse-track reveal on the original).
 */
export default function ResultsTable({ rows, columns = ['series', 'Name', 'When', 'Finish', 'Time / Gap'], showRound = false }) {
  const ref = useRef(null);
  const hover = useRef(null);
  const onMove = (e) => {
    const el = hover.current; if (!el) return;
    const r = ref.current.getBoundingClientRect();
    el.style.transform = `translate(${e.clientX - r.left + 24}px, ${e.clientY - r.top - 120}px)`;
  };
  const cols = showRound ? 'grid-cols-[6rem_1fr_1fr_1fr_1fr]' : 'grid-cols-[6rem_1.6fr_1fr_1fr_1fr]';
  return (
    <div ref={ref} className="relative" onMouseMove={onMove}>
      <div className={`grid ${cols} gap-[var(--gap)] text-grey-on-track pb-4`}>
        {columns.map((c) => <Eyebrow key={c}>{c}</Eyebrow>)}
      </div>
      <div className="flex flex-col">
        {rows.map((r, i) => (
          <div key={i} className={`group grid ${cols} gap-[var(--gap)] items-center py-[1.2rem] border-t border-white/15 relative`}
               onMouseEnter={() => { if (hover.current) { hover.current.src = cdn(r.img); hover.current.style.opacity = 1; } }}
               onMouseLeave={() => { if (hover.current) hover.current.style.opacity = 0; }}>
            <div className="t-stat-major">{showRound ? r.round : 'F1'}</div>
            <div className="flex items-center gap-3">
              <div className="t-stat-major">{r.name}</div>
              {r.flag && <img src={cdn(r.flag)} alt="" className="w-[1.6rem] h-[1.1rem] object-cover rounded-[2px]" />}
            </div>
            <div className="t-stat-major flex gap-2"><span>{r.date}</span><span className="text-grey-on-track">{r.year}</span></div>
            <div className="flex items-center gap-3">
              <div className="t-stat-major">{r.finish}</div>
              {r.trophy && <img src={cdn(r.trophy)} alt="" className="h-[2.4rem] w-auto" />}
            </div>
            <div className="t-stat-reg">{r.time}<span className="text-grey-on-track"> {r.gap || '-'}</span></div>
          </div>
        ))}
      </div>
      <img ref={hover} alt="" className="pointer-events-none absolute left-0 top-0 w-[16rem] h-[20rem] object-cover rounded-[1rem] opacity-0 transition-opacity duration-500 z-20" />
    </div>
  );
}
