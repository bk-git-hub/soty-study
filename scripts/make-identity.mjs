// The fictional driver's identity assets, all plain SVG (no fonts to license: system font stacks only),
// written to public/assets/identity/, plus src/data/replacements.js, which tells src/lib/assets.js
// which original file each one stands in for. Logos keep the originals' viewBox height and colour so
// the layout (marquee heights, nav mark size) is untouched.
// Usage: node scripts/make-identity.mjs
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { ID } from '../src/data/identity.js';
import { SIGNATURE_D, SIGNATURE_VIEWBOX } from '../src/data/signaturePath.js';

const OUT = 'public/assets/identity';
mkdirSync(OUT, { recursive: true });
const files = {}; // original cdn name -> our public path
const put = (name, svg, replaces) => {
  writeFileSync(`${OUT}/${name}`, svg);
  for (const r of [].concat(replaces)) files[r] = `/assets/identity/${name}`;
};
const svg = (w, h, body, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none"${extra}>${body}</svg>`;
const SANS = `Arial Black, 'Arial Bold', Arial, Helvetica, sans-serif`;
const SERIF = `Georgia, 'Times New Roman', serif`;

// monogram "J7": two heavy strokes, slanted forward like a racing number (same 31 x 34 box as the original)
put('mark.svg', svg(31, 34, `<g transform="skewX(-10) translate(4 0)" stroke="#D2FF00" stroke-width="5.2" stroke-linejoin="miter" stroke-linecap="square"><path d="M12 3V27H3V19"/><path d="M17 5H28L20 31"/></g>`), 'ln4-LN-logo-svg.svg');

// wordmark "JUNO RAYNE": light serif first name, heavy sans last name, as the original pairs them
put('wordmark.svg', svg(205, 22, `<text x="0" y="19" font-family="${SERIF}" font-size="22" textLength="80" lengthAdjust="spacingAndGlyphs" fill="#292C20">${ID.first.toUpperCase()}</text><text x="88" y="19" font-family="${SANS}" font-weight="900" font-size="21" textLength="117" lengthAdjust="spacingAndGlyphs" fill="#292C20">${ID.last.toUpperCase()}</text>`), 'ln4-lando-norris-text-mobile.svg');

// signature: static copies of the hand-drawn path for the quote cards
const sig = (col) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SIGNATURE_VIEWBOX}" width="400" height="160" fill="none"><path d="${SIGNATURE_D}" stroke="${col}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
put('signature-dark-green.svg', sig('#282C20'), 'ln4-signature-dark-green.webp');
put('signature-lime.svg', sig('#B2C73A'), 'ln4-hw-signature2.svg');

// the gold "JR1" badge (store): heavy slanted letters, gold gradient, dark edge
put('jr1.svg', svg(945, 354, `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7e39a"/><stop offset=".5" stop-color="#d9a92e"/><stop offset="1" stop-color="#9c6d12"/></linearGradient></defs><text x="472" y="270" text-anchor="middle" font-family="${SANS}" font-weight="900" font-style="italic" font-size="300" textLength="820" lengthAdjust="spacingAndGlyphs" fill="url(#g)" stroke="#5a3d08" stroke-width="10" paint-order="stroke">JR1</text>`), 'LN1.webp');

// merch: a black tee printed with the driver's name and number, and the gold "Champion" card
put('store-tee.svg', svg(378, 484, `<rect width="378" height="484" fill="#efefe9"/><path d="M129 70Q189 96 249 70L338 118L312 190L276 176V430H102V176L66 190L40 118Z" fill="#161616"/><text x="189" y="250" text-anchor="middle" font-family="${SANS}" font-weight="900" font-size="120" fill="#e0bb55">${ID.number}</text><text x="189" y="300" text-anchor="middle" font-family="${SANS}" font-weight="900" font-size="34" textLength="130" lengthAdjust="spacingAndGlyphs" fill="#e0bb55">${ID.last.toUpperCase()}</text>`), 'lando-store-gold-2.webp');
put('store-card.svg', svg(796, 574, `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3dc86"/><stop offset=".55" stop-color="#d4a73a"/><stop offset="1" stop-color="#b2842a"/></linearGradient></defs><rect width="796" height="574" fill="url(#g)"/><text x="398" y="300" text-anchor="middle" font-family="${SERIF}" font-style="italic" font-size="130" fill="#9a7120" opacity=".85">Champion</text><text x="398" y="350" text-anchor="middle" font-family="${SANS}" font-size="20" letter-spacing="8" fill="#6f5116">COLLECTION</text><g transform="translate(470 330) scale(.6)"><path d="${SIGNATURE_D}" stroke="#3b2a08" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></g>`), 'lando-store-gold-3.webp');

// partner and footer logos: made-up brands as plain wordmarks, in the originals' heights and colours
const brand = (name, text, w, h, col, replaces, opt = {}) => {
  const size = h * (opt.size || 0.42);
  const body = `<text x="${w / 2}" y="${h / 2 + size * 0.36}" text-anchor="middle" font-family="${opt.serif ? SERIF : SANS}" font-weight="${opt.serif ? 400 : 900}"${opt.italic ? ' font-style="italic"' : ''} font-size="${size}" textLength="${w * 0.86}" lengthAdjust="spacingAndGlyphs" fill="${col}">${text}</text>`;
  put(`brand-${name}.svg`, svg(w, h, body), replaces);
};
const P = '#111112', F = '#D2FF00';
brand('halden', 'HALDEN &amp; CO', 281, 83, P, 'ln4-ln4-collab-logo-ralph.svg', { serif: true });
brand('pixelcore', 'PIXELCORE', 200, 82, P, 'ln4-ln4-collab-logo-ps4.svg');
brand('quarto', 'QUARTO', 190, 82, P, 'ln4-ln4-collab-logo-quadrant.svg');
brand('traverse', 'TRAVERSE', 190, 82, P, 'ln4-ln4-collab-logo-tumi.svg');
brand('halcyon', 'Halcyon Hotels', 240, 82, P, 'ln4-ln4-collab-logo-hilton.svg', { serif: true, italic: true });
brand('rovr', 'ROVR', 150, 82, P, 'ln4-ln4-collab-logo-uber.svg');
brand('kart', `${ID.mark} KART`, 150, 82, P, 'ln4-ln4-collab-lnkart.svg');
brand('apex', 'APEX HELMETS', 220, 82, P, 'ln4-ln4-collab-bell-helmets.svg');
brand('wattly', 'wattly', 170, 82, P, 'ln4-ln4-collab-pure-electric.svg', { size: 0.5 });
brand('searchline', 'searchline', 210, 82, P, 'ln4-ln4-collab-google.svg', { size: 0.48 });
brand('orbital-f', 'ORBITAL', 110, 42, F, 'ln4-footer-logo-add-c.svg');
brand('searchline-f', 'searchline', 100, 42, F, 'ln4-footer-logo-google.svg', { size: 0.48 });
brand('halden-f', 'HALDEN &amp; CO', 140, 42, F, 'ln4-footer-logo-ralph-lauren.svg', { serif: true });
brand('nimbus-f', 'NIMBUS OS', 120, 42, F, 'ln4-footer-logo-android.svg');
brand('parcel-f', 'PARCEL', 90, 42, F, 'ln4-footer-logo-pap.svg');
brand('rush-f', 'RUSH ENERGY', 121, 42, F, 'ln4-footer-logo-monster.svg');
brand('halcyon-f', 'Halcyon', 110, 42, F, 'ln4-footer-logo-hilton.svg', { serif: true, italic: true });

// --- flags: flag-icons (MIT, node_modules/flag-icons), copied next to our assets --------------------
const FLAGS = {
  'Abu-Dabi': 'ae', Australia: 'au', Austria: 'at', Azerbaijan: 'az', Bahrain: 'bh', Belgium: 'be', Brazil: 'br',
  Canada: 'ca', China: 'cn', France: 'fr', Germany: 'de', Hungary: 'hu', Italy: 'it', Japan: 'jp', Mexico: 'mx',
  Monaco: 'mc', Netherlands: 'nl', Portugal: 'pt', Qatar: 'qa', Russia: 'ru', 'Saudi-Arabia': 'sa', Singapore: 'sg',
  Spain: 'es', 'Styria-state': 'at', Turkey: 'tr', UK: 'gb', USA: 'us',
};
mkdirSync('public/assets/flags', { recursive: true });
copyFileSync('node_modules/flag-icons/LICENSE', 'public/assets/flags/LICENSE.txt');
for (const [country, iso] of Object.entries(FLAGS)) {
  copyFileSync(`node_modules/flag-icons/flags/4x3/${iso}.svg`, `public/assets/flags/${iso}.svg`);
  for (const ext of ['svg', 'png']) files[`ln4-flag-${country}.${ext}`] = `/assets/flags/${iso}.svg`;
}

// --- trophies: four line-drawn cups in lime, one per race by a stable hash of its name --------------
const TROPHY_NAMES = ['silverstone', 'monaco', 'melbourne', 'yas-marina', 'singapore', 'miami', 'sakhir', 'baku', 'barcelona', 'montreal', 'shanghai', 'speilberg', 'mogyorod', 'spa-francorchamps', 'monza', 'suzuka', 'mexico-city', 'austin', 'imola', 'lusail', 'jeddah', 'zandvoort', 'las-vegas'];
const TROPHIES = [
  // classic cup with two handles
  '<path d="M20 12h24v10c0 8-5 14-12 14s-12-6-12-14Z"/><path d="M20 16h-6c0 7 3 11 8 12M44 16h6c0 7-3 11-8 12"/><path d="M32 36v8M24 44h16v6H24ZM20 50h24v4H20Z"/>',
  // tall goblet with a lid
  '<path d="M26 8h12M24 12h16l-2 16c-1 6-3 9-6 9s-5-3-6-9Z"/><path d="M32 37v9M27 46h10l2 5H25ZM23 51h18v4H23Z"/><circle cx="32" cy="6" r="2"/>',
  // twisted ribbon on a plinth
  '<path d="M36 6c-8 4-10 10-4 14s4 10-4 14 -6 10 2 12"/><path d="M40 6c-8 4-10 10-4 14s4 10-4 14-6 10 2 12"/><path d="M24 48h16v5H24ZM21 53h22v4H21Z"/>',
  // star on a column
  '<path d="M32 6l3.5 7 7.5 1-5.5 5 1.5 7.5L32 23l-7 3.5 1.5-7.5-5.5-5 7.5-1Z"/><path d="M29 27h6l1 19h-8Z"/><path d="M24 46h16v5H24ZM21 51h22v5H21Z"/>',
];
const hash = (t) => [...t].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
for (const n of TROPHY_NAMES) {
  put(`trophy-${n}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="#D2FF00" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">${TROPHIES[hash(n) % TROPHIES.length]}</svg>`, `${n}.svg`);
}
files['placeholder.60f9b1840c.svg'] = '/assets/placeholder.svg';

// --- card masks: the footer card (a tab on top, two small feet below) and the hall-of-fame card ------
put('mask-footer.svg', svg(1688, 896, `<path fill="#000" d="M40 56H690C716 56 726 20 760 20H928C962 20 972 56 998 56H1648Q1688 56 1688 96V800Q1688 840 1648 840H1560Q1540 840 1530 860Q1520 876 1500 876H1340Q1320 876 1310 860Q1300 840 1280 840H408Q388 840 378 860Q368 876 348 876H188Q168 876 158 860Q148 840 128 840H40Q0 840 0 800V96Q0 56 40 56Z"/>`), 'ln4-footer-mask-desktop.svg');
// same outline as the card frame drawn in Helmets.jsx (a rounded card with a notch at the bottom left)
put('mask-helmet-card.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 187 188" width="407" height="411" preserveAspectRatio="none"><path fill="#fff" d="M8 .5h170.12a7.5 7.5 0 0 1 7.5 7.5v154.61a7.5 7.5 0 0 1-7.5 7.5H60.681a10.5 10.5 0 0 0-8.21 3.954l-7.86 9.858a9.5 9.5 0 0 1-7.427 3.578H8A7.5 7.5 0 0 1 .5 180V8A7.5 7.5 0 0 1 8 .5Z"/></svg>`, 'ln4-2-helm-mask-fill.svg');

// --- crossed chequered flags icon ---------------------------------------------------------------------
const flagShape = (flip) => {
  const cells = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) if ((r + c) % 2 === 0) cells.push(`<rect x="${18 + c * 14}" y="${14 + r * 14 + Math.sin(c * 0.9) * 4}" width="14" height="14"/>`);
  return `<g transform="${flip ? 'translate(300 0) scale(-1 1)' : ''} rotate(-12 60 70)"><path d="M10 128L40 10" stroke="#B9BBAD" stroke-width="6" stroke-linecap="round"/><path d="M18 14Q60 2 102 14T102 70Q60 58 18 70Z" fill="none" stroke="#B9BBAD" stroke-width="3"/><g fill="#B9BBAD" opacity=".8">${cells.join('')}</g></g>`;
};
put('icon-crossed-flags.svg', svg(300, 136, flagShape(false) + flagShape(true)), 'ln-icon-crossed-flags2.svg');

// --- a transparent 1 px image (the hover reveal's background) -----------------------------------------
put('transparent.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"/>`, 'transp.webp');

// --- decorative contour blobs (menu and footer): iso-lines of our noise field, marching squares -------
// For each grid cell the corners are above or below a threshold; the 16 combinations say where a line
// crosses the cell, and the crossing point on each edge is found by linear interpolation.
function contourSvg(w, h, seed, levels, col, sw) {
  const perm = new Uint8Array(512); let st = seed >>> 0;
  const rnd = () => { st = (st + 0x6d2b79f5) >>> 0; let t = st; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pp = Array.from({ length: 256 }, (_, i) => i); for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pp[i], pp[j]] = [pp[j], pp[i]]; } for (let i = 0; i < 512; i++) perm[i] = pp[i & 255];
  const G = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]], F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  const noise = (x, y) => { const s0 = (x + y) * F2, i = Math.floor(x + s0), j = Math.floor(y + s0), t0 = (i + j) * G2, x0 = x - (i - t0), y0 = y - (j - t0), i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1; const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2, ii = i & 255, jj = j & 255; const k = (xx, yy, g) => { let q = 0.5 - xx * xx - yy * yy; if (q < 0) return 0; q *= q; return q * q * (g[0] * xx + g[1] * yy); }; return 70 * (k(x0, y0, G[perm[ii + perm[jj]] & 7]) + k(x1, y1, G[perm[ii + i1 + perm[jj + j1]] & 7]) + k(x2, y2, G[perm[ii + 1 + perm[jj + 1]] & 7])); };
  const N = 90, M = Math.round(N * h / w), val = [];
  for (let y = 0; y <= M; y++) for (let x = 0; x <= N; x++) { const u = x / N * 2.2, v = y / M * 2.2 * h / w; const warp = noise(u * 0.6 + 7, v * 0.6 + 3); val.push(noise(u + warp * 0.5, v + warp * 0.5)); }
  const at = (x, y) => val[y * (N + 1) + x], cw = w / N, ch = h / M;
  let d = '';
  for (const L of levels) for (let y = 0; y < M; y++) for (let x = 0; x < N; x++) {
    const c = [at(x, y), at(x + 1, y), at(x + 1, y + 1), at(x, y + 1)], idx = (c[0] > L ? 8 : 0) | (c[1] > L ? 4 : 0) | (c[2] > L ? 2 : 0) | (c[3] > L ? 1 : 0);
    if (idx === 0 || idx === 15) continue;
    const e = (a, b, pa, pb) => { const t = (L - a) / (b - a); return [pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t]; };
    const P = [[x * cw, y * ch], [(x + 1) * cw, y * ch], [(x + 1) * cw, (y + 1) * ch], [x * cw, (y + 1) * ch]];
    const E = [e(c[0], c[1], P[0], P[1]), e(c[1], c[2], P[1], P[2]), e(c[3], c[2], P[3], P[2]), e(c[0], c[3], P[0], P[3])]; // top, right, bottom, left
    const segs = { 1: [[3, 2]], 2: [[2, 1]], 3: [[3, 1]], 4: [[0, 1]], 5: [[3, 0], [2, 1]], 6: [[0, 2]], 7: [[3, 0]], 8: [[3, 0]], 9: [[0, 2]], 10: [[0, 1], [3, 2]], 11: [[0, 1]], 12: [[3, 1]], 13: [[2, 1]], 14: [[3, 2]] }[idx];
    for (const [a, b] of segs) d += `M${E[a][0].toFixed(1)} ${E[a][1].toFixed(1)}L${E[b][0].toFixed(1)} ${E[b][1].toFixed(1)}`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" fill="none"><path d="${d}" stroke="${col}" stroke-width="${sw}" stroke-linecap="round"/></svg>`;
}
put('blobs-menu.svg', contourSvg(1880, 1500, 11, [-0.45, -0.15, 0.15, 0.45], '#ffffff', 2.5), 'blobs_nav.svg');
put('blobs-footer.svg', contourSvg(2400, 1500, 23, [-0.45, -0.15, 0.15, 0.45], '#ffffff', 2.5), 'blobs_footer_1.svg');

writeFileSync('src/data/replacements.js', `// Original file name -> our stand-in, for the identity assets (generated by scripts/make-identity.mjs).\nexport default ${JSON.stringify(files, null, 2)};\n`);
console.log('wrote', Object.keys(files).length, 'replacements to', OUT);
