// Resolves asset names to local paths.
// Local dev uses the original site's media, downloaded into public/orig/ (gitignored, never committed).
// The public build will swap these for self-made / licensed assets in public/assets/.
import index from '../data/orig-index.js';

const ORIG = '/orig/cdn/';
const RUNTIME = '/orig/runtime/';

/** cdn('ln-home-horiz-1.webp') -> '/orig/cdn/68302baa04b14a1ca33c0b25_ln-home-horiz-1.webp' */
export function cdn(name) {
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
