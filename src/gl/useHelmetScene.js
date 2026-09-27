import { useGLTF } from '@react-three/drei';
import { model } from '../lib/assets';

// Draco decoder from three.js (three/examples/jsm/libs/draco/gltf, Apache-2.0), copied to public/assets
const DRACO = '/assets/draco/';

/**
 * The helmet's scene graph (meshes "helmet", "glass", "plastic"): the original's GLB, kept by the
 * user's decision (D-024, reaffirmed 2026-09-27 after a code-built helmet did not read as a helmet).
 * Everything on its surface is ours: livery, visor, cel shading.
 */
export const useHelmetScene = () => useGLTF(model('helmet-21'), DRACO).scene;
