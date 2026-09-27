import { useEffect, useRef, useState } from 'react';

/*
 * Our own stand-ins for the original's Rive files (btn-ui, reef, phrases, circuits), drawn as SVG and
 * animated with CSS. RiveCanvas hands these files here, so every call site keeps its props.
 *
 * "Drawing" a line: each stroked path gets pathLength = 1, so its length counts as 1; with a dash of 1
 * and a gap of 1, stroke-dashoffset 1 shows nothing and 0 shows the whole path. The .own-draw class
 * animates that offset (index.css) once the element is in view; --i staggers paths one after another.
 */
const COLOURS = {
  color_lime: '#d2ff00', 'color_green-off-white-2': '#b4b8a5', 'color_grey-on-track': '#b9bbad', 'color_dark-green-tint-2': '#535450',
};
const colourOf = (inputs) => { for (const [k, v] of Object.entries(inputs || {})) if (v === true && COLOURS[k]) return COLOURS[k]; return 'currentColor'; };

/** adds .is-drawn when the element scrolls into view (and `play` allows it) */
function useInView(play = true) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen && play];
}

const P = (d, i, extra = {}) => <path key={i} d={d} pathLength="1" style={{ '--i': i }} {...extra} />;

// --- btn-ui: the button arrow; on hover of the button it leaves to the top right and a copy comes in --
function Arrow({ className, style }) {
  const d = 'M1.5 8.5L8.5 1.5M3 1.5H8.5V7';
  return (
    <div className={className} style={style}>
      <svg viewBox="0 0 10 10" className="own-arrow w-full h-full overflow-hidden" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" aria-hidden>
        <path className="a1" d={d} /><path className="a2" d={d} />
      </svg>
    </div>
  );
}

// --- reef: a laurel wreath (two leafy branches), with a small helmet in the middle for "helmet-reef" --
function branch(side) {
  // the stem: a quarter arc from the bottom centre out and up; leaves sit on it, alternating sides
  const s = side, cx = 60, out = [];
  out.push(`M${cx - s * 8} 58C${cx - s * 38} 56 ${cx - s * 50} 36 ${cx - s * 46} 10`);
  const leaves = [];
  for (let k = 0; k < 6; k++) {
    const t = 0.12 + k * 0.15;
    // point on the cubic above (sampled) and a leaf as a pointed ellipse pointing along the stem
    const b = (a0, a1, a2, a3) => (1 - t) ** 3 * a0 + 3 * (1 - t) ** 2 * t * a1 + 3 * (1 - t) * t * t * a2 + t ** 3 * a3;
    const x = b(cx - s * 8, cx - s * 38, cx - s * 50, cx - s * 46), y = b(58, 56, 36, 10);
    const ang = (-20 - k * 14) * s + (s > 0 ? 180 : 0);
    const flip = k % 2 ? 1 : -1;
    leaves.push({ x, y, ang: ang + flip * 28 });
  }
  return { stem: out[0], leaves };
}
function Reef({ artboard, inputs, className, style }) {
  const [ref, on] = useInView(true);
  const col = colourOf(inputs);
  const L = branch(1), R = branch(-1);
  const withHelmet = artboard === 'helmet-reef';
  let i = 0;
  return (
    <div ref={ref} className={className} style={style}>
      <svg viewBox="0 0 120 64" className={`own-draw w-full h-full ${on ? 'is-drawn' : ''}`} fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {P(L.stem, i++)}{P(R.stem, i++)}
        {[...L.leaves, ...R.leaves].map((l, k) => (
          <ellipse key={`l${k}`} className="own-pop" cx={l.x} cy={l.y} rx="6.5" ry="2.6" fill={col} stroke="none" transform={`rotate(${l.ang} ${l.x} ${l.y})`} style={{ '--i': 2 + (k % 6) }} />
        ))}
        {withHelmet && <>
          {P('M47 46C45 26 52 17 60 17S75 26 73 46Z', 8)}
          {P('M50 31H70V38H50Z', 9)}
        </>}
      </svg>
    </div>
  );
}

// --- off-icons: off-track hobbies, one after another (padel, camera, golf, bricks) --------------------
const OFF_ICONS = [
  ['M17 29a11 13 0 1 1 14-1L21 38', 'M16 16l10 10M22 12l6 6M12 22l6 6', 'M21 38l-8 8'], // padel racket
  ['M8 16h8l3-4h10l3 4h8v22H8Z', 'M24 35a8 8 0 1 0 0-16a8 8 0 0 0 0 16Z'], // camera
  ['M18 42V8l14 6-14 6', 'M10 42h24'], // golf flag
  ['M8 24h32v14H8Z', 'M12 24v-5h8v5M28 24v-5h8v5'], // brick
];
function OffIcons({ inputs, className, style }) {
  const [ref, on] = useInView(true);
  const [n, setN] = useState(0);
  useEffect(() => { const t = setInterval(() => setN((v) => (v + 1) % OFF_ICONS.length), 1800); return () => clearInterval(t); }, []);
  const col = colourOf(inputs);
  return (
    <div ref={ref} className={className} style={style}>
      <svg viewBox="0 0 48 48" className={`own-draw w-full h-full ${on ? 'is-drawn' : ''}`} key={n} fill="none" stroke={col} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {OFF_ICONS[n].map((d, i) => P(d, i))}
      </svg>
    </div>
  );
}

// --- phrases: hand-lettered words, written stroke by stroke --------------------------------------------
const PHRASES = {
  // a brushy "ON": the O as one loop, the N as one zigzag
  phrase_on: { vb: '0 0 213 160', w: 11, paths: ['M72 38C44 40 30 98 44 124C58 148 96 122 101 82C105 50 92 32 72 38', 'M122 142L140 58L166 136L194 22'] },
  // "Race Day" in a quick print hand
  'race-day': { vb: '0 0 240 90', w: 4.5, paths: [
    'M14 70L22 22C40 18 48 34 30 44L48 70', 'M70 46C60 44 54 60 62 66C70 70 74 56 74 48L76 68', 'M100 48C90 44 84 60 94 66C98 68 104 66 106 62', 'M116 58H132C132 46 116 42 112 56C110 68 124 72 134 64',
    'M150 70L154 22C186 20 196 64 150 70', 'M214 48C204 44 198 60 206 66C214 70 218 56 218 48L220 68', 'M226 48L232 66M240 46L226 88'] },
  // "collabs"
  collabs: { vb: '0 0 260 90', w: 4.5, paths: [
    'M36 46C26 42 18 58 26 66C32 70 40 66 42 62', 'M62 46C52 44 48 60 56 66C64 70 70 58 66 50C64 46 62 46 62 46', 'M84 16L80 68', 'M100 16L96 68',
    'M128 46C118 44 112 60 120 66C128 70 132 56 132 48L134 68', 'M150 12L146 68C150 48 170 42 172 58C174 70 160 72 148 66', 'M204 48C198 42 184 44 188 54C192 62 208 60 204 68C200 74 188 70 186 66'] },
};
function Phrase({ artboard, play = true, className, style }) {
  const [ref, on] = useInView(play);
  const ph = PHRASES[artboard] || PHRASES.phrase_on;
  return (
    <div ref={ref} className={className} style={style}>
      <svg viewBox={ph.vb} className={`own-draw own-draw-slow w-full h-full ${on ? 'is-drawn' : ''}`} fill="none" stroke="#d2ff00" strokeWidth={ph.w} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {ph.paths.map((d, i) => P(d, i))}
      </svg>
    </div>
  );
}

// --- circuits: a made-up race track, drawn once, then a dot laps it ------------------------------------
const TRACK = 'M20 60C20 30 40 18 70 22L120 30C140 33 150 24 160 14C170 4 190 8 192 26C194 44 176 50 176 64C176 80 196 84 196 100C196 116 176 122 150 118L60 108C36 105 20 90 20 60Z';
function Circuit({ className, style }) {
  const [ref, on] = useInView(true);
  return (
    <div ref={ref} className={className} style={style}>
      <svg viewBox="0 0 216 132" className={`own-draw own-draw-slow w-full h-full ${on ? 'is-drawn' : ''}`} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {P(TRACK, 0)}
        {on && <circle r="5" fill="#d2ff00" stroke="none"><animateMotion dur="3.2s" begin="1.6s" repeatCount="indefinite" path={TRACK} /></circle>}
      </svg>
    </div>
  );
}

export const OWN_RIVE_FILES = new Set(['btn-ui', 'reef', 'phrases', 'circuits']);

export default function OwnRive({ file, artboard, inputs, play, className, style }) {
  if (file === 'btn-ui') return <Arrow className={className} style={style} />;
  if (file === 'reef') return artboard === 'off-icons' ? <OffIcons inputs={inputs} className={className} style={style} /> : <Reef artboard={artboard} inputs={inputs} className={className} style={style} />;
  if (file === 'phrases') return <Phrase artboard={artboard} play={play} className={className} style={style} />;
  return <Circuit className={className} style={style} />;
}
