import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from '../../lib/gsap';
import { cdn } from '../../lib/assets';
import RiveCanvas from '../../components/RiveCanvas';
import Contours from '../shared/Contours';

/**
 * Pinned horizontal gallery (home, on-track, off-track).
 * Vertical scroll is mapped to a horizontal translate of the track (scrub), images get a slight
 * counter-parallax (they are 4rem larger than their frames and drift against travel), and the
 * section background cross-fades (dark-green -> white on home) as the track passes.
 *
 * Item kinds: {caption,img,w,h} photo | {quote,text,signature} | {title,img} big serif title card |
 * {subtitle,desc} small serif title with eyebrow description.
 */
export default function HorizontalTrack({ items, from = '#282c20', to = '#f4f4ed', captionFrom = '#b4b8a5', captionTo = '#535450' }) {
  const wrap = useRef(null);
  const track = useRef(null);

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 992px)', () => {
      const t = track.current;
      const dist = () => t.scrollWidth - window.innerWidth;
      const tween = gsap.to(t, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: wrap.current, start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 },
      });
      t.querySelectorAll('.h-img').forEach((img) => {
        gsap.fromTo(img, { x: '-2rem' }, { x: '2rem', ease: 'none', scrollTrigger: { trigger: img.parentElement, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
      });
      if (from !== to) {
        gsap.fromTo(wrap.current, { backgroundColor: from, color: captionFrom }, { backgroundColor: to, color: captionTo, ease: 'none', scrollTrigger: { trigger: wrap.current, start: 'top top', end: () => `+=${dist()}`, scrub: true } });
      }
      return () => tween.kill();
    });
    return () => mm.revert();
  }, [items]);

  const renderItem = (it, j) => {
    if (it.quote) return (
      <div key={j} className={`flex flex-col gap-[var(--gap)] max-w-[22rem] ${it.tone === 'light' ? 'text-green-off-white-2' : 'text-dark-green-tint-1'}`} style={{ marginTop: j === 0 ? '4vh' : 0 }}>
        <p className="t-callout">{it.text.map((t, k) => Array.isArray(t) ? <span key={k} className="text-green-off-white-1">{t[0]}</span> : t)}</p>
        <img src={cdn(it.signature)} alt="" className="w-[6rem]" />
      </div>
    );
    if (it.title) return (
      <div key={j} className="flex flex-col gap-[var(--gap)]">
        <div className="flex items-end gap-[var(--gap)]">
          {it.icon && <RiveCanvas file="reef" artboard="off-icons" stateMachine="off-icons" inputs={{ 'color_green-off-white-2': true }} className="w-[3rem] h-[3rem]" />}
          <h2 className="t-title-lg flex flex-col"><span>{it.title[0]}</span><span className="t-title-lg-serif">{it.title[1]}</span></h2>
        </div>
        <div className="overflow-clip" style={{ width: `${it.w}rem`, height: `${it.h}rem` }}>
          <img src={cdn(it.img)} alt="" className="h-img flex-none object-cover" style={{ width: 'calc(100% + 4rem)', height: 'calc(100% + 4rem)', maxWidth: 'none' }} />
        </div>
      </div>
    );
    if (it.subtitle) return (
      <div key={j} className="flex flex-col gap-[var(--gap)] max-w-[19rem]" style={{ marginTop: '6vh' }}>
        <h3 className="t-title-reg-serif whitespace-pre-line">{it.subtitle}</h3>
        <div className="t-eyebrow text-dark-green-tint-2">{it.desc}</div>
      </div>
    );
    return (
      <div key={j} className="relative flex flex-col gap-[var(--gap)]" style={{ marginTop: it.offset ? `${it.offset}rem` : 0 }}>
        <div className="t-eyebrow">{it.caption}</div>
        <div className="overflow-clip flex items-center justify-end" style={{ width: `${it.w}rem`, height: `${it.h}rem` }}>
          <img src={cdn(it.img)} alt="" className="h-img flex-none object-cover pointer-events-none" style={{ width: 'calc(100% + 4rem)', height: 'calc(100% + 4rem)', maxWidth: 'none' }} />
        </div>
        {it.pill && (
          <div className="absolute -right-[2.5rem] bottom-[2rem] flex flex-col items-center gap-1 text-dark-green">
            <div className="bg-lime rounded-[.5rem] w-[2.2rem] h-[2.2rem] flex items-center justify-center t-btn">{it.pill}</div>
            <div className="bg-lime rounded-[.5rem] w-[2.2rem] h-[2.2rem] flex items-center justify-center"><img src={cdn('ln-icon-crossed-flags2.svg')} alt="" className="w-[1.2rem]" /></div>
          </div>
        )}
      </div>
    );
  };

  return (
    <section ref={wrap} className="relative overflow-clip" style={{ backgroundColor: from, color: captionFrom }}>
      <Contours className="absolute inset-0 opacity-40 text-current" />
      <div ref={track} className="flex flex-none h-[calc(var(--vh)*100)] pl-[75vw] pr-[var(--gap)] pt-[calc(var(--vh)*7)] pb-[calc(var(--gap)*2)] will-change-transform max-[991px]:flex-col max-[991px]:h-auto max-[991px]:pl-[var(--gap)] max-[991px]:gap-[5rem]">
        {items.map((entry, i) => {
          if (entry.spacer) return <div key={i} className="flex-none max-[991px]:hidden" style={{ width: `calc(var(--grid-spacer) * ${entry.spacer})` }} />;
          return (
            <div key={i} className={`flex flex-col flex-none h-full items-start ${entry.flip ? 'justify-end' : 'justify-between'} max-[991px]:h-auto max-[991px]:gap-[3rem]`}>
              {entry.col.map(renderItem)}
            </div>
          );
        })}
      </div>
    </section>
  );
}
