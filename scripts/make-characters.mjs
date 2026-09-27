// Placeholder illustrations for every photo of a person on the site: one original cartoon character
// (not a likeness of anyone), drawn as SVG from code, posed per photo, rendered at the photo's size.
// Output: public/assets/characters/<original name>.webp; src/lib/assets.js serves them in place of the photos.
// Usage: node scripts/make-characters.mjs [onlyIndex...]
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';

// ---------------------------------------------------------------------------------------------------
// palette: the site's tokens plus a few character colours
const C = {
  skin: '#f3c9a4', skinShade: '#e0ab86', blush: '#ff8a7a', hair: '#1c1e19', mouth: '#5b2320',
  eye: '#2c6b45', dark: '#282c20', dark2: '#3b3c38', lime: '#d2ff00', limeOff: '#b2c73a',
  white: '#f4f4ed', black: '#111112', grey: '#8b8e84', gold: '#e8c24c', goldDark: '#b08a22',
};

// seeded random numbers (mulberry32), one stream per image so re-runs draw the same crowd / confetti
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const f = (n) => n.toFixed(1);

// ---------------------------------------------------------------------------------------------------
// The character lives in its own space: feet at y = 0, top of the hair at about y = -1000, x = 0 is
// the centre line. A chibi proportion (big head) reads as "cartoon" at thumbnail size.
const SHOULDER = 125, UPPER = 175, FORE = 165; // arm lengths

// Two-bone IK: from shoulder S, reach target T with an upper arm l1 and a forearm l2.
// The elbow sits where the two circles (radius l1 around S, l2 around T) meet; the law of cosines
// gives the angle at the shoulder. Of the two solutions we keep the one whose elbow points away from
// the body (larger |x|), unless `inward` asks for the other.
function ik(S, T, l1, l2, inward) {
  let dx = T[0] - S[0], dy = T[1] - S[1], d = Math.hypot(dx, dy);
  const max = l1 + l2 - 1;
  if (d > max) { dx *= max / d; dy *= max / d; d = max; } // out of reach: arm fully stretched towards T
  const a = Math.atan2(dy, dx);
  const b = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const e1 = [S[0] + l1 * Math.cos(a + b), S[1] + l1 * Math.sin(a + b)];
  const e2 = [S[0] + l1 * Math.cos(a - b), S[1] + l1 * Math.sin(a - b)];
  const out = Math.abs(e1[0]) > Math.abs(e2[0]) ? e1 : e2, inn = out === e1 ? e2 : e1;
  return { E: inward ? inn : out, H: [S[0] + dx, S[1] + dy] };
}
const seg = (a, b, col, w) => `<path d="M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;

// hand targets per pose (standing body space); `prop` says where a held object goes
const POSES = {
  stand: { A: [-170, -345], B: [170, -345] },
  armsUp: { A: [-250, -990], B: [250, -990] },
  pointUp: { A: [-170, -345], B: [215, -985], point: 'B' },
  cross: { A: [85, -515], B: [-85, -545] },
  wave: { A: [-170, -345], B: [295, -905], open: 'B' },
  holdChest: { A: [-50, -530], B: [50, -530], prop: 'mid' },
  holdSide: { A: [-170, -345], B: [255, -820], prop: 'B' },
  trophyUp: { A: [-85, -1015], B: [85, -1015], prop: 'mid', behind: true },
  swing: { A: [185, -925], B: [225, -905], prop: 'mid' },
  camera: { A: [-62, -800], B: [62, -800], prop: 'mid', inward: true },
  handOnHead: { A: [-170, -345], B: [80, -985] },
  fist: { A: [-170, -345], B: [335, -665] },
  paddle: { A: [-170, -345], B: [205, -560], prop: 'B' },
  lean: { A: [-80, -470], B: [80, -470], prop: 'low', inward: true },
  low: { A: [-170, -345], B: [185, -395], prop: 'B' },
  drive: { A: [-95, -575], B: [95, -575], prop: 'mid', inward: true },
  bowl: { A: [-65, -505], B: [75, -560], prop: 'mid', inward: true },
  pointHold: { A: [-40, -560], B: [215, -985], point: 'B', prop: 'A' }, // trophy in one hand, point with the other
};

// outfits: torso colour, sleeves (long / short / none), trousers, shoes, extra drawing on the torso
const OUTFITS = {
  suit: { body: C.dark, sleeve: 'long', pants: C.dark, shoes: C.black, stripe: C.lime, detail: 'suit' },
  suitWhite: { body: '#eeeee6', sleeve: 'long', pants: '#eeeee6', shoes: C.black, stripe: C.lime, detail: 'suit' },
  suitBlue: { body: '#23346e', sleeve: 'long', pants: '#23346e', shoes: C.black, stripe: C.lime, detail: 'suit' },
  tee: { body: C.white, sleeve: 'short', pants: C.dark2, shorts: true, shoes: C.white, detail: 'crew' },
  teeBlack: { body: C.black, sleeve: 'short', pants: '#2c2d2a', shoes: C.white, detail: 'crew' },
  teeGrey: { body: '#55584f', sleeve: 'short', pants: '#2c2d2a', shoes: C.white, detail: 'crew' },
  polo: { body: C.lime, sleeve: 'short', pants: C.dark, shorts: true, shoes: C.white, detail: 'polo' },
  poloDark: { body: '#1f2b3a', sleeve: 'short', pants: '#6d6f63', shorts: true, shoes: C.white, detail: 'polo' },
  hoodie: { body: '#c9ccc0', sleeve: 'long', pants: '#4d6a8c', shoes: C.white, detail: 'hoodie' },
  hoodieBlack: { body: '#1c1d1a', sleeve: 'long', pants: '#1c1d1a', shoes: C.black, detail: 'hoodie' },
  sweater: { body: '#e9e2cf', sleeve: 'long', pants: '#6f8fb0', shoes: C.white, detail: 'knit' },
  tux: { body: C.black, sleeve: 'long', pants: C.black, shoes: C.black, detail: 'tux' },
  jacket: { body: '#1a1b18', sleeve: 'long', pants: '#1a1b18', shoes: C.black, detail: 'zip' },
  flannel: { body: '#2b2d28', sleeve: 'long', pants: '#2c3a4f', shoes: C.white, detail: 'check' },
  tank: { body: '#9a9d93', sleeve: 'none', pants: C.dark2, shorts: true, shoes: C.white, detail: 'tank' },
  sport: { body: C.white, sleeve: 'long', pants: '#d8d8cf', shorts: true, shoes: C.white, detail: 'sport' },
  swirl: { body: '#3a3a36', sleeve: 'long', pants: C.dark, shoes: C.black, detail: 'swirl' },
};

// ---------------------------------------------------------------------------------------------------
function legs(sp, o, dy) {
  const shorts = o.shorts, w = 88;
  let L;
  if (sp.sit) L = [[[-60, -140], [-175, -165], [-185, -25]], [[60, -140], [175, -165], [185, -25]]];
  else if (sp.legs === 'walk') L = [[[-60, -390], [-90, -205], [-120, -25]], [[60, -390], [100, -215], [70, -75]]];
  else if (sp.legs === 'wide') L = [[[-60, -390], [-110, -200], [-150, -25]], [[60, -390], [110, -200], [150, -25]]];
  else L = [[[-58, -390], [-66, -205], [-74, -25]], [[58, -390], [66, -205], [74, -25]]];
  let s = '';
  for (const [hip, knee, foot] of L) {
    s += seg(hip, knee, o.pants, shorts ? w + 10 : w);
    s += seg(knee, foot, shorts ? C.skin : o.pants, shorts ? 62 : w - 6);
    if (o.stripe) { const ox = hip[0] < 0 ? -30 : 30; s += seg([hip[0] + ox, hip[1] + 20], [foot[0] + ox * 0.8, foot[1] - 30], o.stripe, 12); }
    const dir = foot[0] < 0 ? -1 : 1;
    s += `<ellipse cx="${f(foot[0] + dir * 14)}" cy="${f(foot[1] + 6)}" rx="62" ry="32" fill="${o.shoes}"/>`;
    s += `<path d="M${f(foot[0] + dir * 14 - 58)} ${f(foot[1] + 22)}h116" stroke="${o.shoes === C.white ? '#c9cbc0' : '#3a3b37'}" stroke-width="10" stroke-linecap="round"/>`;
  }
  return s;
}

function torso(o, dy) {
  const Y = (y) => f(y + dy);
  const body = `M-138 ${Y(-640)}Q-138 ${Y(-688)}-92 ${Y(-690)}L92 ${Y(-690)}Q138 ${Y(-688)} 138 ${Y(-640)}L118 ${Y(-382)}Q112 ${Y(-358)} 90 ${Y(-358)}L-90 ${Y(-358)}Q-112 ${Y(-358)}-118 ${Y(-382)}Z`;
  let s = `<rect x="-34" y="${Y(-712)}" width="68" height="44" fill="${C.skinShade}"/>`;
  s += `<path d="${body}" fill="${o.body}"/>`;
  const d = o.detail;
  if (d === 'suit') {
    s += `<path d="M-128 ${Y(-560)}L-112 ${Y(-380)}M128 ${Y(-560)}L112 ${Y(-380)}" stroke="${o.stripe}" stroke-width="18"/>`;
    s += `<path d="M-60 ${Y(-690)}Q0 ${Y(-650)} 60 ${Y(-690)}" stroke="${o.stripe}" stroke-width="16" fill="none"/>`;
    s += `<path d="M0 ${Y(-668)}V${Y(-370)}" stroke="#00000044" stroke-width="5"/>`;
    s += `<rect x="-95" y="${Y(-600)}" width="58" height="22" rx="4" fill="${o.stripe}"/><rect x="40" y="${Y(-560)}" width="52" height="20" rx="4" fill="#ffffff88"/>`;
    s += `<rect x="-90" y="${Y(-470)}" width="180" height="26" rx="6" fill="#00000030"/>`;
  } else if (d === 'crew') s += `<path d="M-44 ${Y(-690)}Q0 ${Y(-640)} 44 ${Y(-690)}" stroke="#00000033" stroke-width="10" fill="none"/>`;
  else if (d === 'polo') {
    s += `<path d="M-52 ${Y(-692)}L-8 ${Y(-640)}L-40 ${Y(-625)}ZM52 ${Y(-692)}L8 ${Y(-640)}L40 ${Y(-625)}Z" fill="#00000030"/>`;
    s += `<path d="M0 ${Y(-650)}V${Y(-590)}" stroke="#00000044" stroke-width="6"/><circle cx="0" cy="${Y(-612)}" r="5" fill="#00000055"/>`;
  } else if (d === 'hoodie') {
    s += `<path d="M-95 ${Y(-690)}Q0 ${Y(-610)} 95 ${Y(-690)}" stroke="#00000030" stroke-width="22" fill="none"/>`;
    s += `<path d="M-22 ${Y(-650)}v70M22 ${Y(-650)}v70" stroke="${C.white}" stroke-width="7" stroke-linecap="round"/>`;
    s += `<rect x="-75" y="${Y(-470)}" width="150" height="70" rx="18" fill="#00000022"/>`;
  } else if (d === 'knit') {
    for (let y = -660; y < -380; y += 34) s += `<path d="M-125 ${Y(y)}H125" stroke="#00000014" stroke-width="10"/>`;
  } else if (d === 'tux') {
    s += `<path d="M-40 ${Y(-690)}L0 ${Y(-520)}L40 ${Y(-690)}Z" fill="${C.white}"/>`;
    s += `<path d="M-26 ${Y(-676)}l26 12l26 -12v26l-26 -12l-26 12Z" fill="${C.black}"/>`;
    s += `<circle cx="0" cy="${Y(-470)}" r="6" fill="#444"/>`;
  } else if (d === 'zip') s += `<path d="M0 ${Y(-690)}V${Y(-360)}" stroke="#555" stroke-width="6"/><path d="M-60 ${Y(-690)}Q0 ${Y(-660)} 60 ${Y(-690)}" stroke="#333" stroke-width="14" fill="none"/>`;
  else if (d === 'check') {
    for (let x = -120; x <= 120; x += 48) s += `<path d="M${x} ${Y(-690)}V${Y(-360)}" stroke="#c9ccc0" stroke-width="14" opacity=".35"/>`;
    for (let y = -670; y < -370; y += 48) s += `<path d="M-135 ${Y(y)}H135" stroke="#c9ccc0" stroke-width="14" opacity=".35"/>`;
  } else if (d === 'tank') s += `<path d="M-50 ${Y(-690)}Q0 ${Y(-610)} 50 ${Y(-690)}" fill="${C.skin}"/>`;
  else if (d === 'sport') s += `<path d="M-120 ${Y(-560)}L120 ${Y(-500)}" stroke="${C.black}" stroke-width="16"/><path d="M60 ${Y(-640)}v200" stroke="${C.black}" stroke-width="6" opacity=".5"/>`;
  else if (d === 'swirl') {
    s += `<g opacity=".9" stroke="#cfd2c6" stroke-width="16" fill="none">`;
    s += `<path d="M-120 ${Y(-620)}q60 -40 110 10t110 -10M-125 ${Y(-540)}q70 40 120 -5t120 15M-118 ${Y(-455)}q60 -45 120 5t110 -20"/></g>`;
  }
  return s;
}

function arm(S, T, o, inward, hand) {
  const { E, H } = ik(S, T, UPPER, FORE, inward);
  const sleeve = o.sleeve, col = o.body;
  let s = '';
  if (sleeve === 'long') { s += seg(S, E, col, 66) + seg(E, H, col, 60); }
  else if (sleeve === 'short') {
    s += seg(S, E, C.skin, 52) + seg(E, H, C.skin, 50);
    const mid = [S[0] + (E[0] - S[0]) * 0.55, S[1] + (E[1] - S[1]) * 0.55];
    s += seg(S, mid, col, 70);
  } else s += seg(S, E, C.skin, 52) + seg(E, H, C.skin, 50);
  if (sleeve === 'long') { // cuff
    const k = 0.86, c = [E[0] + (H[0] - E[0]) * k, E[1] + (H[1] - E[1]) * k];
    s += seg(c, c, o.detail === 'suit' ? o.stripe : '#00000030', 62);
  }
  s += `<circle cx="${f(H[0])}" cy="${f(H[1])}" r="${hand === 'open' ? 36 : 31}" fill="${C.skin}"/>`;
  if (hand === 'point') s += seg(H, [H[0] + 6, H[1] - 62], C.skin, 20);
  if (hand === 'open') for (const a of [-50, -20, 10, 40]) { const r = (a - 90) * Math.PI / 180; s += seg(H, [H[0] + Math.cos(r) * 58, H[1] + Math.sin(r) * 58], C.skin, 16); }
  return { s, H };
}

// --- head --------------------------------------------------------------------------------------------
function hairBack(dy) { return `<ellipse cx="0" cy="${f(-855 + dy)}" rx="162" ry="150" fill="${C.hair}"/>`; }
function hairFront(dy, view, hat) {
  const Y = (y) => f(y + dy);
  if (view === 'back') return `<ellipse cx="0" cy="${Y(-840)}" rx="150" ry="158" fill="${C.hair}"/><path d="M-40 ${Y(-700)}l20 -40l20 40l20 -40l20 40" fill="${C.hair}"/>`;
  if (view === 'side') {
    let s = `<path d="M-150 ${Y(-800)}C-170 ${Y(-960)}-40 ${Y(-1010)} 40 ${Y(-990)}C110 ${Y(-980)} 160 ${Y(-930)} 150 ${Y(-860)}L120 ${Y(-890)}L112 ${Y(-850)}L80 ${Y(-895)}L55 ${Y(-855)}L20 ${Y(-890)}L-20 ${Y(-840)}L-55 ${Y(-760)}L-100 ${Y(-700)}L-155 ${Y(-730)}Z" fill="${C.hair}"/>`;
    s += `<path d="M70 ${Y(-985)}L115 ${Y(-900)}L92 ${Y(-975)}Z" fill="${C.lime}"/>`;
    if (!hat) s += `<path d="M20 ${Y(-990)}C50 ${Y(-1065)} 100 ${Y(-1045)} 82 ${Y(-1012)}" stroke="${C.hair}" stroke-width="15" fill="none" stroke-linecap="round"/>`;
    return s;
  }
  let s = `<path d="M-152 ${Y(-835)}C-162 ${Y(-965)}-60 ${Y(-1005)} 10 ${Y(-990)}C100 ${Y(-1005)} 168 ${Y(-945)} 152 ${Y(-835)}L132 ${Y(-880)}L108 ${Y(-848)}L84 ${Y(-896)}L48 ${Y(-858)}L16 ${Y(-902)}L-18 ${Y(-860)}L-54 ${Y(-900)}L-90 ${Y(-856)}L-116 ${Y(-892)}L-136 ${Y(-845)}Z" fill="${C.hair}"/>`;
  s += `<path d="M44 ${Y(-982)}L88 ${Y(-893)}L66 ${Y(-972)}Z" fill="${C.lime}"/>`; // the character's lime streak
  if (!hat) s += `<path d="M10 ${Y(-990)}C40 ${Y(-1068)} 95 ${Y(-1048)} 75 ${Y(-1014)}" stroke="${C.hair}" stroke-width="15" fill="none" stroke-linecap="round"/>`; // cowlick
  return s;
}
function face(dy, sp) {
  const Y = (y) => y + dy;
  const view = sp.view || 'front', expr = sp.face || 'smile', up = sp.look === 'up' ? -16 : 0;
  let s = '';
  if (view === 'back') return s;
  if (view === 'side') {
    s += `<path d="M138 ${f(Y(-810))}L168 ${f(Y(-782))}L138 ${f(Y(-770))}Z" fill="${C.skin}"/>`;
    s += `<circle cx="-5" cy="${f(Y(-800))}" r="28" fill="${C.skinShade}"/>`;
    s += `<ellipse cx="78" cy="${f(Y(-812 + up))}" rx="20" ry="30" fill="${C.black}"/><circle cx="84" cy="${f(Y(-822 + up))}" r="7" fill="#fff"/>`;
    s += `<path d="M55 ${f(Y(-862 + up))}q30 -14 55 0" stroke="${C.hair}" stroke-width="10" fill="none" stroke-linecap="round"/>`;
    if (expr === 'grin' || expr === 'shout') s += `<path d="M85 ${f(Y(-752))}q35 30 58 -4z" fill="${C.mouth}"/>`;
    else s += `<path d="M92 ${f(Y(-748))}q25 14 45 -6" stroke="${C.mouth}" stroke-width="8" fill="none" stroke-linecap="round"/>`;
    s += `<ellipse cx="80" cy="${f(Y(-770))}" rx="24" ry="13" fill="${C.blush}" opacity=".35"/>`;
    return s;
  }
  for (const side of [-1, 1]) { // ears
    s += `<ellipse cx="${side * 146}" cy="${f(Y(-800))}" rx="24" ry="34" fill="${C.skinShade}"/>`;
  }
  for (const side of [-1, 1]) {
    const x = side * 56, y = Y(-805 + up);
    if (expr === 'wink' && side === -1) { s += `<path d="M${x - 28} ${f(y)}q28 -22 56 0" stroke="${C.black}" stroke-width="10" fill="none" stroke-linecap="round"/>`; continue; }
    s += `<ellipse cx="${x}" cy="${f(y)}" rx="31" ry="40" fill="#fff"/>`;
    s += `<ellipse cx="${x + side * 2}" cy="${f(y + 4 + up * 0.4)}" rx="23" ry="32" fill="${C.eye}"/>`;
    s += `<circle cx="${x + side * 2}" cy="${f(y + 6 + up * 0.4)}" r="12" fill="${C.black}"/>`;
    s += `<circle cx="${x - 8}" cy="${f(y - 8 + up * 0.4)}" r="8" fill="#fff"/>`;
    s += `<path d="M${x - 32} ${f(y - 26)}q32 -22 64 0" stroke="${C.black}" stroke-width="7" fill="none" stroke-linecap="round"/>`; // upper lash line
    s += `<path d="M${x - 26} ${f(Y(-868 + up))}q${side === -1 ? '26 -16 52 -4' : '26 -12 52 4'}" stroke="${C.hair}" stroke-width="11" fill="none" stroke-linecap="round"/>`;
  }
  s += `<path d="M-4 ${f(Y(-770))}l6 10" stroke="${C.skinShade}" stroke-width="6" stroke-linecap="round"/>`;
  for (const side of [-1, 1]) s += `<ellipse cx="${side * 92}" cy="${f(Y(-758))}" rx="26" ry="14" fill="${C.blush}" opacity=".35"/>`;
  const my = Y(-728);
  if (expr === 'grin' || expr === 'wink') s += `<path d="M-48 ${f(my - 12)}Q0 ${f(my + 52)} 48 ${f(my - 12)}Z" fill="${C.mouth}"/><path d="M-40 ${f(my - 9)}H40l-6 12H-34Z" fill="#fff"/>`;
  else if (expr === 'shout') s += `<ellipse cx="0" cy="${f(my + 4)}" rx="30" ry="38" fill="${C.mouth}"/><ellipse cx="0" cy="${f(my + 24)}" rx="18" ry="11" fill="#e0706a"/>`;
  else if (expr === 'neutral') s += `<path d="M-22 ${f(my)}h44" stroke="${C.mouth}" stroke-width="8" stroke-linecap="round"/>`;
  else s += `<path d="M-40 ${f(my - 8)}Q0 ${f(my + 26)} 40 ${f(my - 8)}" stroke="${C.mouth}" stroke-width="9" fill="none" stroke-linecap="round"/>`;
  return s;
}
function hat(dy, sp) {
  const Y = (y) => f(y + dy), k = sp.hat, col = sp.hatColor || C.black;
  if (!k) return '';
  const dome = `M-160 ${Y(-862)}C-156 ${Y(-1020)} 156 ${Y(-1020)} 160 ${Y(-862)}Z`;
  if (sp.view === 'side') {
    if (k === 'cap') return `<path d="${dome}" fill="${col}"/><path d="M110 ${Y(-872)}Q220 ${Y(-880)} 250 ${Y(-850)}Q180 ${Y(-842)} 110 ${Y(-850)}Z" fill="${col}"/><path d="M-160 ${Y(-862)}H160" stroke="#00000044" stroke-width="10"/>`;
    if (k === 'capBack') return `<path d="${dome}" fill="${col}"/><path d="M-110 ${Y(-872)}Q-220 ${Y(-880)}-250 ${Y(-850)}Q-180 ${Y(-842)}-110 ${Y(-850)}Z" fill="${col}"/>`;
  }
  if (k === 'cap') return `<path d="${dome}" fill="${col}"/><ellipse cx="0" cy="${Y(-862)}" rx="178" ry="32" fill="${col}"/><ellipse cx="0" cy="${Y(-868)}" rx="178" ry="18" fill="#ffffff18"/><circle cx="0" cy="${Y(-1002)}" r="12" fill="${col}"/><rect x="-40" y="${Y(-960)}" width="80" height="38" rx="8" fill="${C.lime}"/>`;
  if (k === 'capBack') return `<path d="${dome}" fill="${col}"/><path d="M-48 ${Y(-862)}Q0 ${Y(-940)} 48 ${Y(-862)}Z" fill="${C.hair}"/><path d="M-48 ${Y(-864)}Q0 ${Y(-942)} 48 ${Y(-864)}" stroke="${col}" stroke-width="10" fill="none"/><circle cx="0" cy="${Y(-1004)}" r="12" fill="${col}"/>`;
  if (k === 'beanie') return `<path d="M-162 ${Y(-860)}C-160 ${Y(-1060)} 160 ${Y(-1060)} 162 ${Y(-860)}Z" fill="${col}"/><rect x="-166" y="${Y(-900)}" width="332" height="52" rx="16" fill="${col}"/>` + Array.from({ length: 9 }, (_, i) => `<path d="M${-140 + i * 35} ${Y(-895)}v42" stroke="#ffffff14" stroke-width="10"/>`).join('');
  if (k === 'bucket') return `<path d="M-150 ${Y(-872)}C-146 ${Y(-1010)} 146 ${Y(-1010)} 150 ${Y(-872)}Z" fill="${col}"/><path d="M-230 ${Y(-835)}Q0 ${Y(-910)} 230 ${Y(-835)}Q0 ${Y(-870)}-230 ${Y(-835)}Z" fill="${col}"/>`;
  return '';
}
// a helmet in our own livery: dark shell, lime swooshes, black visor with a lime strip
function helmetShape(cx, cy, r, view, variant, hc = [C.dark, C.lime]) {
  const id = `h${Math.round(cx)}_${Math.round(cy)}_${Math.round(r)}`;
  let s = `<clipPath id="${id}"><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"/></clipPath>`;
  if (variant === 'disco') {
    s += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="#b9bdc4"/><g clip-path="url(#${id})">`;
    for (let x = -r; x < r; x += r / 6) for (let y = -r; y < r; y += r / 6) s += `<rect x="${f(cx + x + 2)}" y="${f(cy + y + 2)}" width="${f(r / 6 - 4)}" height="${f(r / 6 - 4)}" fill="${(x * 7 + y * 3) % 5 > 2 ? '#eef1f6' : '#8e939c'}"/>`;
    s += `</g>`;
  } else {
    s += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${hc[0]}"/><g clip-path="url(#${id})" fill="${hc[1]}">`;
    s += `<path d="M${f(cx - r)} ${f(cy - r * 0.2)}q${f(r * 0.6)} ${f(-r * 0.7)} ${f(r * 1.1)} ${f(-r * 0.35)}t${f(r * 1.1)} ${f(-r * 0.4)}v${f(r * 0.25)}q${f(-r * 0.5)} ${f(r * 0.1)} ${f(-r * 1.0)} ${f(r * 0.4)}t${f(-r * 1.2)} ${f(r * 0.3)}Z"/>`;
    s += `<circle cx="${f(cx - r * 0.55)}" cy="${f(cy + r * 0.62)}" r="${f(r * 0.28)}"/><circle cx="${f(cx + r * 0.62)}" cy="${f(cy + r * 0.55)}" r="${f(r * 0.2)}"/></g>`;
  }
  const vx = view === 'side' ? cx - r * 0.1 : cx - r * 0.8, vw = view === 'side' ? r * 1.05 : r * 1.6;
  s += `<rect x="${f(vx)}" y="${f(cy - r * 0.22)}" width="${f(vw)}" height="${f(r * 0.5)}" rx="${f(r * 0.2)}" fill="${C.black}"/>`;
  s += `<rect x="${f(vx + r * 0.08)}" y="${f(cy - r * 0.34)}" width="${f(vw - r * 0.16)}" height="${f(r * 0.11)}" rx="${f(r * 0.05)}" fill="${hc[1]}"/>`;
  s += `<path d="M${f(vx + vw * 0.15)} ${f(cy - r * 0.1)}l${f(vw * 0.18)} 0" stroke="#ffffff55" stroke-width="${f(r * 0.06)}" stroke-linecap="round"/>`;
  return s;
}

// --- props -------------------------------------------------------------------------------------------
const PROPS = {
  trophy: ([x, y], _sp, k = 1) => `<g transform="translate(${f(x)} ${f(y)}) scale(${k})"><path d="M-70 -190H70Q70 -60 0 -40Q-70 -60 -70 -190Z" fill="${C.gold}"/><path d="M-70 -170q-50 0 -40 50q10 30 45 30M70 -170q50 0 40 50q-10 30 -45 30" stroke="${C.gold}" stroke-width="14" fill="none"/><rect x="-12" y="-44" width="24" height="54" fill="${C.goldDark}"/><rect x="-55" y="8" width="110" height="34" rx="6" fill="${C.dark2}"/><path d="M-40 -170q20 50 -5 110" stroke="#fff6" stroke-width="12" fill="none"/></g>`,
  bigTrophy: (p) => PROPS.trophy(p, null, 1.9),
  camera: ([x, y]) => `<rect x="${x - 78}" y="${y - 50}" width="156" height="96" rx="16" fill="#26272a"/><circle cx="${x}" cy="${y - 2}" r="36" fill="#55585e"/><circle cx="${x}" cy="${y - 2}" r="20" fill="#16171a"/><circle cx="${x + 8}" cy="${y - 10}" r="6" fill="#fff8"/><rect x="${x + 36}" y="${y - 64}" width="30" height="16" rx="4" fill="#26272a"/>`,
  paddle: ([x, y]) => `<path d="M${x} ${y}L${x + 55} ${y - 95}" stroke="#222" stroke-width="26" stroke-linecap="round"/><circle cx="${x + 90}" cy="${y - 175}" r="92" fill="${C.dark}"/><circle cx="${x + 90}" cy="${y - 175}" r="92" fill="none" stroke="${C.lime}" stroke-width="12"/>` + Array.from({ length: 9 }, (_, i) => `<circle cx="${x + 60 + (i % 3) * 30}" cy="${y - 205 + Math.floor(i / 3) * 30}" r="7" fill="#0006"/>`).join(''),
  club: ([x, y]) => `<path d="M${x} ${y}L${x - 430} ${y - 110}" stroke="#9aa0a6" stroke-width="12" stroke-linecap="round"/><path d="M${x - 430} ${y - 110}l-40 20l10 30l45 -25z" fill="#2a2b2e"/><path d="M${x} ${y}l-40 -10" stroke="#222" stroke-width="22" stroke-linecap="round"/>`,
  clubDown: ([x, y]) => `<path d="M${x} ${y}L${x + 260} ${y + 330}" stroke="#9aa0a6" stroke-width="12" stroke-linecap="round"/><path d="M${x + 260} ${y + 330}l50 5l-5 30l-50 -8z" fill="#2a2b2e"/>`,
  helmet: ([x, y], sp) => helmetShape(x, y - 20, 150, 'front', sp.hv, sp.hc),
  helmetLow: ([x, y], sp) => helmetShape(x, y + 90, 170, 'front', sp.hv, sp.hc),
  disco: ([x, y]) => helmetShape(x, y - 40, 185, 'front', 'disco'),
  sign: ([x, y]) => `<g transform="translate(${x} ${y - 60}) rotate(-8)"><rect x="-110" y="-150" width="220" height="280" rx="8" fill="#fbfbf5"/><path d="M-70 -110h80M-70 -80h120" stroke="${C.dark}" stroke-width="12" stroke-linecap="round"/><circle cx="-20" cy="10" r="34" fill="none" stroke="${C.lime}" stroke-width="12"/><path d="M-20 44v50M-50 70h60M40 -20l30 60l-60 0z" stroke="${C.dark}" stroke-width="10" fill="${C.lime}"/></g>`,
  dog: ([x, y]) => `<ellipse cx="${x}" cy="${y + 20}" rx="120" ry="70" fill="#e8d2b0"/><circle cx="${x + 70}" cy="${y - 60}" r="62" fill="#e8d2b0"/><path d="M${x + 25} ${y - 105}l-15 -70l55 45zM${x + 115} ${y - 105}l15 -70l-55 45z" fill="#6b4a2f"/><ellipse cx="${x + 90}" cy="${y - 55}" rx="22" ry="30" fill="#6b4a2f"/><circle cx="${x + 50}" cy="${y - 70}" r="8" fill="#111"/><circle cx="${x + 95}" cy="${y - 70}" r="8" fill="#111"/><ellipse cx="${x + 75}" cy="${y - 38}" rx="12" ry="8" fill="#111"/>`,
  bottle: ([x, y]) => `<g transform="translate(${x} ${y}) rotate(-25)"><rect x="-28" y="-150" width="56" height="170" rx="18" fill="#1f4a2c"/><rect x="-12" y="-215" width="24" height="75" rx="6" fill="#1f4a2c"/><rect x="-28" y="-110" width="56" height="50" fill="${C.gold}"/></g>` + Array.from({ length: 14 }, (_, i) => `<circle cx="${x - 60 + (i % 5) * 45 - i * 6}" cy="${y - 260 - Math.floor(i / 5) * 60 - (i % 3) * 20}" r="${10 + (i % 3) * 5}" fill="#ffffffaa"/>`).join(''),
  bowl: ([x, y]) => `<path d="M${x - 110} ${y}Q${x} ${y + 150} ${x + 110} ${y}Z" fill="#c8453a"/><ellipse cx="${x}" cy="${y}" rx="110" ry="24" fill="#e7a24a"/><circle cx="${x - 30}" cy="${y - 8}" r="14" fill="#6aa84f"/><circle cx="${x + 25}" cy="${y - 4}" r="12" fill="#f3d36b"/>`,
  suitcase: ([x, y]) => `<rect x="${x - 70}" y="${y + 30}" width="140" height="240" rx="20" fill="#2b2d31"/><path d="M${x - 30} ${y + 30}v-40h60v40" stroke="#555" stroke-width="12" fill="none"/><path d="M${x - 70} ${y + 110}h140" stroke="#444" stroke-width="8"/>`,
  wheel: ([x, y]) => `<circle cx="${x}" cy="${y}" r="120" fill="none" stroke="#1a1a1a" stroke-width="30"/><path d="M${x - 110} ${y}h220M${x} ${y}v110" stroke="#1a1a1a" stroke-width="24"/>`,
};

// --- the whole character -------------------------------------------------------------------------------
function character(sp) {
  const dy = sp.sit ? 250 : 0;
  const pose = POSES[sp.pose || 'stand'];
  const o = OUTFITS[sp.outfit || 'tee'];
  const view = sp.view || 'front';
  const up = (p) => [p[0], p[1] + dy];
  const SA = [-SHOULDER, -650 + dy], SB = [SHOULDER, -650 + dy];
  const armA = arm(SA, up(pose.A), o, pose.inward, pose.point === 'A' ? 'point' : pose.open === 'A' ? 'open' : null);
  const armB = arm(SB, up(pose.B), o, pose.inward, pose.point === 'B' ? 'point' : pose.open === 'B' ? 'open' : null);
  const propAt = sp.propAt ? sp.propAt : pose.prop === 'mid' ? [(armA.H[0] + armB.H[0]) / 2, (armA.H[1] + armB.H[1]) / 2]
    : pose.prop === 'A' ? armA.H : pose.prop === 'low' ? [0, -420 + dy] : armB.H;
  let s = '';
  if (!sp.helmet) s += hairBack(dy);
  s += legs(sp, o, dy);
  if (sp.bag) s += `<rect x="-150" y="${-660 + dy}" width="300" height="300" rx="50" fill="#2f3a2a"/>`;
  s += torso(o, dy);
  if (sp.bag) s += seg([-90, -690 + dy], [-110, -420 + dy], '#20271c', 22) + seg([90, -690 + dy], [110, -420 + dy], '#20271c', 22);
  if (pose.behind) s += armA.s + armB.s;
  if (sp.helmet) s += helmetShape(view === 'side' ? 10 : 0, -840 + dy, 190, view, sp.hv, sp.hc);
  else {
    s += `<ellipse cx="0" cy="${f(-822 + dy)}" rx="146" ry="152" fill="${C.skin}"/>`;
    s += face(dy, sp);
    s += hairFront(dy, view, sp.hat);
    s += hat(dy, sp);
  }
  if (!pose.behind) s += armA.s + armB.s;
  if (sp.prop) s += PROPS[sp.prop](propAt, sp);
  if (!sp.propAt && (pose.prop === 'mid' || pose.prop === 'B' || pose.prop === 'A')) { // hands in front of the held object
    for (const H of pose.prop === 'mid' ? [armA.H, armB.H] : [pose.prop === 'A' ? armA.H : armB.H]) if (sp.prop && !['camera', 'disco'].includes(sp.prop)) s += `<circle cx="${f(H[0])}" cy="${f(H[1])}" r="31" fill="${C.skin}"/>`;
  }
  return s;
}

// --- backgrounds (image pixel space) ----------------------------------------------------------------------
function background(sp, w, h, R) {
  const t = sp.bg || 'studio', m = Math.min(w, h);
  const rect = (col, y0 = 0, y1 = h) => `<rect x="0" y="${f(y0)}" width="${w}" height="${f(y1 - y0)}" fill="${col}"/>`;
  const grad = (a, b, id = 'g' + Math.floor(R() * 1e6)) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient><rect width="${w}" height="${h}" fill="url(#${id})"/>`;
  let s = '';
  const dots = (n, y0, y1, cols, r0, r1) => { let d = ''; for (let i = 0; i < n; i++) d += `<circle cx="${f(R() * w)}" cy="${f(y0 + R() * (y1 - y0))}" r="${f(m * (r0 + R() * (r1 - r0)))}" fill="${cols[Math.floor(R() * cols.length)]}"/>`; return d; };
  switch (t) {
    case 'studio': s += grad(sp.c1 || '#e9ebe2', sp.c2 || '#c8cbbd'); break;
    case 'garage':
      s += rect('#1e201b') + rect('#2b2d27', h * 0.72);
      for (let i = 0; i < 3; i++) s += `<rect x="${f(w * (0.08 + i * 0.32))}" y="${f(h * 0.08)}" width="${f(w * 0.22)}" height="${f(m * 0.025)}" rx="${f(m * 0.012)}" fill="${C.lime}" opacity=".85"/>`;
      s += `<rect x="0" y="${f(h * 0.62)}" width="${w}" height="${f(m * 0.02)}" fill="${sp.c1 || C.lime}" opacity=".35"/>`;
      break;
    case 'warm': s += grad('#f1b872', '#c7773c') + `<rect x="${f(w * 0.62)}" y="0" width="${f(w * 0.3)}" height="${h}" fill="#ffffff22"/>`; break;
    case 'crowd':
      s += grad(sp.c1 || '#dfe3e8', sp.c2 || '#b8bdc4');
      s += `<rect x="0" y="${f(h * 0.42)}" width="${w}" height="${f(h * 0.58)}" fill="${sp.c3 || '#6d6f68'}"/>`;
      s += dots(Math.round(w * h / (m * m) * 260), h * 0.42, h * 0.8, ['#f0c9a4', '#d9a37b', '#8a5a3c', '#2b2b2b', C.lime, '#ffffff', '#e8e2d0'], 0.012, 0.022);
      s += `<rect x="0" y="${f(h * 0.8)}" width="${w}" height="${f(h * 0.2)}" fill="#4b4d47"/><rect x="0" y="${f(h * 0.8)}" width="${w}" height="${f(m * 0.015)}" fill="${C.white}"/>`;
      break;
    case 'podium':
      s += rect(sp.c1 || '#2c3a28');
      for (let i = 0; i < 60; i++) s += `<rect x="${f(R() * w)}" y="${f(R() * h)}" width="${f(m * 0.02)}" height="${f(m * 0.035)}" transform="rotate(${f(R() * 180)} ${f(R() * w)} ${f(R() * h)})" fill="${[C.lime, C.white, C.gold][i % 3]}" opacity=".9"/>`;
      break;
    case 'night':
      s += rect('#0f110d') + dots(40, 0, h, [C.lime + '55', '#ffffff33', '#ffd06a44'], 0.02, 0.07) + `<rect x="0" y="${f(h * 0.75)}" width="${w}" height="${f(h * 0.25)}" fill="#1c1f18"/>`;
      break;
    case 'sky': s += grad('#bcdcee', '#f1f3ec') + [0.2, 0.55, 0.8].map((x, i) => `<ellipse cx="${f(w * x)}" cy="${f(h * (0.15 + i * 0.08))}" rx="${f(m * 0.14)}" ry="${f(m * 0.045)}" fill="#fff" opacity=".85"/>`).join(''); break;
    case 'court': {
      const floor = sp.c1 || '#3f7a4f';
      s += grad(sp.c2 || '#f0c48a', '#e6a86a').replace(`height="${h}"`, `height="${f(h * 0.45)}"`) + `<rect x="0" y="${f(h * 0.45)}" width="${w}" height="${f(h * 0.55)}" fill="${floor}"/>`;
      s += `<path d="M${f(w * 0.15)} ${f(h)}L${f(w * 0.35)} ${f(h * 0.45)}M${f(w * 0.85)} ${f(h)}L${f(w * 0.65)} ${f(h * 0.45)}M0 ${f(h * 0.78)}H${w}" stroke="#fff" stroke-width="${f(m * 0.01)}" opacity=".8"/>`;
      s += `<rect x="0" y="${f(h * 0.52)}" width="${w}" height="${f(h * 0.1)}" fill="#1a1a1a" opacity=".55"/>`;
      for (let x = 0; x < w; x += m * 0.03) s += `<path d="M${f(x)} ${f(h * 0.52)}v${f(h * 0.1)}" stroke="#ffffff33" stroke-width="2"/>`;
      break;
    }
    case 'pool':
      s += rect('#7cc5dd') + Array.from({ length: 16 }, () => `<path d="M${f(R() * w)} ${f(R() * h)}q${f(m * 0.05)} ${f(-m * 0.02)} ${f(m * 0.1)} 0" stroke="#ffffff88" stroke-width="${f(m * 0.008)}" fill="none"/>`).join('');
      s += `<path d="M0 ${f(h * 0.55)}L${f(w)} ${f(h * 0.2)}V${h}H0Z" fill="#f1f1ea"/>`;
      break;
    case 'grass': s += grad('#cfe2ea', '#eef0e6').replace(`height="${h}"`, `height="${f(h * 0.6)}"`) + `<rect x="0" y="${f(h * 0.6)}" width="${w}" height="${f(h * 0.4)}" fill="#6f9a4c"/><rect x="0" y="${f(h * 0.6)}" width="${w}" height="${f(h * 0.05)}" fill="#8fb266"/>`; break;
    case 'cockpit':
      s += rect(sp.c1 || '#151713') + `<ellipse cx="${f(w * 0.5)}" cy="${f(h * 1.05)}" rx="${f(w * 0.7)}" ry="${f(h * 0.35)}" fill="${sp.c2 || '#23261f'}"/>`;
      s += `<path d="M${f(w * 0.05)} ${f(h * 0.35)}Q${f(w * 0.5)} ${f(-h * 0.1)} ${f(w * 0.95)} ${f(h * 0.35)}" stroke="#2f3329" stroke-width="${f(m * 0.06)}" fill="none"/>`;
      s += `<path d="M0 ${f(h * 0.85)}L${f(w * 0.3)} ${f(h * 0.7)}" stroke="${C.lime}" stroke-width="${f(m * 0.02)}"/>`;
      break;
    case 'van': s += rect('#1b1c1a') + `<rect x="${f(w * 0.05)}" y="${f(h * 0.1)}" width="${f(w * 0.45)}" height="${f(h * 0.3)}" rx="${f(m * 0.03)}" fill="#7d8b7a"/><rect x="${f(w * 0.6)}" y="${f(h * 0.25)}" width="${f(w * 0.35)}" height="${f(h * 0.6)}" rx="${f(m * 0.05)}" fill="#262824"/>`; break;
    case 'neon': {
      s += rect(sp.c1 || '#0f120e');
      const cx = w * (sp.nx ?? 0.78), cy = h * 0.45, r = m * 0.48;
      s += `<clipPath id="nc"><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"/></clipPath><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="#141a10"/><g clip-path="url(#nc)" fill="none" stroke="${C.lime}" stroke-width="${f(r * 0.06)}">`;
      for (let i = 0; i < 14; i++) s += `<path d="M${f(cx - r + R() * 2 * r)} ${f(cy - r + R() * 2 * r)}q${f((R() - 0.5) * r * 0.8)} ${f((R() - 0.5) * r * 0.8)} ${f((R() - 0.5) * r)} ${f((R() - 0.5) * r)}t${f((R() - 0.5) * r)} ${f((R() - 0.5) * r)}"/>`;
      s += `</g>`;
      break;
    }
    case 'pixel':
      s += rect('#0d1a4a');
      for (let x = w * 0.55; x < w; x += m * 0.05) for (let y = 0; y < h; y += m * 0.05) if (R() > 0.35) s += `<rect x="${f(x)}" y="${f(y)}" width="${f(m * 0.042)}" height="${f(m * 0.042)}" fill="${R() > 0.5 ? C.lime : '#2a55ff'}"/>`;
      break;
    case 'wall': s += grad('#efe3cf', '#d8c4a6') + Array.from({ length: 6 }, (_, i) => `<path d="M${f(w * (i + 0.5) / 6)} 0V${h}" stroke="#00000010" stroke-width="${f(m * 0.01)}"/>`).join(''); break;
    case 'building': s += grad('#f3dcc0', '#e3b98f') + Array.from({ length: 6 }, (_, i) => `<rect x="${f(w * (0.1 + (i % 2) * 0.55))}" y="${f(h * (0.08 + Math.floor(i / 2) * 0.28))}" width="${f(w * 0.25)}" height="${f(h * 0.16)}" fill="#8b6f53" opacity=".6"/>`).join(''); break;
    case 'lake': s += grad('#dfe7ea', '#c9d5d8').replace(`height="${h}"`, `height="${f(h * 0.5)}"`) + `<path d="M0 ${f(h * 0.5)}L${f(w * 0.25)} ${f(h * 0.3)}L${f(w * 0.5)} ${f(h * 0.45)}L${f(w * 0.75)} ${f(h * 0.28)}L${w} ${f(h * 0.46)}V${f(h * 0.55)}H0Z" fill="#4b5d4a"/><rect x="0" y="${f(h * 0.55)}" width="${w}" height="${f(h * 0.3)}" fill="#8aa0a8"/><rect x="0" y="${f(h * 0.85)}" width="${w}" height="${f(h * 0.15)}" fill="#b9b3a3"/>`; break;
    case 'pit': s += grad('#e3e5e0', '#c9ccc4').replace(`height="${h}"`, `height="${f(h * 0.55)}"`) + `<rect x="0" y="${f(h * 0.55)}" width="${w}" height="${f(h * 0.45)}" fill="#6e706a"/>` + [0.05, 0.4, 0.75].map((x) => `<rect x="${f(w * x)}" y="${f(h * 0.2)}" width="${f(w * 0.25)}" height="${f(h * 0.35)}" fill="#2a2c27"/><rect x="${f(w * x)}" y="${f(h * 0.2)}" width="${f(w * 0.25)}" height="${f(m * 0.02)}" fill="${C.lime}"/>`).join('') + `<path d="M0 ${f(h * 0.8)}H${w}" stroke="#fff" stroke-width="${f(m * 0.012)}" stroke-dasharray="${f(m * 0.06)} ${f(m * 0.04)}"/>`; break;
    case 'case': s += rect('#2a2b2d') + Array.from({ length: 5 }, (_, i) => `<path d="M0 ${f(h * (i + 1) / 6)}H${w}" stroke="#8d9096" stroke-width="${f(m * 0.012)}"/>`).join('') + `<rect x="${f(w * 0.05)}" y="${f(h * 0.05)}" width="${f(w * 0.9)}" height="${f(h * 0.9)}" fill="none" stroke="#a9acb2" stroke-width="${f(m * 0.02)}"/>`; break;
    case 'pink': s += rect('#e8457a') + Array.from({ length: 4 }, (_, i) => `<path d="M${f(-w * 0.2 + i * w * 0.35)} ${h}L${f(w * 0.2 + i * w * 0.35)} 0" stroke="#ffffff33" stroke-width="${f(m * 0.08)}"/>`).join(''); break;
    case 'red': s += rect('#c9262c') + `<rect x="${f(w * 0.1)}" y="${f(h * 0.08)}" width="${f(w * 0.8)}" height="${f(h * 0.35)}" rx="${f(m * 0.03)}" fill="#1b1b1f"/>` + [0, 1, 2].map((i) => `<rect x="${f(w * 0.16)}" y="${f(h * (0.13 + i * 0.1))}" width="${f(w * (0.6 - i * 0.1))}" height="${f(h * 0.05)}" fill="#fff"/>`).join(''); break;
    case 'car': s += rect('#141512') + `<circle cx="${f(w * 0.5)}" cy="${f(h * 0.62)}" r="${f(m * 0.3)}" fill="none" stroke="#2d2f2a" stroke-width="${f(m * 0.05)}"/><rect x="${f(w * 0.05)}" y="${f(h * 0.08)}" width="${f(w * 0.5)}" height="${f(h * 0.25)}" rx="${f(m * 0.03)}" fill="#6c7a78"/>`; break;
    case 'none': break;
    case 'track': s += grad('#cfd6dc', '#e9ecef').replace(`height="${h}"`, `height="${f(h * 0.4)}"`) + `<rect x="0" y="${f(h * 0.3)}" width="${w}" height="${f(h * 0.2)}" fill="#3d4038"/>` + dots(Math.round(w * h / (m * m) * 120), h * 0.31, h * 0.49, ['#e8e2d0', C.lime, '#d9a37b', '#8a8d84', '#ffffff'], 0.008, 0.014) + `<rect x="0" y="${f(h * 0.5)}" width="${w}" height="${f(h * 0.5)}" fill="#5d5f5a"/>` + Array.from({ length: 12 }, (_, i) => `<rect x="${f(i * w / 6)}" y="${f(h * 0.52)}" width="${f(w / 12)}" height="${f(m * 0.03)}" fill="${i % 2 ? '#fff' : '#d8283a'}"/>`).join(''); break;
    case 'wet': s += grad('#9aa1a6', '#c9cdd0').replace(`height="${h}"`, `height="${f(h * 0.45)}"`) + `<rect x="0" y="${f(h * 0.45)}" width="${w}" height="${f(h * 0.55)}" fill="#3a3c3b"/>` + Array.from({ length: 10 }, () => `<path d="M${f(R() * w)} ${f(h * (0.55 + R() * 0.4))}h${f(w * 0.2)}" stroke="#8d949a" stroke-width="${f(m * 0.01)}" opacity=".5"/>`).join(''); break;
    default: s += rect('#ccc');
  }
  return s;
}


// --- scenes without the character: a cartoon race car (side / front) and a bare helmet ----------------
// Car in its own space: side view 0..1000 wide with the ground at y = 0; front view -470..470 wide.
function carSide() {
  let s = `<ellipse cx="520" cy="4" rx="480" ry="22" fill="#000" opacity=".25"/>`;
  s += `<rect x="30" y="-292" width="95" height="36" rx="6" fill="${C.dark}"/><rect x="30" y="-292" width="18" height="150" fill="#111"/><path d="M95 -256L130 -150" stroke="#111" stroke-width="12"/>`;
  s += `<path d="M70 -60L70 -172Q140 -202 260 -192L430 -252L520 -252L560 -178L700 -152Q820 -122 960 -72L985 -50L70 -50Z" fill="${C.dark}"/>`;
  s += `<path d="M250 -192L430 -252L440 -200Z" fill="#33372b"/>`;
  s += `<path d="M280 -122L640 -122L700 -92L280 -92Z" fill="${C.lime}"/><path d="M720 -130Q840 -104 950 -70L930 -62Q830 -92 715 -112Z" fill="${C.lime}"/>`;
  s += `<text x="350" y="-148" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="64" fill="${C.white}">7</text>`;
  s += `<circle cx="560" cy="-202" r="42" fill="${C.lime}"/><rect x="566" y="-214" width="40" height="18" rx="8" fill="${C.black}"/>`;
  s += `<path d="M470 -178Q540 -248 640 -168" stroke="#111" stroke-width="14" fill="none" stroke-linecap="round"/>`;
  s += `<rect x="90" y="-44" width="840" height="20" fill="#111"/>`;
  s += `<path d="M880 -42H1000V-22H860Z" fill="${C.lime}"/><rect x="985" y="-70" width="15" height="50" fill="#111"/>`;
  for (const [x, r] of [[190, 102], [800, 96]]) s += `<circle cx="${x}" cy="${-r}" r="${r}" fill="#141414"/><circle cx="${x}" cy="${-r}" r="${r * 0.55}" fill="#3b3d38"/><circle cx="${x}" cy="${-r}" r="${r * 0.18}" fill="${C.lime}"/><path d="M${x - r * 0.8} ${-r}h${r * 0.25}" stroke="#2b2b2b" stroke-width="6"/>`;
  return s;
}
function carFront() {
  let s = `<ellipse cx="0" cy="4" rx="470" ry="24" fill="#000" opacity=".25"/>`;
  s += `<rect x="-260" y="-410" width="520" height="42" rx="6" fill="${C.dark}"/><rect x="-270" y="-410" width="22" height="130" fill="#111"/><rect x="248" y="-410" width="22" height="130" fill="#111"/>`;
  s += `<path d="M-62 -335L62 -335L92 -222L-92 -222Z" fill="${C.dark}"/><ellipse cx="0" cy="-305" rx="30" ry="18" fill="#0b0b0b"/>`;
  s += `<path d="M-300 -200Q-200 -232 -90 -232L90 -232Q200 -232 300 -200L300 -92L-300 -92Z" fill="${C.dark}"/>`;
  s += `<path d="M-300 -150L-150 -170V-140L-300 -125ZM300 -150L150 -170V-140L300 -125Z" fill="${C.lime}"/>`;
  s += `<path d="M-300 -150L-420 -120M-300 -110L-420 -80M300 -150L420 -120M300 -110L420 -80" stroke="#1a1a1a" stroke-width="9"/>`;
  s += `<circle cx="0" cy="-252" r="50" fill="${C.lime}"/><rect x="-36" y="-266" width="72" height="22" rx="10" fill="${C.black}"/>`;
  s += `<path d="M-112 -232Q0 -335 112 -232M0 -300V-236" stroke="#111" stroke-width="18" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M-42 -100L42 -100L24 -40L-24 -40Z" fill="${C.dark}"/><path d="M-24 -52L24 -52L22 -40L-22 -40Z" fill="${C.lime}"/>`;
  s += `<text x="0" y="-62" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="34" fill="${C.white}">7</text>`;
  s += `<path d="M-430 -74H430V-58H-430Z" fill="#111"/><path d="M-440 -52H440L460 -12H-460Z" fill="${C.lime}"/>`;
  for (const x of [-390, 390]) s += `<rect x="${x - 80}" y="-236" width="160" height="236" rx="34" fill="#141414"/>` + [0, 1, 2, 3].map((i) => `<path d="M${x - 70} ${-200 + i * 50}h140" stroke="#2c2c2c" stroke-width="8"/>`).join('');
  return s;
}
function scene(sp, w, h, R) {
  const m = Math.min(w, h);
  let s = '';
  if (sp.scene === 'helmetOnly') {
    const r = m * 0.34 * (sp.k || 1);
    s += `<ellipse cx="${f(w / 2)}" cy="${f(h / 2 + r * 1.02)}" rx="${f(r * 0.9)}" ry="${f(r * 0.1)}" fill="#000" opacity=".22"/>`;
    s += helmetShape(w / 2, h / 2, r, 'side', sp.hv, sp.hc);
    return s;
  }
  const side = sp.scene === 'carSide';
  const k = (sp.k || 1) * (side ? (w * 0.9) / 1000 : (w * 0.86) / 940);
  const gx = side ? w / 2 - 500 * k : w / 2, gy = h * (0.74 + (sp.y || 0));
  if (sp.spray) for (let i = 0; i < 14; i++) s += `<ellipse cx="${f(gx + (R() - 0.5) * 900 * k)}" cy="${f(gy - R() * 260 * k)}" rx="${f((80 + R() * 160) * k)}" ry="${f((40 + R() * 70) * k)}" fill="#e9eef2" opacity="${(0.25 + R() * 0.35).toFixed(2)}" filter="url(#soft)"/>`;
  s += `<g transform="translate(${f(gx)} ${f(gy)}) scale(${k.toFixed(4)})">${side ? carSide() : carFront()}</g>`;
  if (sp.speed) for (let i = 0; i < 18; i++) { const y = gy - R() * 330 * k; s += `<path d="M${f(R() * w * 0.4)} ${f(y)}h${f(w * (0.2 + R() * 0.4))}" stroke="#ffffff" stroke-width="${f(m * 0.006)}" opacity=".55" stroke-linecap="round"/>`; }
  return s;
}

// --- framing: which part of the character fills the frame ------------------------------------------------
const FRAMES = { full: [-1070, 40, 0.9], half: [-1070, -330, 1.0], close: [-1080, -440, 1.0] };
function render(sp, w, h, seed) {
  const R = rng(seed);
  const [top0, bottom, cover] = FRAMES[sp.frame || 'half'];
  // make room above the head for a raised trophy (any frame) or raised arms (full body)
  const top = top0 - (sp.pose === 'trophyUp' ? 300 : sp.frame === 'full' && ['armsUp', 'pointUp', 'pointHold', 'wave'].includes(sp.pose) ? 60 : 0);
  const dy = sp.sit ? 250 : 0;
  const span = bottom - (top + (sp.frame === 'full' ? 0 : dy)) ;
  const s = (h * cover) / span * (sp.k || 1);
  const ty = h * (sp.frame === 'full' ? 0.06 : 0.07) - (top + (sp.frame === 'full' ? 0 : dy)) * s + (sp.y || 0) * h;
  const tx = w * (0.5 + (sp.x || 0));
  const flip = sp.flip ? ' scale(-1 1)' : '';
  const filter = sp.tint === 'green'
    ? `<filter id="tint"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="table" tableValues="0.16 0.86"/><feFuncG type="table" tableValues="0.17 0.88"/><feFuncB type="table" tableValues="0.13 0.8"/></feComponentTransfer></filter>`
    : sp.tint === 'bw' ? `<filter id="tint"><feColorMatrix type="saturate" values="0"/></filter>` : '';
  if (sp.bg === 'teeprint') {
    const m = Math.min(w, h), cx = w / 2, ty = h * 0.12, tw = w * 0.9;
    const tee = `M${f(cx - tw * 0.2)} ${f(ty)}Q${f(cx)} ${f(ty + m * 0.06)} ${f(cx + tw * 0.2)} ${f(ty)}L${f(cx + tw * 0.5)} ${f(ty + m * 0.12)}L${f(cx + tw * 0.42)} ${f(ty + m * 0.3)}L${f(cx + tw * 0.3)} ${f(ty + m * 0.26)}V${f(h * 0.94)}H${f(cx - tw * 0.3)}V${f(ty + m * 0.26)}L${f(cx - tw * 0.42)} ${f(ty + m * 0.3)}L${f(cx - tw * 0.5)} ${f(ty + m * 0.12)}Z`;
    const pw = w * 0.34, ph = pw * 1.25, px = cx - pw / 2, py = h * 0.3, k = ph / 700;
    const print = `<clipPath id="pr"><rect x="${f(px)}" y="${f(py)}" width="${f(pw)}" height="${f(ph)}"/></clipPath><rect x="${f(px)}" y="${f(py)}" width="${f(pw)}" height="${f(ph)}" fill="${C.dark}"/><g clip-path="url(#pr)"><g transform="translate(${f(cx)} ${f(py + 1080 * k)}) scale(${k.toFixed(4)})">${character({ outfit: 'suit', helmet: true, pose: 'pointUp', hc: [C.gold, C.dark] })}</g></g>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#f1f1ee"/><path d="${tee}" fill="#fbfbf8" stroke="#d9d9d2" stroke-width="${f(m * 0.006)}"/>${print}</svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${filter}<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter><filter id="lift" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000" flood-opacity=".28"/></filter></defs><g${filter ? ' filter="url(#tint)"' : ''}>${background(sp, w, h, R)}${sp.scene ? scene(sp, w, h, R) : `<g transform="translate(${f(tx)} ${f(ty)}) scale(${s.toFixed(4)})${flip}" filter="url(#lift)">${character(sp)}</g>`}${sp.title ? `<text x="${f(w / 2)}" y="${f(h * 0.93)}" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${f(h * 0.085)}" textLength="${f(w * 0.86)}" lengthAdjust="spacingAndGlyphs" fill="#fff" stroke="${C.dark}" stroke-width="${f(h * 0.008)}" paint-order="stroke">${sp.title}</text>` : ''}</g></svg>`;
}

// ---------------------------------------------------------------------------------------------------
// One entry per photo of a person on the site (read off the photos: pose, clothes, props, setting,
// framing). File names are the originals' so a later swap is a rename, not a hunt.
const SPECS = [
  ['Britain-25 (1).webp', 500, 500, { bg: 'cockpit', helmet: true, frame: 'close', k: 0.95, y: 0.08 }],
  ['Lando-2-off-track.webp', 1080, 1349, { bg: 'garage', outfit: 'polo', hat: 'cap', pose: 'holdChest', prop: 'sign', face: 'grin' }],
  ['Lando-2-on-track.webp', 947, 1183, { bg: 'crowd', outfit: 'suit', pose: 'stand', frame: 'full', face: 'smile' }],
  ['Lando-3-off-track.webp', 1080, 1350, { bg: 'van', outfit: 'teeBlack', hat: 'capBack', sit: true, pose: 'stand', face: 'neutral', frame: 'half' }],
  ['Lando-3-ontrack.webp', 1080, 1350, { bg: 'night', outfit: 'suit', pose: 'armsUp', frame: 'full', face: 'shout' }],
  ['Lando-4-off-track.webp', 1080, 1350, { bg: 'warm', outfit: 'tee', frame: 'close', face: 'grin' }],
  ['Lando-5-off-track.webp', 1080, 1350, { bg: 'neon', nx: 0.2, outfit: 'polo', pose: 'lean', prop: 'helmetLow', face: 'neutral' }],
  ['Lando-6-off-track.webp', 1080, 1350, { bg: 'studio', outfit: 'teeGrey', pose: 'cross', face: 'neutral' }],
  ['Lando-6-on-track.webp', 1080, 1232, { bg: 'crowd', outfit: 'suit', pose: 'pointUp', face: 'grin' }],
  ['LandoAus25.webp', 400, 500, { bg: 'night', outfit: 'suit', sit: true, pose: 'holdSide', prop: 'bigTrophy', propAt: [300, -30], face: 'grin', frame: 'full', x: -0.1 }],
  ['LandoBritishGP25.jpg', 800, 1000, { bg: 'podium', c1: '#3a2140', outfit: 'suit', pose: 'trophyUp', prop: 'trophy', face: 'shout', frame: 'full' }],
  ['LandoMonaco25.jpg', 800, 1000, { bg: 'crowd', outfit: 'suitWhite', pose: 'pointUp', face: 'grin' }],
  ['LandoSingaporeWin24.webp', 400, 500, { bg: 'garage', outfit: 'suit', pose: 'pointUp', face: 'wink' }],
  ['Lano-5-on-track.webp', 1080, 1350, { bg: 'pit', outfit: 'suit', legs: 'walk', frame: 'full', face: 'smile' }],
  ['img_1.webp', 1668, 1920, { bg: 'court', outfit: 'sport', hat: 'capBack', pose: 'paddle', prop: 'paddle', frame: 'full', face: 'smile' }],
  ['img_2.webp', 1668, 1920, { bg: 'sky', outfit: 'poloDark', pose: 'swing', prop: 'club', frame: 'full', face: 'smile' }],
  ['img_3.webp', 1668, 1920, { bg: 'pool', outfit: 'tee', sit: true, pose: 'camera', prop: 'camera', frame: 'full', face: 'grin' }],
  ['img_4.webp', 1668, 1924, { bg: 'wall', outfit: 'polo', legs: 'walk', frame: 'full', face: 'grin' }],
  ['img_5.webp', 1668, 1920, { bg: 'court', outfit: 'sweater', pose: 'paddle', prop: 'paddle', legs: 'walk', frame: 'full', face: 'smile' }],
  ['lando - hover image - abu 2024.webp', 800, 1000, { bg: 'crowd', outfit: 'suit', helmet: true, pose: 'armsUp', frame: 'full' }],
  ['lando - hover image - miami 2024.webp', 800, 1000, { bg: 'sky', outfit: 'suit', helmet: true, pose: 'pointUp', frame: 'full' }],
  ['lando-brazil.webp', 640, 400, { bg: 'crowd', outfit: 'suit', helmet: true, pose: 'wave', frame: 'half' }],
  ['lando-store-gold-5.webp', 1260, 1666, { bg: 'building', outfit: 'hoodieBlack', view: 'back', frame: 'full' }],
  ['ln-home-horiz-1.webp', 649, 804, { bg: 'pit', outfit: 'sweater', bag: true, legs: 'walk', frame: 'full', face: 'neutral' }],
  ['ln-home-horiz-10.webp', 659, 599, { bg: 'crowd', outfit: 'suit', helmet: true, pose: 'pointUp', tint: 'green' }],
  ['ln-home-horiz-2.webp', 656, 658, { bg: 'podium', c1: '#55584f', outfit: 'tux', pose: 'holdChest', prop: 'trophy', tint: 'green', face: 'smile' }],
  ['ln-home-horiz-3.webp', 1464, 1330, { bg: 'sky', outfit: 'suit', view: 'side', hat: 'cap', pose: 'pointUp', frame: 'close', face: 'grin', x: 0.1 }],
  ['ln-home-horiz-4.webp', 529, 504, { bg: 'grass', outfit: 'poloDark', pose: 'swing', prop: 'club', frame: 'full', tint: 'green' }],
  ['ln-home-horiz-6.webp', 642, 803, { bg: 'studio', outfit: 'tee', pose: 'holdChest', prop: 'dog', face: 'grin' }],
  ['ln-home-horiz-7.webp', 499, 500, { bg: 'studio', c1: '#b9bcaf', outfit: 'tux', frame: 'full', tint: 'green', face: 'neutral' }],
  ['ln-home-horiz-8.webp', 1461, 1424, { bg: 'van', outfit: 'jacket', view: 'side', pose: 'camera', prop: 'camera', face: 'neutral' }],
  ['ln-home-horiz-9.webp', 761, 691, { bg: 'podium', c1: '#1f5a36', outfit: 'suitBlue', pose: 'trophyUp', prop: 'trophy', face: 'grin' }],
  ['ln-on-t-horiz-1.webp', 649, 804, { bg: 'sky', outfit: 'suit', view: 'side', hat: 'cap', pose: 'pointUp', frame: 'close', tint: 'bw', face: 'grin' }],
  ['ln-podium-Abu Dhabi GP 2024.webp', 660, 788, { bg: 'podium', c1: '#2d2f55', outfit: 'suit', hat: 'cap', pose: 'holdSide', prop: 'trophy', face: 'grin' }],
  ['ln-podium-Australian GP 2025.webp', 660, 788, { bg: 'podium', c1: '#20325e', outfit: 'suit', hat: 'cap', pose: 'trophyUp', prop: 'trophy', face: 'shout' }],
  ['ln-podium-Austrian GP 2020.webp', 660, 788, { bg: 'podium', c1: '#157a3e', outfit: 'suitBlue', pose: 'trophyUp', prop: 'trophy', face: 'grin' }],
  ['ln-podium-Dutch GP 2024.webp', 660, 788, { bg: 'pit', outfit: 'suit', helmet: true, frame: 'full', k: 0.7, y: 0.12 }],
  ['ln-podium-Emilia Romagna GP 2022.webp', 660, 789, { bg: 'podium', c1: '#157a3e', outfit: 'suit', pose: 'trophyUp', prop: 'trophy', face: 'grin' }],
  ['ln-podium-Lando Australia 2025.webp', 815, 914, { bg: 'cockpit', helmet: true, frame: 'close', y: 0.08 }],
  ['ln-podium-Miami GP 2024.webp', 660, 789, { bg: 'studio', c1: '#dfe7ef', outfit: 'suit', hat: 'cap', pose: 'pointHold', prop: 'trophy', face: 'grin' }],
  ['ln-podium-Monaco GP 2021.webp', 660, 789, { bg: 'podium', c1: '#3a2c44', outfit: 'suit', hat: 'cap', pose: 'holdSide', prop: 'trophy', face: 'smile' }],
  ['ln-podium-Singapore GP 2024.webp', 660, 789, { bg: 'crowd', c3: '#8a6a4a', outfit: 'suit', pose: 'holdSide', prop: 'bottle', frame: 'full', face: 'shout' }],
  ['ln-podium-United States GP 2023.webp', 660, 789, { bg: 'sky', outfit: 'hoodie', hat: 'cap', pose: 'holdSide', prop: 'trophy', face: 'grin' }],
  ['ln-social-img-2.webp', 638, 1133, { bg: 'night', outfit: 'suitWhite', pose: 'holdChest', prop: 'disco', frame: 'half' }],
  ['ln-social-img-3.webp', 638, 1133, { bg: 'car', outfit: 'teeBlack', hat: 'cap', view: 'side', pose: 'drive', prop: 'wheel', face: 'neutral' }],
  ['ln-social-img-5.webp', 637, 1133, { bg: 'wall', outfit: 'flannel', hat: 'cap', pose: 'bowl', prop: 'bowl', face: 'smile' }],
  ['ln-social-img-6.webp', 637, 1133, { bg: 'pink', outfit: 'suit', pose: 'holdSide', prop: 'trophy', face: 'grin' }],
  ['ln-social-img-7.webp', 637, 1133, { bg: 'lake', outfit: 'jacket', view: 'back', pose: 'low', prop: 'suitcase', frame: 'full', k: 0.7, y: 0.15 }],
  ['ln4-home-scroll-offt-img5.webp', 1141, 1036, { bg: 'garage', outfit: 'jacket', hat: 'beanie', face: 'neutral' }],
  ['ln4-hp-lando-head.webp', 898, 1984, { bg: 'studio', c1: '#6b6e66', c2: '#4b4e47', outfit: 'swirl', view: 'side', frame: 'close', face: 'neutral', flip: true }],
  ['ln4-menu-img-1.webp', 736, 900, { bg: 'studio', c1: '#8e918a', c2: '#6f726a', outfit: 'swirl', helmet: true, frame: 'close' }],
  ['ln4-menu-img-2.webp', 736, 900, { bg: 'studio', c1: '#dfe7ef', outfit: 'suit', hat: 'cap', pose: 'pointHold', prop: 'trophy', frame: 'close', face: 'grin' }],
  ['ln4-menu-img-3.webp', 736, 900, { bg: 'night', outfit: 'sport', hat: 'capBack', look: 'up', pose: 'paddle', prop: 'paddle', face: 'smile' }],
  ['ln4-off-t-h-img-1.webp', 814, 914, { bg: 'night', outfit: 'sport', hat: 'cap', view: 'back', pose: 'handOnHead' }],
  ['ln4-off-t-h-img-10.webp', 763, 692, { bg: 'sky', outfit: 'hoodie', hat: 'capBack', pose: 'low', prop: 'clubDown', face: 'smile' }],
  ['ln4-off-t-h-img-11.webp', 1462, 1424, { bg: 'court', outfit: 'sweater', pose: 'paddle', prop: 'paddle', legs: 'walk', frame: 'full', face: 'smile' }],
  ['ln4-off-t-h-img-12.webp', 659, 598, { bg: 'night', outfit: 'sport', hat: 'capBack', look: 'up', pose: 'paddle', prop: 'paddle', face: 'shout' }],
  ['ln4-off-t-h-img-13.webp', 762, 691, { bg: 'court', c1: '#2c4f8a', c2: '#1c2330', outfit: 'tank', pose: 'fist', prop: null, legs: 'wide', frame: 'full', face: 'neutral' }],
  ['ln4-off-t-h-img-2.webp', 1464, 1329, { bg: 'wall', c1: '#6b4a32', outfit: 'tee', hat: 'bucket', pose: 'camera', prop: 'camera', face: 'smile' }],
  ['ln4-off-t-h-img-3.webp', 528, 504, { bg: 'neon', nx: 0.7, outfit: 'jacket', hat: 'cap', frame: 'close', tint: 'green', face: 'neutral', x: -0.15 }],
  ['ln4-off-t-h-img-4.webp', 763, 692, { bg: 'pool', outfit: 'tee', sit: true, pose: 'camera', prop: 'camera', frame: 'full', face: 'grin' }],
  ['ln4-off-t-h-img-5.webp', 1462, 1424, { bg: 'neon', nx: 0.72, outfit: 'teeBlack', hat: 'cap', hatColor: '#6ec6e8', view: 'side', pose: 'fist', face: 'grin', x: -0.2 }],
  ['ln4-off-t-h-img-6.webp', 659, 598, { bg: 'neon', nx: 0.62, outfit: 'teeBlack', hat: 'capBack', hatColor: '#c9ccc0', frame: 'close', face: 'smile', x: -0.1 }],
  ['ln4-off-t-h-img-7.webp', 762, 691, { bg: 'pixel', outfit: 'teeBlack', hat: 'cap', hatColor: '#3fd1c0', view: 'side', pose: 'fist', face: 'smile', x: -0.15 }],
  ['ln4-off-t-h-img-8.webp', 1464, 1329, { bg: 'sky', outfit: 'poloDark', pose: 'swing', prop: 'club', frame: 'full', face: 'smile' }],
  ['ln4-off-t-h-img-9.webp', 528, 504, { bg: 'grass', outfit: 'poloDark', hat: 'cap', pose: 'fist', face: 'grin' }],
  ['ln4-on-track-scroll-img3.webp', 1664, 1529, { bg: 'crowd', outfit: 'suit', pose: 'trophyUp', prop: 'bottle', tint: 'bw', face: 'shout' }],
  ['ln4-on-track-scroll-img4.webp', 729, 704, { bg: 'pit', outfit: 'suit', helmet: true, frame: 'half' }],
  ['ln4-on-track-scroll-img5.webp', 762, 692, { bg: 'red', outfit: 'suit', hat: 'cap', pose: 'holdSide', prop: 'trophy', face: 'grin' }],
  ['ln4-otot-home-end-img.webp', 3546, 2940, { bg: 'case', outfit: 'sweater', pose: 'holdChest', prop: 'helmet', face: 'neutral', x: 0.05 }],
  // helmets hall of fame: the hover image of each helmet (the base images show the helmet alone)
  ['In-helm-2025-Season-hover.webp', 823, 823, { bg: 'garage', helmet: true, frame: 'close', y: 0.05 }],
  ['In-helm-2025-Discoball-hover.webp', 823, 823, { bg: 'studio', c1: '#e6e9ee', outfit: 'suit', helmet: true, hv: 'disco', frame: 'close' }],
  ['In-helm-2025-DarkGlitter-hover.webp', 823, 823, { bg: 'night', outfit: 'suit', helmet: true, hc: ['#15161a', '#9dff4a'], frame: 'close' }],
  ['In-helm-2024-Season-hover.webp', 823, 823, { bg: 'pit', outfit: 'suit', helmet: true, pose: 'pointUp', hc: [C.lime, C.dark] }],
  ['In-helm-2024-Porcelain-hover.webp', 823, 823, { bg: 'wall', outfit: 'tee', pose: 'holdSide', prop: 'helmet', hc: ['#f4f4f0', '#2d5bd6'], face: 'grin', flip: true }],
  ['In-helm-2024-Japan-hover.webp', 823, 823, { bg: 'studio', outfit: 'suit', helmet: true, view: 'side', hc: ['#f4f4f0', '#d8283a'], frame: 'close' }],
  ['In-helm-2024-GIF Helmet-hover.webp', 823, 823, { bg: 'cockpit', helmet: true, hc: [C.lime, '#ff5fb0'], frame: 'close', y: 0.08 }],
  ['In-helm-2024-DarkMode-hover.webp', 823, 823, { bg: 'night', outfit: 'suit', helmet: true, pose: 'wave', hc: ['#121212', C.lime], frame: 'full' }],
  ['In-helm-2023-Race 100-hover.webp', 823, 823, { bg: 'cockpit', helmet: true, hc: ['#f6c93a', '#e4402f'], frame: 'close', y: 0.08 }],
  ['In-helm-2023-Las Vegas-hover.webp', 823, 823, { bg: 'cockpit', c1: '#e0741f', c2: '#b95a14', helmet: true, hc: ['#efe4cc', C.gold], frame: 'close', y: 0.08 }],
  ['In-helm-2023-Chrome-hover.webp', 823, 823, { bg: 'studio', c1: '#f2f2ee', outfit: 'suitWhite', pose: 'holdSide', prop: 'helmet', hc: ['#b9c0c8', '#38c7c0'], face: 'grin', flip: true }],
  ['In-helm-2023-Beach Ball-hover.webp', 823, 823, { bg: 'pool', helmet: true, hc: ['#f4f4f0', '#e0343f'], outfit: 'tank', frame: 'close', y: 0.1 }],
  ['In-helm-2022-Basketball-hover.webp', 823, 823, { bg: 'crowd', outfit: 'suit', helmet: true, view: 'side', hc: ['#e2702a', '#1a1a1a'], frame: 'close' }],
  ['In-helm-2021-hover.webp', 823, 823, { bg: 'pit', outfit: 'suitBlue', helmet: true, pose: 'pointUp', hc: [C.lime, '#2a55d6'] }],
  ['In-helm-2020-Silverstone-hover.webp', 823, 823, { bg: 'cockpit', c1: '#e0741f', c2: '#b95a14', helmet: true, hc: ['#f4f4f0', '#2bb6b0'], frame: 'close', y: 0.08 }],
  ['In-helm-2019-hover.webp', 822, 823, { bg: 'pit', outfit: 'suitBlue', helmet: true, hc: ['#2a55d6', C.lime], frame: 'half' }],
  // the large helmet photo on the home page, the footer helmet, the side helmet shot, the photo tee
  ['ln-home-helm-large.webp', 3456, 3092, { bg: 'case', outfit: 'swirl', pose: 'holdSide', prop: 'helmet', flip: true, face: 'neutral', x: 0.1 }],
  ['ln-360-helm-1.webp', 1560, 1276, { bg: 'studio', c1: '#6b6e66', c2: '#4b4e47', outfit: 'swirl', helmet: true, frame: 'close' }],
  ['ln4-hp-lando-helmet.webp', 834, 1984, { bg: 'studio', c1: '#6b6e66', c2: '#4b4e47', outfit: 'swirl', helmet: true, view: 'side', frame: 'close' }],
  ['lando-store-gold-1.webp', 455, 582, { bg: 'teeprint' }],
  // race results (calendar / results pages): the hover photo of each race
  ['LandoDutchGP24.webp', 400, 500, { bg: 'podium', c1: '#c8202f', outfit: 'suit', hat: 'cap', pose: 'trophyUp', prop: 'trophy', face: 'grin' }],
  ['LandoChina25.webp', 400, 500, { scene: 'carSide', bg: 'track', speed: true, k: 1.6, y: -0.05 }],
  ['LandoJapan25.webp', 400, 500, { scene: 'carFront', bg: 'cockpit', k: 1.9, y: 0.2 }],
  ['LandoBah25.webp', 400, 500, { bg: 'podium', c1: '#2a2140', outfit: 'suit', pose: 'armsUp', frame: 'full', face: 'shout' }],
  ['LandoSaudi25.webp', 400, 500, { bg: 'night', outfit: 'jacket', face: 'neutral' }],
  ['LandoMiami25.webp', 400, 500, { bg: 'crowd', outfit: 'suit', view: 'back', pose: 'wave', frame: 'full' }],
  ['LandoImola25.webp', 400, 500, { bg: 'podium', c1: '#1b2b55', outfit: 'suit', hat: 'cap', pose: 'holdSide', prop: 'trophy', face: 'smile' }],
  ['LandoSpain25.webp', 400, 500, { bg: 'studio', c1: '#dfe3e8', outfit: 'suit', hat: 'cap', pose: 'wave', face: 'grin' }],
  ['LandoCanada25.webp', 400, 500, { scene: 'carFront', bg: 'night', k: 1.4 }],
  ['LandoAustria25Win.webp', 400, 500, { bg: 'podium', c1: '#b8202c', outfit: 'suit', hat: 'cap', pose: 'trophyUp', prop: 'trophy', face: 'grin' }],
  ['lando - hover image - belg 2025.webp', 800, 1000, { scene: 'carSide', bg: 'track', k: 0.95 }],
  ['lando - hover image - hungary 2025.webp', 800, 1000, { bg: 'podium', c1: '#2b3f7a', outfit: 'suit', pose: 'trophyUp', prop: 'trophy', face: 'shout' }],
  ['DutchGP25.webp', 800, 1000, { scene: 'carFront', bg: 'track', k: 0.8 }],
  ['lando - hover image - italy 2025.webp', 800, 1000, { bg: 'studio', c1: '#e8702a', c2: '#c85a1a', outfit: 'suit', frame: 'close', face: 'neutral' }],
  ['lando - hover image - az 2026.webp', 800, 1000, { scene: 'carFront', bg: 'garage', k: 1.5, y: 0.05 }],
  ['hover-image-singapore.webp', 563, 654, { bg: 'crowd', outfit: 'suit', hat: 'cap', hatColor: '#c2185b', frame: 'close', face: 'smile' }],
  ['hover-image-austin.webp', 563, 654, { bg: 'studio', c1: '#e03a4a', c2: '#b8202c', outfit: 'suitWhite', helmet: true, view: 'side', frame: 'close' }],
  ['hover-image-mexico.webp', 563, 654, { bg: 'podium', c1: '#2f5a3a', outfit: 'suitWhite', hat: 'cap', pose: 'holdSide', prop: 'trophy', face: 'grin' }],
  ['hover-image-vegas.webp', 563, 654, { bg: 'night', outfit: 'suit', helmet: true, pose: 'handOnHead', frame: 'half' }],
  ['lando - hover image - qatar 2025.webp', 800, 1000, { scene: 'carSide', bg: 'track', k: 0.85 }],
  ['lando - hover image - abu 2026.webp', 800, 1000, { bg: 'studio', c1: '#f08a24', c2: '#d8661a', outfit: 'suit', pose: 'pointUp', face: 'grin', title: 'WORLD CHAMPION', y: -0.04 }],
  // pre-series career (On Track) and the wet-track car shots
  ['pre-f1-car-img.webp', 814, 914, { bg: 'podium', c1: '#dfe3e8', outfit: 'sport', view: 'back', pose: 'holdSide', prop: 'bottle' }],
  ['ln-f1-car-img-2.webp', 815, 915, { bg: 'podium', c1: '#e9ecef', outfit: 'suitWhite', hat: 'cap', pose: 'armsUp', frame: 'full', face: 'shout' }],
  ['ln-on-t-horiz-2.webp', 655, 657, { scene: 'carFront', bg: 'wet', spray: true, k: 0.95 }],
  ['ln4-menu-img-5.webp', 736, 900, { scene: 'carFront', bg: 'wet', spray: true, k: 0.95 }],
  // helmets hall of fame: the product shot of each helmet, on transparent ground like the originals
  ['In-helm-2025-Season-base.webp', 823, 823, { scene: 'helmetOnly', bg: 'none', hc: [C.dark, C.lime] }],
  ['In-helm-2025-Discoball-base.webp', 823, 823, { scene: 'helmetOnly', bg: 'none', hv: 'disco' }],
  ['In-helm-2025-DarkGlitter-base.webp', 823, 823, { scene: 'helmetOnly', bg: 'none', hc: ['#15161a', '#9dff4a'] }],
  ['In-helm-2024-Season-base.webp', 823, 823, { scene: 'helmetOnly', bg: 'none', hc: [C.lime, C.dark] }],
  ['In-helm-2024-Porcelain-base.webp', 823, 823, { scene: 'helmetOnly', bg: 'none', hc: ['#f4f4f0', '#2d5bd6'] }],
  ['In-helm-2024-Japan-base.webp', 823, 823, { scene: 'helmetOnly', bg: 'none', hc: ['#f4f4f0', '#d8283a'] }],
  ['In-helm-2024-GIF Helmet-base.webp', 823, 823, { scene: 'helmetOnly', bg: 'none', hc: [C.lime, '#ff5fb0'] }],
  ['In-helm-2024-DarkMode-base.webp', 823, 823, { scene: 'helmetOnly', bg: 'none', hc: ['#121212', C.lime] }],
  ['In-helm-2023-Race 100-base.webp', 823, 823, { scene: 'helmetOnly', bg: 'none', hc: ['#f6c93a', '#e4402f'] }],
  ['In-helm-2023-Las Vegas-base.webp', 823, 823, { scene: 'helmetOnly', bg: 'none', hc: ['#efe4cc', C.gold] }],
  ['In-helm-2023-Chrome-base.webp', 823, 823, { scene: 'helmetOnly', bg: 'none', hc: ['#b9c0c8', '#38c7c0'] }],
  ['In-helm-2023-Beach Ball-base.webp', 823, 823, { scene: 'helmetOnly', bg: 'none', hc: ['#f4f4f0', '#e0343f'] }],
  ['In-helm-2022-Basketball-base.webp', 823, 823, { scene: 'helmetOnly', bg: 'none', hc: ['#e2702a', '#1a1a1a'] }],
  ['ln-helm-2021-base.webp', 823, 823, { scene: 'helmetOnly', bg: 'none', hc: [C.lime, '#2a55d6'] }],
  ['In-helm-2020-Silverstone-base.webp', 823, 823, { scene: 'helmetOnly', bg: 'none', hc: ['#f4f4f0', '#2bb6b0'] }],
  ['In-helm-2019-base.webp', 823, 823, { scene: 'helmetOnly', bg: 'none', hc: ['#2a55d6', C.lime] }],
];

// ---------------------------------------------------------------------------------------------------
// the head parts are shared with scripts/make-hero-portrait.mjs; render only when run directly
export { C, face, hairBack, hairFront };
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
const only = process.argv.slice(2).map(Number);
const list = SPECS.map((s, i) => [i, ...s]).filter(([i]) => !only.length || only.includes(i));
mkdirSync('public/assets/characters', { recursive: true });
const b = await chromium.launch({ channel: 'chromium' });
const page = await b.newPage();
for (const [i, name, w, h, sp] of list) {
  const svg = render(sp, w, h, 1000 + i);
  if (process.env.SVG) writeFileSync( // SVG=1 keeps the source SVGs for checking path errors in a browser
    `compare/characters/${i}.svg`, svg);
  // SVG -> canvas -> WebP in Chromium (no native image library in the project)
  const url = await page.evaluate(async ({ svg, w, h }) => {
    const img = new Image(); img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg))); await img.decode();
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0);
    return c.toDataURL('image/webp', 0.9);
  }, { svg, w, h });
  const out = `public/assets/characters/${name.replace(/\.(jpg|webp)$/, '.webp')}`;
  writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
}
await b.close();
console.log('rendered', list.length);
}
