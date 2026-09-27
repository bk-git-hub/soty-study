import { useEffect, useMemo, useRef } from 'react';
import { ScrollTrigger, SplitText } from '../../lib/gsap';
import { highlightReveal } from '../../lib/highlight';
import RiveCanvas from '../../components/RiveCanvas';
import Eyebrow from '../../components/Eyebrow';
import { ID } from '../../data/identity';

const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * Impact statement: huge centred Mona Sans with serif lime-off keywords, revealed line by line with the
 * site's highlight sweep (src/lib/highlight.js; measured on the original 2026-09-22). Day 0 had guessed a
 * mask-and-slide-up here from the attribute name alone.
 * `parts`: strings are plain text; one-element arrays are the emphasised serif words.
 *
 * The text is injected as raw HTML so SplitText can restructure it without fighting React's
 * reconciler (React never diffs inside a dangerouslySetInnerHTML node). The {__html} object must be
 * stable: React 19 rewrites innerHTML whenever that object is a new one, string equal or not, and this
 * component re-renders when the hero reports ready. With a fresh literal each render the split lines
 * (and any reveal on them) were wiped a few seconds after load, silently. Since day 0 (found 2026-09-22).
 */
export default function Impact({ parts, eyebrow = `${ID.team} ${ID.series} since 2019`.toLowerCase(), icon = true, className = '' }) {
  const ref = useRef(null);
  const html = useMemo(() => parts.map((p) => (Array.isArray(p) ? `<strong class="text-lime-off">${escapeHtml(p[0])}</strong>` : escapeHtml(p))).join(''), [parts]);
  const inner = useMemo(() => ({ __html: html }), [html]);

  useEffect(() => {
    const el = ref.current.querySelector('.impact-text');
    let split; let tl; let st; let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled) return;
      split = new SplitText(el, { type: 'lines', linesClass: 'impact-line' });
      tl = highlightReveal(split.lines);
      // the original's first line starts its sweep with its top at ~86 % of the viewport (virtual-clock
      // frames); the lines below follow by time, on screen or not
      st = ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => tl.play() });
    });
    return () => { cancelled = true; st?.kill(); tl?.revert(); split?.revert(); };
  }, [html]);

  return (
    <section ref={ref} className={`container ${className}`}>
      <div className="max-w-[80rem] mx-auto text-center text-green-off-white-1 flex flex-col items-center gap-[calc(var(--gap)*3)] pt-[6rem] pb-[12rem]">
        <div className="flex flex-col items-center gap-[var(--gap)]">
          {icon && <RiveCanvas file="reef" artboard="helmet-reef" stateMachine="helmet-reef_play" inputs={{ 'color_green-off-white-2': true }} className="w-[5rem] h-[2.6rem] mx-auto" />}
          <Eyebrow>{eyebrow}</Eyebrow>
        </div>
        <div className="impact-text t-impact-lg" dangerouslySetInnerHTML={inner} />
      </div>
    </section>
  );
}
