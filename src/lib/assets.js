// Resolves asset names to local paths.
import CHARACTERS from '../data/characters';

// Local dev uses the original site's media, downloaded into public/orig/ (gitignored, never committed).
// The public build will swap these for self-made / licensed assets in public/assets/.
// The index of the downloaded originals (name -> CDN filename) is generated locally and gitignored too. It
// is loaded through a glob so that a clone without it still builds: the glob then matches nothing, the
// index is empty and cdn() hands out the placeholder. (A plain import broke every public build since
// day 0; noticed on 2026-09-22 while checking the commits before a push.)
const found = import.meta.glob('../data/orig-index.js', { eager: true });
const index = found['../data/orig-index.js']?.default ?? {};

const ORIG = '/orig/cdn/';
const RUNTIME = '/orig/runtime/';

/** cdn('ln-home-horiz-1.webp') -> '/orig/cdn/68302baa04b14a1ca33c0b25_ln-home-horiz-1.webp' */
export function cdn(name) {
  // photos of a person are replaced by the placeholder character drawn for that photo (same size)
  if (CHARACTERS.has(name)) return '/assets/characters/' + encodeURIComponent(name.replace(/\.(jpg|webp)$/, '.webp'));
  const hit = index[name];
  if (!hit) {
    if (import.meta.env.DEV) console.warn('[assets] missing original asset:', name);
    return '/assets/placeholder.svg';
  }
  // filenames keep the CDN's literal "%20" etc., so encode once more for the URL
  return ORIG + encodeURIComponent(hit);
}

export const rive = (file) => `${RUNTIME}rive/${file}.riv`;
export const gl = (rel) => `${RUNTIME}gl/${rel}`;
export const model = (file) => `${RUNTIME}models/${file}.glb`;
export const hdri = (file) => `${RUNTIME}hdri/${file}.hdr`;
