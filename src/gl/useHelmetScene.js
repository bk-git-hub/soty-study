import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { model } from '../lib/assets';
import { pickLivery, TOON_LIVERY } from './helmetMaps';
import { makeToonHelmetScene } from './toonHelmetModel';

const DRACO = '/orig/runtime/draco/';
// Decided once per page load (the livery comes from the URL in dev): the toon livery rides on our own
// code-built helmet, the other liveries on the original GLB (local comparison only).
const OWN_MODEL = pickLivery() === TOON_LIVERY;

/** The helmet's scene graph: meshes named "helmet" / "glass" (/ "plastic" on the GLB). */
export const useHelmetScene = OWN_MODEL
  ? () => useMemo(makeToonHelmetScene, [])
  : () => useGLTF(model('helmet-21'), DRACO).scene;
