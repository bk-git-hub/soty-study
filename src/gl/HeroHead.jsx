import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useTexture } from '@react-three/drei';
import Env from './Env';
import { makeGhostShellMaterial } from './HelmetGhost';
import { makeBlueprintMaterial, makeBlueprintLines } from './BlueprintLines';
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
// Near-orthographic view like the original (camera at z=3 for a 0.077-unit helmet): narrow fov, far camera.
// The world-space viewport height at z=0 stays 2.68 (same as fov 30 at z=5), so all viewport-based sizes hold.
const FOV = 10;
const CAM_Z = 2.68 / (2 * Math.tan((FOV / 2) * Math.PI / 180));

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

function Portrait({ reveal }) {
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
    u.uReveal.value += (reveal.current - u.uReveal.value) * (1 - Math.exp(-dt * 4));
  });
  // The photo is portrait-oriented; fit it so the face sits in the upper-middle of the screen
  // and the shoulders run off the bottom edge (observed framing).
  const aspect = diffuse.image.width / diffuse.image.height;
  // v1: measured against reference t05840 with an overlay: eyes at y=425/900, chin at 672/900
  const h = viewport.height * 1.2;
  return (
    <mesh position={[0, 0, 0]}>
      <planeGeometry args={[h * aspect, h]} />
      <shaderMaterial ref={mat} vertexShader={portraitVert} fragmentShader={portraitFrag} uniforms={uniforms} transparent depthWrite={false} depthTest={false} />
    </mesh>
  );
}

function Helmet({ glassAmount }) {
  const { scene } = useGLTF(model('helmet-21'), DRACO);
  const base = useTexture(glAsset('textures/helmet/webp/gold/Norris_Helmet_mat_BaseColor.webp'));
  base.colorSpace = THREE.SRGBColorSpace; base.flipY = false;
  const group = useRef();
  const { viewport } = useThree();

  const { solid, glass } = useMemo(() => {
    const solid = new THREE.MeshStandardMaterial({ map: base, roughness: 0.35, metalness: 0.2, transparent: true });
    // ghost shell + swept UV-grid 'structure' lines, see HelmetGhost.js
    const glass = makeGhostShellMaterial();
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

  const lineMat = useMemo(() => makeBlueprintMaterial(), []);
  // Observed on the original's line map (every line ever drawn over 60 s): the shell and the top vents
  // are drawn, the ear pods and the visor are not. 'plastic' holds vents (top) and ear pods (sides):
  // keep only its upper part.
  const blueprint = useMemo(() => {
    // Ear pods: the lower part of the 'plastic' mesh, split left/right. Their centres and radius
    // are used to cut the same pockets out of the shell lines (the shell models the ear cups too).
    const plastic = meshes.find((m) => m.name === 'plastic');
    const pods = [];
    if (plastic) {
      const pos = plastic.geometry.attributes.position; plastic.geometry.computeBoundingBox();
      const { min, max } = plastic.geometry.boundingBox; const cut = min.y + 0.55 * (max.y - min.y);
      for (const sign of [-1, 1]) {
        let n = 0; const c = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); if (y < cut && Math.sign(x) === sign) { c.x += x; c.y += y; c.z += pos.getZ(i); n++; } }
        if (!n) continue; c.divideScalar(n);
        let r = 0; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); if (y < cut && Math.sign(x) === sign) r = Math.max(r, Math.hypot(x - c.x, y - c.y, pos.getZ(i) - c.z)); }
        pods.push({ c, r: r * 2.1 }); // the shell's ear-cup rings extend well beyond the pod itself
      }
    }
    const inPod = (x, y, z) => pods.some((p) => Math.hypot(x - p.c.x, y - p.c.y, z - p.c.z) < p.r);
    // the visor ('glass') is drawn too: the original shows a grid over the eye opening
    return meshes.map((m) => {
      let keep = null;
      // 'plastic' (top/rear aero piece incl. its side wings) is drawn in full: the original's line map is
      // wider at the upper sides than the shell alone
      if (m.name === 'helmet') {
        keep = (ax, ay, az, bx, by, bz) => !inPod((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2); // no ear-cup rings
      }
      return makeBlueprintLines(m, lineMat, keep);
    });
  }, [meshes, lineMat]);
  const depthMat = useMemo(() => new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true, side: THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 }), []);
  const depthGroup = useRef();
  const inner = useRef();
  useEffect(() => {
    // normalise line height against the placed helmet's world bounds (top = 1, chin = 0)
    if (!inner.current) return;
    inner.current.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(inner.current);
    glass.uniforms.uMinY.value = box.min.y; glass.uniforms.uMaxY.value = box.max.y;
    lineMat.uniforms.uMinY.value = box.min.y; lineMat.uniforms.uMaxY.value = box.max.y;
  }, [glass, lineMat, meshes]);

  const debugMode = import.meta.env.DEV ? new URLSearchParams(location.search).get('debug') : null;
  const debugWire = debugMode === 'wire';
  // ?debug=lines: freeze the pulse with every blueprint line lit, for still comparisons
  const debugLines = debugMode === 'lines';
  // ?debug=shell: hide the blueprint lines to inspect the envelope/rim alone
  const debugShell = debugMode === 'shell';
  const wireMats = useMemo(() => ({ helmet: new THREE.MeshBasicMaterial({ color: 0xc03030, wireframe: true, transparent: true, opacity: 0.55 }), glass: new THREE.MeshBasicMaterial({ color: 0x3050c0, wireframe: true, transparent: true, opacity: 0.55 }), plastic: new THREE.MeshBasicMaterial({ color: 0x30a040, wireframe: true, transparent: true, opacity: 0.55 }) }), []);
  useFrame((state, dt) => {
    const g = glassAmount.current;
    if (debugWire) { for (const m of meshes) { m.visible = true; m.material = wireMats[m.name] || wireMats.helmet; } return; }
    for (const m of meshes) {
      const ghost = g > 0.5;
      m.material = ghost ? glass : solid;
      solid.opacity = 1 - g;
      m.visible = true; // ghost state: every part drawn with the ghost material (faint body + thin fresnel rim = the outline)
    }
    glass.uniforms.uTime.value = state.clock.elapsedTime;
    glass.uniforms.uOpacity.value = g;
    lineMat.uniforms.uTime.value = state.clock.elapsedTime;
    lineMat.uniforms.uOpacity.value = debugShell ? 0 : 0.42 * g;
    lineMat.uniforms.uFloor.value = debugLines ? 1 : 0;
    for (const l of blueprint) l.visible = g > 0.5;
    if (depthGroup.current) depthGroup.current.visible = g > 0.5; // the depth wall only matters in the ghost state
  });

  // helmet height on screen: ~52% of the viewport (measured at z=0; the group sits slightly
  // in front of the portrait so it wraps the head)
  // v2: reference helmet spans y 90-655 of 900 and the eye line sits mid-visor (measured on t07240)
  const targetH = viewport.height * 0.68; // fitted: line-map extents vs the original (scripts/extents.mjs), width ratio 1.00
  const s = targetH / fit.size.y;
  const c = fit.center;
  return (
    <group ref={group} position={[-0.012, viewport.height * 0.104, 0.3]}>  {/* y fitted: dome top row matches the original line map */}
      <group ref={inner} scale={s} position={[-c.x * s, -c.y * s, -c.z * s]}>
        <primitive object={scene} />
        {blueprint.map((l) => <primitive key={l.name} object={l} />)}
        <group ref={depthGroup}>
          {meshes.map((m) => <mesh key={'depth-' + m.name} geometry={m.geometry} material={depthMat} />)}
        </group>
      </group>
    </group>
  );
}

function Rig({ progress }) {
  const { camera } = useThree();
  useFrame(() => {
    // scroll-out: the whole hero drifts up and away as the page scrolls into the marquee section
    camera.position.y = -progress.current * 4;
    camera.position.z = CAM_Z + progress.current * 3;
  });
  return null;
}

export default function HeroHead({ ready, progressRef }) {
  const reveal = useRef(0);
  const glassAmount = useRef(0);
  const fallback = useRef(0);
  const progress = progressRef || fallback;

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
    <Canvas className="!absolute inset-0" dpr={[1, 1.5]} camera={{ position: [0, 0, CAM_Z], fov: FOV, near: 0.1, far: 100 }} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}>
      <Env url={hdri('studio_small_08_1k--light')} intensity={1.2} />
      <Suspense fallback={null}>
        <Portrait reveal={reveal} />
        <Helmet glassAmount={glassAmount} />
        <Rig progress={progress} />
      </Suspense>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={1.4} />
    </Canvas>
  );
}
