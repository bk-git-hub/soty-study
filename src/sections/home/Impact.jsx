import { useEffect, useMemo, useRef } from 'react';
import { gsap, SplitText } from '../../lib/gsap';
import RiveCanvas from '../../components/RiveCanvas';
import Eyebrow from '../../components/Eyebrow';

const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * Impact statement: huge centred Mona Sans with serif lime-off keywords, revealed line by line
 * (each line masked and slid up, staggered). Observed: data-anim-high="right, lime-off".
 * `parts`: strings are plain text; one-element arrays are the emphasised serif words.
 *
 * The text is injected as raw HTML so SplitText can restructure it without fighting React's
 * reconciler (React never diffs inside a dangerouslySetInnerHTML node).
 */
export default function Impact({ parts, eyebrow = 'mclaren f1 since 2019', icon = true, className = '' }) {
  const ref = useRef(null);
  const html = useMemo(() => parts.map((p) => (Array.isArray(p) ? `<strong class="text-lime-off">${escapeHtml(p[0])}</strong>` : escapeHtml(p))).join(''), [parts]);

  useEffect(() => {
    const el = ref.current.querySelector('.impact-text');
    let split; let tl; let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled) return;
      split = new SplitText(el, { type: 'lines', mask: 'lines', linesClass: 'impact-line' });
      tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 80%', once: true } });
      tl.fromTo(split.lines, { yPercent: 110 }, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08 });
    });
    return () => { cancelled = true; tl?.scrollTrigger?.kill(); tl?.kill(); split?.revert(); };
  }, [html]);

  return (
    <section ref={ref} className={`container ${className}`}>
      <div className="max-w-[80rem] mx-auto text-center text-green-off-white-1 flex flex-col items-center gap-[calc(var(--gap)*3)] pt-[6rem] pb-[12rem]">
        <div className="flex flex-col items-center gap-[var(--gap)]">
          {icon && <RiveCanvas file="reef" artboard="helmet-reef" stateMachine="helmet-reef_play" inputs={{ 'color_green-off-white-2': true }} className="w-[5rem] h-[2.6rem] mx-auto" />}
          <Eyebrow>{eyebrow}</Eyebrow>
        </div>
        <div className="impact-text t-impact-lg" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </section>
  );
}
