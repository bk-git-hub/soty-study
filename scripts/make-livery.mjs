// Generates our own helmet livery: the site's contour field (same recipe as BackgroundWaves.jsx: a warped
// simplex noise, its value wrapped into three ramps, split into two bands) painted in the site's colours
// straight into the helmet's UV space. Self-made, so it can be published.
// Usage: node scripts/make-livery.mjs [name=contour] [scale=3] [threshold=0.5] [seed=7] [ink]
//   ink: cartoon style, a dark ink line along every band boundary (for the toon-shaded helmet)
//   writes compare/helmet-livery/<name>.png (preview) and public/assets/helmet/livery-<name>.webp
import { writeFileSync, mkdirSync } from 'node:fs';
import { PNG } from 'pngjs';
import { chromium } from 'playwright';

const [name = 'contour', scaleArg = '3', thrArg = '0.5', seedArg = '7', inkArg] = process.argv.slice(2);
const INK = inkArg === 'ink', INK_COLOUR = [17, 17, 18], INK_PX = 3; // line half-width in output pixels
const SIZE = 2048, SS = 2; // 2x2 supersampling: soft band edges instead of jaggies
const SCALE = +scaleArg, THRESHOLD = +thrArg, DETAIL = 3;
const DISTORT_SCALE = 0.8, DISTORT_INTENSITY = 0.8; // domain warp, like the page background
const DARK = [40, 44, 32], LIME = [210, 255, 0]; // --color-dark-green, --color-lime
// the chin vents' grille patch (one narrow UV island, both vents read it): plain dark, not painted
const GRILLE = { u0: 0.312, u1: 0.354, v0: 0.79, v1: 0.955 }, GRILLE_COLOUR = [59, 60, 56]; // --color-dark-green-tint-1

// 2D simplex noise (Stefan Gustavson's public-domain reference implementation, ported), -1..1
const grad = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
const perm = new Uint8Array(512);
{ // seeded shuffle of 0..255 (mulberry32)
  let s = +seedArg >>> 0;
  const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
}
const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
function snoise(x, y) {
  const s = (x + y) * F2, i = Math.floor(x + s), j = Math.floor(y + s);
  const t = (i + j) * G2, x0 = x - (i - t), y0 = y - (j - t);
  const i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
  const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
  const ii = i & 255, jj = j & 255;
  let n = 0;
  const corner = (xx, yy, g) => { let tt = 0.5 - xx * xx - yy * yy; if (tt < 0) return 0; tt *= tt; return tt * tt * (g[0] * xx + g[1] * yy); };
  n += corner(x0, y0, grad[perm[ii + perm[jj]] & 7]);
  n += corner(x1, y1, grad[perm[ii + i1 + perm[jj + j1]] & 7]);
  n += corner(x2, y2, grad[perm[ii + 1 + perm[jj + 1]] & 7]);
  return 70 * n;
}
// the band at a UV point: warp the coordinates with a slow noise, wrap the main noise into DETAIL ramps
function band(u, v) {
  const warp = 0.5 + 0.5 * snoise(u * DISTORT_SCALE + 31.7, v * DISTORT_SCALE + 11.3);
  const qx = (u + warp * DISTORT_INTENSITY) * SCALE, qy = (v + warp * DISTORT_INTENSITY) * SCALE;
  let n = 0.5 + 0.5 * snoise(qx, qy);
  n = (n * DETAIL) % 1;
  return n > THRESHOLD ? 1 : 0;
}

// 1. the band on a grid of SS x SS samples per output pixel
const G = SIZE * SS;
const grid = new Uint8Array(G * G);
for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) grid[y * G + x] = band((x + 0.5) / G, (y + 0.5) / G);
// 2. ink (optional): mark samples where the band changes, then widen the marks to a line with a box
//    dilation, done as two 1D passes (a max over +-R along x, then along y) instead of a 2D window
let ink = null;
if (INK) {
  const R = INK_PX * SS, edge = new Uint8Array(G * G), tmp = new Uint8Array(G * G);
  ink = new Uint8Array(G * G);
  for (let y = 0; y < G - 1; y++) for (let x = 0; x < G - 1; x++) {
    const i = y * G + x;
    if (grid[i] !== grid[i + 1] || grid[i] !== grid[i + G]) edge[i] = 1;
  }
  for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
    let m = 0; for (let k = Math.max(0, x - R); k <= Math.min(G - 1, x + R) && !m; k++) m = edge[y * G + k];
    tmp[y * G + x] = m;
  }
  for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
    let m = 0; for (let k = Math.max(0, y - R); k <= Math.min(G - 1, y + R) && !m; k++) m = tmp[k * G + x];
    ink[y * G + x] = m;
  }
}
// 3. average the samples of each output pixel: soft edges instead of jaggies
const png = new PNG({ width: SIZE, height: SIZE });
for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
  let cover = 0, inked = 0;
  for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
    const i = (y * SS + sy) * G + x * SS + sx;
    cover += grid[i]; if (ink) inked += ink[i];
  }
  cover /= SS * SS; inked /= SS * SS;
  const o = (y * SIZE + x) * 4;
  const u = (x + 0.5) / SIZE, v = (y + 0.5) / SIZE;
  const grille = u >= GRILLE.u0 && u <= GRILLE.u1 && v >= GRILLE.v0 && v <= GRILLE.v1;
  for (let c = 0; c < 3; c++) {
    const paint = DARK[c] + (LIME[c] - DARK[c]) * cover;
    png.data[o + c] = grille ? GRILLE_COLOUR[c] : Math.round(paint + (INK_COLOUR[c] - paint) * inked);
  }
  png.data[o + 3] = 255;
}
mkdirSync('compare/helmet-livery', { recursive: true });
const previewPath = `compare/helmet-livery/${name}.png`;
writeFileSync(previewPath, PNG.sync.write(png));

// PNG -> WebP through Chromium's canvas encoder (no native image library in the project)
const b = await chromium.launch({ channel: 'chromium' });
const page = await b.newPage();
const dataUrl = await page.evaluate(async (pngB64) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + pngB64; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  c.getContext('2d').drawImage(img, 0, 0);
  return c.toDataURL('image/webp', 0.9);
}, PNG.sync.write(png).toString('base64'));
await b.close();
const webp = Buffer.from(dataUrl.split(',')[1], 'base64');
const outPath = `public/assets/helmet/livery-${name}.webp`;
writeFileSync(outPath, webp);
console.log('wrote', previewPath, 'and', outPath, (webp.length / 1024).toFixed(0), 'KB');
