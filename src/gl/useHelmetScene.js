import { useGLTF } from '@react-three/drei';
import { model } from '../lib/assets';

const DRACO = '/orig/runtime/draco/';

/**
 * The helmet's scene graph (meshes "helmet", "glass", "plastic"): the original's GLB, kept by the
 * user's decision (D-024, reaffirmed 2026-09-27 after a code-built helmet did not read as a helmet).
 * Everything on its surface is ours: livery, visor, cel shading.
 */
export const useHelmetScene = () => useGLTF(model('helmet-21'), DRACO).scene;
