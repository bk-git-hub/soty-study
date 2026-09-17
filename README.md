# SOTY Study

Study recreation of [landonorris.com](https://landonorris.com) by [OFF+BRAND](https://itsoffbrand.com) (Awwwards Site of the Year 2026).
Not affiliated with or endorsed by the original authors. Rebuilt from observation only; no original code or media is included in this repository.

## Stack
Vite · React · Tailwind v4 · GSAP (ScrollTrigger, SplitText) · Lenis · react-three-fiber / three · Rive

## Run
```bash
npm install
npm run dev
```
The public build uses self-made / openly licensed assets under `public/assets` and `public/fonts` (Mona Sans, SIL OFL).

## Structure
- `src/pages` — one component per route (home, on-track, off-track, calendar, 404)
- `src/sections` — page sections (hero, marquee, impact statement, horizontal gallery, helmets, store, partners, socials)
- `src/components` — nav, menu, footer, buttons, Rive wrapper, marquee, results table, track visualiser
- `src/gl` — WebGL: depth-parallax portrait + ghost helmet (hero), spinning helmet, HDR environment
- `src/lib` — GSAP registration, Lenis, nav theme, asset resolver
- `scripts` — Playwright capture of reference and local builds for side-by-side comparison
