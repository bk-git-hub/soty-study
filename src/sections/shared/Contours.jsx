/**
 * Topographic contour background seen on light and dark sections of the original.
 * Self-made SVG: a few hand-placed blobs, each drawn as nested offset outlines.
 * (The original draws these with Rive; this is a static stand-in for the baseline.)
 */
export default function Contours({ className = '', opacity = 1 }) {
  const blobs = [
    'M120 220c60-90 220-110 300-40s40 220-60 250-260-40-240-210z',
    'M980 120c120-60 300 20 320 140s-120 220-260 180-180-260-60-320z',
    'M700 620c80-40 220 0 230 90s-140 160-240 110-70-160 10-200z',
    'M-40 680c50-60 190-40 240 20s-10 190-120 190-170-150-120-210z',
    'M1300 560c70-70 240-30 250 60s-110 190-210 150-110-140-40-210z',
  ];
  return (
    <svg className={className} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden style={{ opacity }}>
      {blobs.map((d, i) => (
        <g key={i} transform={`translate(${(i * 37) % 60} ${(i * 23) % 40})`}>
          {[1, 1.18, 1.36, 1.54, 1.72].map((s, j) => (
            <path key={j} d={d} transform={`translate(${-(s - 1) * 520} ${-(s - 1) * 320}) scale(${s})`} />
          ))}
        </g>
      ))}
    </svg>
  );
}
