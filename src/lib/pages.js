// The pages besides home (On Track, Off Track, Calendar, 404) are kept out of the repository for now
// (.gitignore): only the landing page is published. They are picked up through a glob, so a clone
// without them builds and simply has no such routes; locally, with the files present, nothing changes.
const found = import.meta.glob('../pages/{OnTrack,OffTrack,Calendar,NotFound}.jsx', { eager: true });
const page = (name) => found[`../pages/${name}.jsx`]?.default ?? null;

export const OPTIONAL_PAGES = {
  '/on-track': page('OnTrack'),
  '/off-track': page('OffTrack'),
  '/calendar': page('Calendar'),
};
export const NotFoundPage = page('NotFound');

/** true for home and for every optional page whose file is present */
export const hasPage = (to) => to === '/' || Boolean(OPTIONAL_PAGES[to]);
