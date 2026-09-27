// Build step for deployments from git: the two 3D models this build still takes from the original site
// (the helmet mesh, credited in the footer, and the circuit ribbon) are never committed (CLAUDE.md), so
// the build fetches them into public/orig/ when they are not there. Locally they already are: skipped.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
const MODELS = [
  ['public/orig/runtime/models/helmet-21.glb', 'https://lando.itsoffbrand.io/gl/models/helmet-21.glb'],
  ['public/orig/runtime/models/tracks-06.glb', 'https://lando.itsoffbrand.io/gl/models/tracks/tracks-06.glb'],
];
for (const [path, url] of MODELS) {
  if (existsSync(path)) { console.log('have', path); continue; }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.subarray(0, 4).toString() !== 'glTF') throw new Error(`${url}: not a GLB`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buf);
  console.log('fetched', path, buf.length, 'bytes');
}
