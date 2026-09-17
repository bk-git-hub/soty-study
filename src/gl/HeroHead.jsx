import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useTexture } from '@react-three/drei';
import Env from './Env';
import * as THREE from 'three';
import { gl as glAsset, model, hdri } from '../lib/assets';

/*
 * The hero of the original is one shared WebGL canvas. The visible parts are:
 *  - a portrait plane using diffuse + depth + alpha maps. The depth map displaces UVs by the
 *    pointer offset, which reads as a subtle 3D parallax ("2.5D") on a flat photo.
 *  - a Draco-compressed helmet GLB drawn as a transparent glass shell with a faint wireframe,
 *    which, after the intro, is what you see: the helmet "ghost" around the head.
 * Baseline: same ingredients, simplified shading. Tuned against the reference later.
 */

// Draco decoder served locally (copied next to the original assets) so model loading never waits on a third-party CDN.
const DRACO = '/orig/runtime/draco/';

const portraitVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const portraitFrag = /* glsl */ `
  uniform sampler2D uDiffuse; uniform sampler2D uDepth; uniform sampler2D uAlpha;
  uniform vec2 uMouse; uniform float uStrength; uniform float uReveal;
  varying vec2 vUv;
  void main() {
    // depth in [0,1]; centre it so near pixels move one way and far pixels the other
    float d = texture2D(uDepth, vUv).r - 0.5;
    vec2 uv = vUv + d * uMouse * uStrength;
    vec4 c = texture2D(uDiffuse, uv);
    float a = texture2D(uAlpha, uv).r;
    gl_FragColor = vec4(c.rgb, a * uReveal);
  }
`;

function Portrait({ mouse, reveal }) {
  const [diffuse, depth, alpha] = useTexture([
    glAsset('textures/head/webp/diffuse.webp'),
    glAsset('textures/head/webp/depth.webp'),
    glAsset('textures/head/webp/alpha.webp'),
  ]);
  diffuse.colorSpace = THREE.SRGBColorSpace;
  const { viewport } = useThree();
  const uniforms = useMemo(() => ({
    uDiffuse: { value: diffuse }, uDepth: { value: depth }, uAlpha: { value: alpha },
    uMouse: { value: new THREE.Vector2() }, uStrength: { value: 0.03 }, uReveal: { value: 0 },
  }), [diffuse, depth, alpha]);
  const mat = useRef();
  useFrame((_, dt) => {
    const u = mat.current.uniforms;
    u.uMouse.value.lerp(mouse.current, 1 - Math.exp(-dt * 6)); // frame-rate independent ease
    u.uReveal.value += (reveal.current - u.uReveal.value) * (1 - Math.exp(-dt * 4));
  });
  // The photo is portrait-oriented; fit it so the face sits in the upper-middle of the screen
  // and the shoulders run off the bottom edge (observed framing).
  const aspect = diffuse.image.width / diffuse.image.height;
  const h = viewport.height * 1.02;
  return (
    <mesh position={[0, -viewport.height * 0.07, 0]}>
      <planeGeometry args={[h * aspect, h]} />
      <shaderMaterial ref={mat} vertexShader={portraitVert} fragmentShader={portraitFrag} uniforms={uniforms} transparent depthWrite={false} />
    </mesh>
  );
}

function Helmet({ mouse, glassAmount }) {
  const { scene } = useGLTF(model('helmet-21'), DRACO);
  const base = useTexture(glAsset('textures/helmet/webp/gold/Norris_Helmet_mat_BaseColor.webp'));
  base.colorSpace = THREE.SRGBColorSpace; base.flipY = false;
  const group = useRef();
  const { viewport } = useThree();

  const { solid, glass } = useMemo(() => {
    const solid = new THREE.MeshStandardMaterial({ map: base, roughness: 0.35, metalness: 0.2, transparent: true });
    // "Ghost" shell: no transmission (it needs an opaque backbuffer), just a faint reflective
    // shell whose opacity is driven by the intro. The wireframe overlay gives the blueprint look.
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0xf4f4ed, roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.1,
      transparent: true, opacity: 0.22, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false,
    });
    return { solid, glass };
  }, [base]);

  // Normalise the model: GLBs come in arbitrary units, so measure the bounding box once and
  // scale so the helmet's height is a fraction of the viewport, centred on its own middle.
  const { meshes, fit } = useMemo(() => {
    const meshes = [];
    scene.traverse((o) => { if (o.isMesh) meshes.push(o); });
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    return { meshes, fit: { size, center } };
  }, [scene]);

  // wireframe overlay: thin edges give the "blueprint" ghost look after the intro
  const wire = useMemo(() => meshes.map((m) => {
    const l = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 25), new THREE.LineBasicMaterial({ color: 0x282c20, transparent: true, opacity: 0.18 }));
    m.getWorldPosition(l.position); l.quaternion.copy(m.getWorldQuaternion(new THREE.Quaternion())); l.scale.copy(m.getWorldScale(new THREE.Vector3()));
    return l;
  }), [meshes]);

  useFrame((_, dt) => {
    const g = glassAmount.current;
    for (const m of meshes) {
      m.material = g > 0.5 ? glass : solid;
      solid.opacity = 1 - g;
      glass.opacity = 0.22 * g;
    }
    for (const w of wire) w.material.opacity = 0.35 * g;
    if (group.current) {
      const target = new THREE.Euler(mouse.current.y * 0.15, mouse.current.x * 0.35, 0);
      group.current.rotation.x += (target.x - group.current.rotation.x) * (1 - Math.exp(-dt * 4));
      group.current.rotation.y += (target.y - group.current.rotation.y) * (1 - Math.exp(-dt * 4));
    }
  });

  // helmet height on screen: ~52% of the viewport (measured at z=0; the group sits slightly
  // in front of the portrait so it wraps the head)
  const targetH = viewport.height * 0.52;
  const s = targetH / fit.size.y;
  const c = fit.center;
  return (
    <group ref={group} position={[0, viewport.height * 0.12, 0.3]}>
      <group scale={s} position={[-c.x * s, -c.y * s, -c.z * s]}>
        <primitive object={scene} />
        {wire.map((w, i) => <primitive key={i} object={w} />)}
      </group>
    </group>
  );
}

function Rig({ progress }) {
  const { camera } = useThree();
  useFrame(() => {
    // scroll-out: the whole hero drifts up and away as the page scrolls into the marquee section
    camera.position.y = -progress.current * 4;
    camera.position.z = 5 + progress.current * 3;
  });
  return null;
}

export default function HeroHead({ ready, progressRef }) {
  const mouse = useRef(new THREE.Vector2());
  const reveal = useRef(0);
  const glassAmount = useRef(0);
  const fallback = useRef(0);
  const progress = progressRef || fallback;

  useEffect(() => {
    const move = (e) => {
      mouse.current.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, []);

  useEffect(() => {
    // intro: portrait reveals with the loader wipe, then the solid helmet dissolves into glass
    if (!ready) return;
    reveal.current = 1;
    let raf; const start = performance.now();
    const step = () => {
      const t = Math.min(1, (performance.now() - start - 900) / 1600);
      glassAmount.current = t <= 0 ? 0 : t * t * (3 - 2 * t); // smoothstep
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [ready]);

  return (
    <Canvas className="!absolute inset-0" dpr={[1, 1.5]} camera={{ position: [0, 0, 5], fov: 30 }} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}>
      <Env url={hdri('studio_small_08_1k--light')} intensity={1.2} />
      <Suspense fallback={null}>
        <Portrait mouse={mouse} reveal={reveal} />
        <Helmet mouse={mouse} glassAmount={glassAmount} />
        <Rig progress={progress} />
      </Suspense>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={1.4} />
    </Canvas>
  );
}
