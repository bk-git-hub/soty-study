import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { gl as glAsset, model, hdri } from '../lib/assets';
import Env from './Env';

// Draco decoder served locally (copied next to the original assets) so model loading never waits on a third-party CDN.
const DRACO = '/orig/runtime/draco/';

/**
 * Solid gold helmet (helmet-21.glb + PBR maps) that idles slowly and follows the pointer.
 * Used on the on-track hero and the 404 page. `scrollRef` (0..1) adds a scroll-driven spin.
 * The GLB is measured once (bounding box) and scaled so its height fills `fill` of the viewport.
 */
function Model({ mouse, scrollRef, variant, fill }) {
  const { scene } = useGLTF(model('helmet-21'), DRACO);
  const [base, normal, rough, metal] = useTexture([
    glAsset(`textures/helmet/webp/${variant}/Norris_Helmet_mat_BaseColor.webp`),
    glAsset('textures/helmet/webp/Norris_Helmet_mat_Normal.webp'),
    glAsset('textures/helmet/webp/Norris_Helmet_mat_Roughness.webp'),
    glAsset('textures/helmet/webp/Norris_Helmet_mat_Metallic.webp'),
  ]);
  base.colorSpace = THREE.SRGBColorSpace;
  [base, normal, rough, metal].forEach((t) => { t.flipY = false; });
  // metalness is capped below 1 so the paint still picks up the direct lights even before the
  // HDR environment has loaded (a fully metallic surface with no env map renders black)
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: base, normalMap: normal, roughnessMap: rough, metalnessMap: metal, metalness: 0.7, roughness: 0.9, envMapIntensity: 1.4 }), [base, normal, rough, metal]);
  useEffect(() => { scene.traverse((o) => { if (o.isMesh) o.material = mat; }); }, [scene, mat]);
  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    return { size: box.getSize(new THREE.Vector3()), center: box.getCenter(new THREE.Vector3()) };
  }, [scene]);
  const g = useRef();
  const { viewport } = useThree();
  useFrame((state, dt) => {
    if (!g.current) return;
    const t = state.clock.elapsedTime;
    const ty = -0.6 + mouse.current.x * 0.5 + Math.sin(t * 0.4) * 0.15 + (scrollRef?.current || 0) * Math.PI * 2;
    const tx = -mouse.current.y * 0.25 + Math.sin(t * 0.3) * 0.05;
    g.current.rotation.y += (ty - g.current.rotation.y) * (1 - Math.exp(-dt * 3));
    g.current.rotation.x += (tx - g.current.rotation.x) * (1 - Math.exp(-dt * 3));
  });
  const s = (viewport.height * fill) / fit.size.y;
  const c = fit.center;
  return (
    <group ref={g}>
      <group scale={s} position={[-c.x * s, -c.y * s, -c.z * s]}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

export default function HelmetSpin({ className = '', scrollRef, variant = 'gold', fill = 0.62 }) {
  const mouse = useRef(new THREE.Vector2());
  useEffect(() => {
    const move = (e) => mouse.current.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, []);
  return (
    <Canvas className={className} dpr={[1, 1.5]} camera={{ position: [0, 0, 5], fov: 30 }} gl={{ antialias: true, alpha: true }}>
      <Env url={hdri('studio_small_08_1k--light')} />
      <Suspense fallback={null}>
        <Model mouse={mouse} scrollRef={scrollRef} variant={variant} fill={fill} />
      </Suspense>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} />
      <directionalLight position={[-4, 2, -3]} intensity={0.6} />
    </Canvas>
  );
}
