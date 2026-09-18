import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useTexture } from '@react-three/drei';
import Env from './Env';
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
// Phones: the portrait drops by 0.05 as the helmet does (both move together), so the head stays inside
// the helmet across the breakpoint. Missing this made the face fill the visor below 768 px.
const headY = (width) => (width > 768 ? 0 : -0.05);
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
  const { size } = useThree();
  // Writes depth and is drawn before the blueprint lines (renderOrder 0 vs 1), as the original's sort
  // order ends up doing: lines behind the relief fail the depth test, lines in front blend over the skin.
  return (
    <mesh position={[0, headY(size.width), 0]} renderOrder={0}>
      <planeGeometry args={[1, 1, 128, 128]} />
      <shaderMaterial ref={mat} vertexShader={portraitVert} fragmentShader={portraitFrag} uniforms={uniforms} transparent depthWrite depthTest />
    </mesh>
  );
}

function Helmet({ glassAmount }) {
  const { scene } = useGLTF(model('helmet-21'), DRACO);
  const base = useTexture(glAsset('textures/helmet/webp/gold/Norris_Helmet_mat_BaseColor.webp'));
  base.colorSpace = THREE.SRGBColorSpace; base.flipY = false;
  const group = useRef();
  const { size } = useThree();

  const solid = useMemo(() => new THREE.MeshStandardMaterial({ map: base, roughness: 0.35, metalness: 0.2, transparent: true }), [base]);

  const meshes = useMemo(() => { const out = []; scene.traverse((o) => { if (o.isMesh) out.push(o); }); return out; }, [scene]);

  const lineMat = useMemo(() => makeBlueprintMaterial(), []);
  // Every edge of every part (shell, aero cover with vents and ear pods, visor). An earlier "ear-cup
  // pocket" filter (a sphere around the lower part of the aero piece, meant to drop the shell's ear-cup
  // rings) was centred on the side wings instead and erased the shell edges just inside the dome
  // silhouette: a ~12 px blank ring between the outline and the blueprint that the original does not have.
  // Measured at 1440x900, row y=100: lines now start 1 px behind the outline, as on the original.
  const blueprint = useMemo(() => meshes.map((m) => makeBlueprintLines(m, lineMat)), [meshes, lineMat]);
  // No self-occlusion and no separate outline, like the original: the silhouette band is the edge-on
  // triangles of the shell drawn as lines; the portrait relief (drawn first, depth-tested) covers what
  // sits behind the face. Measured on the recordings, row 100 at 1440x900, 40 ms after the front: rim
  // 223-228 here vs 232-235 on the original; an extra inverted-hull outline only made it crisper and darker.
  const inner = useRef();

  const params = import.meta.env.DEV ? new URLSearchParams(location.search) : null;
  const debugMode = params ? params.get('debug') : null;
  // ?pitch=<deg> / ?hy=<world units> / ?hs=<scale>: override the helmet pitch, height and scale for fitting shots
  const num = (k, dflt) => { const v = params && params.get(k); return v === null || v === '' || isNaN(+v) ? dflt : +v; };
  const pitchDeg = num('pitch', HELMET_PITCH_DEG), heroY = num('hy', helmetY(size.width)), heroS = num('hs', HELMET_SCALE[0]);
  const debugWire = debugMode === 'wire';
  // ?debug=lines: freeze the pulse with every blueprint line lit, for still comparisons
  const debugLines = debugMode === 'lines';
  // ?debug=wire draws front-facing triangles only, so back-of-helmet edges do not fill the picture
  const wireMats = useMemo(() => ({ helmet: new THREE.MeshBasicMaterial({ color: 0xc03030, wireframe: true, transparent: true, opacity: 0.55, side: THREE.FrontSide }), glass: new THREE.MeshBasicMaterial({ color: 0x3050c0, wireframe: true, transparent: true, opacity: 0.55, side: THREE.FrontSide }), plastic: new THREE.MeshBasicMaterial({ color: 0x30a040, wireframe: true, transparent: true, opacity: 0.55, side: THREE.FrontSide }) }), []);
  useFrame((state, dt) => {
    const g = glassAmount.current;
    if (debugWire) { for (const m of meshes) { m.visible = true; m.material = wireMats[m.name] || wireMats.helmet; } return; }
    for (const m of meshes) {
      // intro: the solid helmet fades out; in the ghost state the body is invisible on the original
      // (measured: page colour between pulses), only the lines and the outline remain
      m.material = solid;
      solid.opacity = 1 - g;
      m.visible = g < 0.999;
    }
    lineMat.uniforms.uTime.value = state.clock.elapsedTime;
    lineMat.uniforms.uOpacity.value = 0.1 * g;
    lineMat.uniforms.uFloor.value = debugLines ? 1 : 0;
    for (const l of blueprint) l.visible = g > 0.5;
  });

  // The GLB is in its own small units (0.077 tall); the original's transform (scale, y, pitch) places it
  // around the portrait's head with no bounding-box fitting. v2 had fitted 0.68 vh and a y offset by
  // line-map extents; the numbers were within 2 % of this, the shape differences came from the camera.
  const scale = [heroS, heroS, heroS * HELMET_SCALE[2] / HELMET_SCALE[0]];
  return (
    <group ref={group} position={[0, heroY, 0]} rotation={[THREE.MathUtils.degToRad(pitchDeg), 0, 0]}> {/* +X pitch: crown toward the viewer, visor looks down */}
      <group ref={inner} scale={scale}>
        <primitive object={scene} />
        {blueprint.map((l) => <primitive key={l.name} object={l} />)}
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

  // Original: pixel ratio capped at 1.25 on desktop (2 on phones) and no MSAA on this scene, which is
  // what keeps the blueprint lines 1 px and crisp.
  const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth > 768 ? 1.25 : 2);
  return (
    <Canvas className="!absolute inset-0" dpr={dpr} camera={{ position: [0, 0, CAM_Z], fov: FOV, near: 0.1, far: 100 }} gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}>
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
