// The hero's portrait as the placeholder character: the four maps the portrait shader reads, all in the
// same framing as the original photo so the head sits inside the helmet (hair top at 20 % of the
// height, chin at ~71 %, centred), rendered from one SVG:
//   diffuse  colour, on the photo's grey backdrop
//   alpha    the silhouette (white = character)
//   depth    a soft relief (white = near): the shader pushes vertices toward the camera by it and shifts
//            the uv against the pointer, so it only needs to be smooth, not exact
//   shadow   the diffuse with the helmet's shadow on neck and collar (shown where the helmet is painted on)
// Usage: node scripts/make-hero-portrait.mjs   -> public/assets/hero/*.webp
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { C, face, hairBack, hairFront } from './make-characters.mjs';

const S = 2048;
// character space -> image: hair top (y = -1068) at 20 % of the height, head centre on the middle line
const K = 2.6, TX = S / 2, TY = 0.2 * S + 1068 * K;
const head = (sp) => `<g transform="translate(${TX} ${TY}) scale(${K})">${hairBack(0)}<rect x="-50" y="-720" width="100" height="130" fill="${C.skinShade}"/><ellipse cx="0" cy="-822" rx="146" ry="152" fill="${C.skin}"/>${face(0, sp)}${hairFront(0, 'front', true)}</g>`;
// the bust in image pixels: a high collar around the neck, shoulders sloping out to the frame edges
const BUST = `M${0.33 * S} ${S}L${0.02 * S} ${S}Q${0.06 * S} ${0.83 * S} ${0.3 * S} ${0.78 * S}Q${0.33 * S} ${0.76 * S} ${0.35 * S} ${0.71 * S}Q${0.5 * S} ${0.66 * S} ${0.65 * S} ${0.71 * S}Q${0.67 * S} ${0.76 * S} ${0.7 * S} ${0.78 * S}Q${0.94 * S} ${0.83 * S} ${0.98 * S} ${S}Z`;
const swirl = (() => { // our contour motif on the sweater
  let d = '';
  for (let i = 0; i < 7; i++) {
    const y = 0.7 * S + i * 0.05 * S, a = (i % 2 ? 1 : -1) * 0.03 * S;
    d += `M${0.05 * S} ${y}q${0.12 * S} ${a} ${0.22 * S} 0t${0.22 * S} 0t${0.22 * S} 0t${0.22 * S} 0`;
  }
  return `<clipPath id="bust"><path d="${BUST}"/></clipPath><g clip-path="url(#bust)"><path d="${d}" stroke="#b9bcaf" stroke-width="${0.018 * S}" fill="none" opacity=".85"/></g>`;
})();
const bust = `<path d="${BUST}" fill="${C.dark}"/>${swirl}<path d="M${0.5 * S} ${0.7 * S}V${S}" stroke="#9a9d93" stroke-width="10"/><circle cx="${0.5 * S}" cy="${0.95 * S}" r="22" fill="none" stroke="#c9ccc0" stroke-width="8"/>`;
const character = (sp) => `${head(sp)}${bust}`;
const svg = (body, bg, defs = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}"><defs>${defs}</defs><rect width="${S}" height="${S}" fill="${bg}"/>${body}</svg>`;
const SP = { face: 'neutral' };

// every opaque pixel -> one flat grey (used for the silhouette and the depth base)
const flat = (id, v) => `<filter id="${id}"><feColorMatrix values="0 0 0 0 ${v}  0 0 0 0 ${v}  0 0 0 0 ${v}  0 0 0 1 0"/></filter>`;

const diffuse = svg(character(SP), '#474747');
const alpha = svg(`<g filter="url(#w)">${character(SP)}</g>`, '#000', flat('w', 1));
// depth: body at mid grey, the face rounded towards the viewer (brightest at the nose), all blurred
const depth = svg(
  `<g filter="url(#blur)"><g filter="url(#g)">${character(SP)}</g><ellipse cx="${TX}" cy="${TY - 800 * K}" rx="${150 * K}" ry="${170 * K}" fill="url(#face)"/></g>`,
  '#000',
  `${flat('g', 0.42)}<radialGradient id="face" cx=".5" cy=".6" r=".5"><stop offset="0" stop-color="#e6e6e6"/><stop offset=".7" stop-color="#9a9a9a"/><stop offset="1" stop-color="#9a9a9a" stop-opacity="0"/></radialGradient><filter id="blur"><feGaussianBlur stdDeviation="28"/></filter>`,
);
// shadow: the helmet darkens the neck and the top of the collar
const shadow = svg(
  `${character(SP)}<g clip-path="url(#sil)"><rect x="0" y="${0.6 * S}" width="${S}" height="${0.3 * S}" fill="url(#sh)"/></g>`,
  '#474747',
  `<clipPath id="sil"><path d="${BUST}"/><rect x="${TX - 50 * K}" y="${TY - 720 * K}" width="${100 * K}" height="${130 * K}"/></clipPath><linearGradient id="sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>`,
);

mkdirSync('public/assets/hero', { recursive: true });
const b = await chromium.launch({ channel: 'chromium' });
const page = await b.newPage();
for (const [name, src, size] of [['diffuse', diffuse, S], ['alpha', alpha, S], ['depth', depth, 512], ['shadow', shadow, S]]) {
  const url = await page.evaluate(async ({ src, size }) => {
    const img = new Image(); img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(src))); await img.decode();
    const c = document.createElement('canvas'); c.width = size; c.height = size; c.getContext('2d').drawImage(img, 0, 0, size, size);
    return c.toDataURL('image/webp', 0.92);
  }, { src, size });
  writeFileSync(`public/assets/hero/${name}.webp`, Buffer.from(url.split(',')[1], 'base64'));
}
await b.close();
console.log('wrote public/assets/hero/{diffuse,alpha,depth,shadow}.webp');
