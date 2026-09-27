// The fictional driver's identity assets, all plain SVG (no fonts to license: system font stacks only),
// written to public/assets/identity/, plus src/data/replacements.js, which tells src/lib/assets.js
// which original file each one stands in for. Logos keep the originals' viewBox height and colour so
// the layout (marquee heights, nav mark size) is untouched.
// Usage: node scripts/make-identity.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
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

writeFileSync('src/data/replacements.js', `// Original file name -> our stand-in, for the identity assets (generated by scripts/make-identity.mjs).\nexport default ${JSON.stringify(files, null, 2)};\n`);
console.log('wrote', Object.keys(files).length, 'replacements to', OUT);
