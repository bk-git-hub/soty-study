import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

/**
 * Non-blocking HDR environment. drei's <Environment files> suspends the whole subtree until the
 * HDR is parsed, which stalled our helmet canvases; loading it in an effect keeps the model
 * visible under the direct lights and upgrades to image-based lighting when the map arrives.
 */
export default function Env({ url, intensity = 1 }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    let disposed = false;
    const pmrem = new THREE.PMREMGenerator(gl);
    new RGBELoader().load(url, (hdr) => {
      if (disposed) { hdr.dispose(); return; }
      const env = pmrem.fromEquirectangular(hdr).texture;
      hdr.dispose();
      scene.environment = env;
      scene.environmentIntensity = intensity;
    }, undefined, (err) => console.warn('[Env] HDR failed, using lights only', err));
    return () => { disposed = true; scene.environment = null; pmrem.dispose(); };
  }, [url, gl, scene, intensity]);
  return null;
}
