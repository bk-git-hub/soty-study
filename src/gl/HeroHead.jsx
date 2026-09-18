import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useTexture } from '@react-three/drei';
import Env from './Env';
import { makeGhostShellMaterial, makeOutlineMaterial } from './HelmetGhost';
import { makeBlueprintMaterial, makeBlueprintLines } from './BlueprintLines';
import * as THREE from 'three';
import { gl as glAsset, model, hdri } from '../lib/assets';

/*
 * The hero of the original is one shared WebGL canvas. The visible parts are:
 *  - a portrait plane using diffuse + depth + alpha maps. The depth map displaces the plane's
 *    vertices toward the camera (a relief), so the face reads as 3D under the perspective camera.
 *  - a Draco-compressed helmet GLB drawn as a transparent glass shell with a faint wireframe,
 *    which, after the intro, is what you see: the helmet "ghost" around the head.
 * Not built yet: the original's eased pointer-follow (head plane rotates up to ~4 deg with the
 * cursor, helmet at 2/3 of that, camera nudged 0.02) and the cursor-driven reveal of the helmet.
 */

// Draco decoder served locally (copied next to the original assets) so model loading never waits on a third-party CDN.
const DRACO = '/orig/runtime/draco/';
// Camera of the original's hero scene (read off its bundle while chasing a silhouette mismatch, see
// private devlog 2026-09-18): perspective fov 15 at z = 3 on desktop. The world-space viewport height at
// z = 0 is then 2 * 3 * tan(7.5 deg) = 0.79, and the portrait / helmet sizes below are absolute, not vh-based.
const FOV = 15;
const camZ = (width) => (width > 768 ? 3 : 3.75); // phones: camera further back, helmet not raised
const CAM_Z = 3;
// Original helmet transform: the GLB scene scaled (6.9, 6.9, 7.1), raised 0.05 (0 on phones), pitched
// +0.06 pi (10.8 deg). The user had eyeballed 10 deg the day before; this confirms the tilt and adds the
// 7.1 z-stretch.
const HELMET_SCALE = [6.9, 6.9, 7.1];
const helmetY = (width) => (width > 768 ? 0.05 : 0);
const HELMET_PITCH_DEG = 0.06 * 180;
// Original portrait: a 1 x 1 plane (128 x 128 segments) displaced along its normal by depth * 0.25, so the
// nose / forehead / hair sit closer to the camera and read larger under the perspective (the hair top is
// ~15 px higher than a flat plane at 1440x900).
const PORTRAIT_DISPLACE = 0.25;

const portraitVert = /* glsl */ `
  uniform sampler2D uDepth; uniform float uDisplace;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // relief: push each vertex toward the camera by its depth (white = near), like three's displacementMap
    vec3 p = position + normal * texture2D(uDepth, uv).r * uDisplace;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
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
  const uniforms = useMemo(() => ({
    uDiffuse: { value: diffuse }, uDepth: { value: depth }, uAlpha: { value: alpha },
    uMouse: { value: new THREE.Vector2() }, uStrength: { value: 0.03 }, uReveal: { value: 0 },
    uDisplace: { value: PORTRAIT_DISPLACE },
  }), [diffuse, depth, alpha]);
  const mat = useRef();
  useFrame((_, dt) => {
    const u = mat.current.uniforms;
    u.uReveal.value += (reveal.current - u.uReveal.value) * (1 - Math.exp(-dt * 4));
  });
  // The photo is square (2549^2) and fills a 1 x 1 plane at the origin: 127 % of the viewport height with
  // the camera above. (v1 had fitted 1.2 vh by overlay; the missing 6 % was the relief, not the plane.)
  return (
    <mesh position={[0, 0, 0]}>
      <planeGeometry args={[1, 1, 128, 128]} />
      <shaderMaterial ref={mat} vertexShader={portraitVert} fragmentShader={portraitFrag} uniforms={uniforms} transparent depthWrite={false} depthTest={false} />
    </mesh>
  );
}

function Helmet({ glassAmount }) {
  const { scene } = useGLTF(model('helmet-21'), DRACO);
  const base = useTexture(glAsset('textures/helmet/webp/gold/Norris_Helmet_mat_BaseColor.webp'));
  base.colorSpace = THREE.SRGBColorSpace; base.flipY = false;
  const group = useRef();
  const { viewport, size } = useThree();

  const { solid, glass } = useMemo(() => {
    const solid = new THREE.MeshStandardMaterial({ map: base, roughness: 0.35, metalness: 0.2, transparent: true });
    // ghost shell + swept UV-grid 'structure' lines, see HelmetGhost.js
    const glass = makeGhostShellMaterial();
    return { solid, glass };
  }, [base]);

  const meshes = useMemo(() => { const out = []; scene.traverse((o) => { if (o.isMesh) out.push(o); }); return out; }, [scene]);

  const lineMat = useMemo(() => makeBlueprintMaterial(), []);
  // Every edge of every part (shell, aero cover with vents and ear pods, visor). An earlier "ear-cup
  // pocket" filter (a sphere around the lower part of the aero piece, meant to drop the shell's ear-cup
  // rings) was centred on the side wings instead and erased the shell edges just inside the dome
  // silhouette: a ~12 px blank ring between the outline and the blueprint that the original does not have.
  // Measured at 1440x900, row y=100: lines now start 1 px behind the outline, as on the original.
  const blueprint = useMemo(() => meshes.map((m) => makeBlueprintLines(m, lineMat)), [meshes, lineMat]);
  // Depth-only wall: front faces write depth first so lines on the far side / inner lining are culled.
  const depthMat = useMemo(() => new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true, side: THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 }), []);
  const depthGroup = useRef();
  const outlineMat = useMemo(() => makeOutlineMaterial(), []);
  const hullGroup = useRef();
  const inner = useRef();
  useEffect(() => {
    // normalise line height against the placed helmet's world bounds (top = 1, chin = 0)
    if (!inner.current) return;
    inner.current.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(inner.current);
    glass.uniforms.uMinY.value = box.min.y; glass.uniforms.uMaxY.value = box.max.y;
    lineMat.uniforms.uMinY.value = box.min.y; lineMat.uniforms.uMaxY.value = box.max.y;
    outlineMat.uniforms.uMinY.value = box.min.y; outlineMat.uniforms.uMaxY.value = box.max.y;
  }, [glass, lineMat, meshes]);

  const params = import.meta.env.DEV ? new URLSearchParams(location.search) : null;
  const debugMode = params ? params.get('debug') : null;
  // ?pitch=<deg> / ?hy=<world units> / ?hs=<scale>: override the helmet pitch, height and scale for fitting shots
  const num = (k, dflt) => { const v = params && params.get(k); return v === null || v === '' || isNaN(+v) ? dflt : +v; };
  const pitchDeg = num('pitch', HELMET_PITCH_DEG), heroY = num('hy', helmetY(size.width)), heroS = num('hs', HELMET_SCALE[0]);
  const debugWire = debugMode === 'wire';
  // ?debug=lines: freeze the pulse with every blueprint line lit, for still comparisons
  const debugLines = debugMode === 'lines';
  // ?debug=shell: hide the blueprint lines to inspect the envelope/rim alone
  const debugShell = debugMode === 'shell';
  // ?debug=nowall: lines fully lit like 'lines' but without the depth prepass (to see what the wall hides)
  const debugNoWall = debugMode === 'nowall';
  // ?debug=wire draws front-facing triangles only, so back-of-helmet edges do not fill the picture
  const wireMats = useMemo(() => ({ helmet: new THREE.MeshBasicMaterial({ color: 0xc03030, wireframe: true, transparent: true, opacity: 0.55, side: THREE.FrontSide }), glass: new THREE.MeshBasicMaterial({ color: 0x3050c0, wireframe: true, transparent: true, opacity: 0.55, side: THREE.FrontSide }), plastic: new THREE.MeshBasicMaterial({ color: 0x30a040, wireframe: true, transparent: true, opacity: 0.55, side: THREE.FrontSide }) }), []);
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
    lineMat.uniforms.uFloor.value = debugLines || debugNoWall ? 1 : 0;
    glass.uniforms.uRimFloor.value = debugLines || debugShell || debugNoWall ? 1 : 0.7; // frozen debug views show the rim fully
    outlineMat.uniforms.uTime.value = state.clock.elapsedTime;
    outlineMat.uniforms.uOpacity.value = 0.22 * g;
    outlineMat.uniforms.uRimFloor.value = debugLines || debugShell || debugNoWall ? 1 : 0.7;
    if (hullGroup.current) hullGroup.current.visible = g > 0.5 && !debugNoWall; // nowall = lines only
    for (const l of blueprint) l.visible = g > 0.5;
    if (depthGroup.current) depthGroup.current.visible = g > 0.5 && !debugNoWall; // the depth wall only matters in the ghost state
  });

  // The GLB is in its own small units (0.077 tall); the original's transform (scale, y, pitch) places it
  // around the portrait's head with no bounding-box fitting. v2 had fitted 0.68 vh and a y offset by
  // line-map extents; the numbers were within 2 % of this, the shape differences came from the camera.
  const scale = [heroS, heroS, heroS * HELMET_SCALE[2] / HELMET_SCALE[0]];
  // inverted-hull outline: 2 px at the current viewport, converted to the helmet's object units
  outlineMat.uniforms.uOffset.value = (2 * viewport.height / size.height) / heroS;
  return (
    <group ref={group} position={[0, heroY, 0]} rotation={[THREE.MathUtils.degToRad(pitchDeg), 0, 0]}> {/* +X pitch: crown toward the viewer, visor looks down */}
      <group ref={inner} scale={scale}>
        <primitive object={scene} />
        {blueprint.map((l) => <primitive key={l.name} object={l} />)}
        <group ref={hullGroup}>
          {meshes.map((m) => <mesh key={'hull-' + m.name} geometry={m.geometry} material={outlineMat} />)}
        </group>
        <group ref={depthGroup}>
          {meshes.map((m) => <mesh key={'depth-' + m.name} geometry={m.geometry} material={depthMat} />)}
        </group>
      </group>
    </group>
  );
}

function Rig({ progress }) {
  const { camera, size } = useThree();
  useFrame(() => {
    // scroll-out: the whole hero drifts up and away as the page scrolls into the marquee section
    // (baseline guess, kept proportional to the 0.79-unit world height; the original moves its camera
    // group by +0.1 and scrolls the composited plane with the page: to be matched later)
    camera.position.y = -progress.current * 1.2;
    camera.position.z = camZ(size.width) + progress.current * 0.9;
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
