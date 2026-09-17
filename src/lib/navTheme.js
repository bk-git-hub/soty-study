import { useEffect } from 'react';
import { ScrollTrigger } from './gsap';

/**
 * Sections declare which nav color they need ("light" = white nav on dark bg, "dark" = dark nav on light bg).
 * We mirror the original's data-nav-theme-target approach with one ScrollTrigger per section:
 * when a section's top crosses the nav line the <html> dataset flips and CSS does the color swap.
 */
export function useNavTheme(ref, theme) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = (t) => { document.documentElement.dataset.navTheme = t; };
    const st = ScrollTrigger.create({
      trigger: el,
      // px/% only: ScrollTrigger does not parse rem in start/end strings
      start: 'top 48px',
      end: 'bottom 48px',
      onEnter: () => set(theme),
      onEnterBack: () => set(theme),
    });
    return () => st.kill();
  }, [ref, theme]);
}
