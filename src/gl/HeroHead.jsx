import { Suspense, memo, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import Env from './Env';
import BackgroundWaves from './BackgroundWaves';
import RevealMask from './RevealMask';
import HelmetPaint from './HelmetPaint';
import { REVEAL_MASK_GLSL } from './FluidSim';
import { SCROLL_FILTER_GLSL, TARGET_REM, CAMERA_DOLLY, ALIVE_UNTIL, ALIVE_FADE, power1InOut, rectAt } from './scrollOut';
import { makeBlueprintMaterial, makeBlueprintLines } from './BlueprintLines';
import { useHelmetScene } from './useHelmetScene';
import * as THREE from 'three';
import { hdri } from '../lib/assets';

/*
 * The hero of the original is one shared WebGL canvas. The visible parts are:
 *  - a portrait plane using diffuse + depth + alpha maps. The depth map displaces the plane's
 *    vertices toward the camera (a relief), so the face reads as 3D under the perspective camera.
 *  - the helmet (our code-built model, gl/toonHelmetModel.js), seen two ways: as blueprint lines that pulse around the head
 *    (BlueprintLines), and as the real painted helmet, which only shows where the cursor's fluid
 *    trail has "painted" it on (FluidSim -> RevealMask -> HelmetPaint);
 *  - the flowing contour background, painted by the same trail (BackgroundWaves).
 * On scroll the whole scene is drawn into a shrinking viewport (see scrollOut.js and Rig below).
 */

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
  uniform sampler2D uShadow; uniform sampler2D tVelocity; uniform vec4 uRect; uniform float uMaskOn; uniform float uHover;
  uniform vec2 uMouse; uniform float uStrength; uniform float uReveal;
  varying vec2 vUv;
  ${REVEAL_MASK_GLSL}
  ${SCROLL_FILTER_GLSL}
  void main() {
    // depth in [0,1]; centre it so near pixels move one way and far pixels the other
    float d = texture2D(uDepth, vUv).r - 0.5;
    vec2 uv = vUv + d * uMouse * uStrength;
    vec4 c = texture2D(uDiffuse, uv);
    // Where the helmet is painted on, the photo switches to a second version of itself with the
    // helmet's shadow baked in (darker neck and collar). Most of it is hidden behind the helmet; what
    // shows is the shadow on everything the helmet does not cover. The mask lives in the rectangle's own
    // 0..1 space; gl_FragCoord is in window pixels, so the rectangle's corner comes off first.
    vec2 pageUv = (gl_FragCoord.xy - uRect.xy) / uRect.zw;
    float painted = max(revealMaskHead(tVelocity, pageUv), hoverMask(pageUv, uHover)) * uMaskOn;
    c = mix(c, texture2D(uShadow, uv), painted);
    float a = texture2D(uAlpha, uv).r;
    gl_FragColor = vec4(filterPhoto(c.rgb), a * uReveal);
    // the diffuse map is sRGB and gets decoded to linear on sampling; a ShaderMaterial does not
    // re-encode on its own, and without this the portrait rendered darker and more saturated than the
    // original (forehead 244,170,134 vs 248,212,191 on the reference: exactly one missing gamma)
    #include <colorspace_fragment>
  }
`;

/*
 * Pointer-follow, as the original does it (bundle: head class params movement.intensity 0.075 /
 * ease 0.025, mouse class normalized = (clientX / w * 2 - 1, -(clientY / h * 2 - 1)), eased with
 * MathUtils.damp(v, target, 0.025, dt) where dt = seconds * 100 capped at 1/30 s, i.e. a 2.5 / s decay):
 *  - head plane:  rotation.y =  eased.x * 0.075,  rotation.x = -eased.y * 0.075 * (1 - scroll)  (x only > 768 px)
 *  - helmet:      the head's rotation / 1.5, plus its fixed 10.8 deg pitch
 *  - camera:      x = eased.x * 0.02,  y = -eased.y * 0.02 * (1 - scroll)  (y only > 768 px)
 * The head turns toward the cursor side; the user reads the result as "moving slightly against the
 * cursor" because the photo is a relief seen from a moving camera. Verified side by side, not assumed.
 */
const FOLLOW_INTENSITY = 0.075;
const FOLLOW_DECAY = 2.5;
const PACE_DECAY = 1.0;
const CAMERA_NUDGE = 0.02;
function usePointer() {
  const target = useRef(new THREE.Vector2());
  const eased = useRef(new THREE.Vector2());
  // time (s) of the last real pointer move; null until the first one. The reveal's automatic cursor
  // takes over when this gets old (see RevealMask).
  const lastMove = useRef(null);
  useEffect(() => {
    const set = (x, y) => target.current.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    const onMouse = (e) => { set(e.clientX, e.clientY); lastMove.current = performance.now() / 1000; };
    const onTouch = (e) => { if (e.touches && e.touches[0]) { set(e.touches[0].pageX, e.touches[0].pageY); lastMove.current = performance.now() / 1000; } };
    document.addEventListener('mousemove', onMouse);
    document.addEventListener('touchmove', onTouch, { passive: true });
    return () => { document.removeEventListener('mousemove', onMouse); document.removeEventListener('touchmove', onTouch); };
  }, []);
  // pointer speed: distance moved since the previous frame (in normalized units, per frame like the
  // original), eased with a 1 / s decay (its damp factor 0.01). Drives the bulge in the background waves.
  const prev = useRef(new THREE.Vector2());
  const pace = useRef(0);
  const update = (dt) => {
    const d = Math.min(dt, 1 / 30);
    const k = 1 - Math.exp(-FOLLOW_DECAY * d);
    eased.current.x += (target.current.x - eased.current.x) * k;
    eased.current.y += (target.current.y - eased.current.y) * k;
    pace.current += (target.current.distanceTo(prev.current) - pace.current) * (1 - Math.exp(-PACE_DECAY * d));
    prev.current.copy(target.current);
  };
  return { target, eased, pace, lastMove, update };
}

function Portrait({ pointer, progress, mask, view }) {
  const [diffuse, depth, alpha, shadow] = useTexture([
    // the placeholder character in the photo's framing (scripts/make-hero-portrait.mjs)
    '/assets/hero/diffuse.webp',
    '/assets/hero/depth.webp',
    '/assets/hero/alpha.webp',
    '/assets/hero/shadow.webp',
  ]);
  diffuse.colorSpace = THREE.SRGBColorSpace;
  shadow.colorSpace = THREE.SRGBColorSpace;
  // The original flags the depth map sRGB too (bundle: textures.head.depth.colorSpace = SRGB), so the
  // relief is driven by the *decoded* value: shallower than the raw map (mid greys drop to ~1/4).
  // Found through the pointer-follow: with the raw map the face sat twice as deep, moved 60 % as much
  // sideways and 120 % as much vertically as the original, and read 4 % too large.
  depth.colorSpace = THREE.SRGBColorSpace;
  const uniforms = useMemo(() => ({
    uDiffuse: { value: diffuse }, uDepth: { value: depth }, uAlpha: { value: alpha },
    uMouse: { value: new THREE.Vector2() }, uStrength: { value: 0.03 }, uReveal: { value: 1 },
    uDisplace: { value: PORTRAIT_DISPLACE },
    uShadow: { value: shadow }, tVelocity: { value: null }, uRect: { value: new THREE.Vector4(0, 0, 1, 1) }, uMaskOn: { value: 0 }, uHover: { value: 0 }, uFilter: { value: 0 },
  }), [diffuse, depth, alpha, shadow]);
  const mat = useRef();
  const mesh = useRef();
  const { size, gl } = useThree();
  const buffer = useMemo(() => new THREE.Vector2(), []);
  // dev-only: ?disp=<units> and ?seg=<n> override the relief depth and the plane's segment count
  const dbg = import.meta.env.DEV ? new URLSearchParams(location.search) : null;
  const dnum = (k, dflt) => { const v = dbg && dbg.get(k); return v === null || v === '' || isNaN(+v) ? dflt : +v; };
  const seg = dnum('seg', 128);
  uniforms.uDisplace.value = dnum('disp', PORTRAIT_DISPLACE);
  useFrame((_, dt) => {
    const u = mat.current.uniforms;
    // the reveal mask, in page space (see the fragment shader)
    u.tVelocity.value = mask.texture;
    u.uMaskOn.value = mask.texture ? view.alive : 0;
    u.uHover.value = mask.hover || 0;
    u.uFilter.value = view.e;
    // the rectangle in buffer pixels, origin bottom-left like gl_FragCoord
    gl.getDrawingBufferSize(buffer);
    const k = buffer.x / size.width;
    u.uRect.value.set(view.x * k, (size.height - view.y - view.h) * k, view.w * k, view.h * k);
    const m = pointer.eased.current, follow = mask.follow;
    mesh.current.rotation.y = m.x * FOLLOW_INTENSITY * follow;
    mesh.current.rotation.x = size.width > 768 ? -m.y * FOLLOW_INTENSITY * follow * (1 - progress.current) : 0;
  });
  // The photo is square (2549^2) and fills a 1 x 1 plane at the origin: 127 % of the viewport height with
  // the camera above. (v1 had fitted 1.2 vh by overlay; the missing 6 % was the relief, not the plane.)
  // Writes depth and is drawn before the blueprint lines (renderOrder 0 vs 1), as the original's sort
  // order ends up doing: lines behind the relief fail the depth test, lines in front blend over the skin.
  return (
    <mesh ref={mesh} position={[0, headY(size.width), 0]} renderOrder={0}>
      <planeGeometry args={[1, 1, seg, seg]} />
      <shaderMaterial ref={mat} vertexShader={portraitVert} fragmentShader={portraitFrag} uniforms={uniforms} transparent depthWrite depthTest />
    </mesh>
  );
}

function Helmet({ pointer, progress, rig, mask, view }) {
  const scene = useHelmetScene();
  const group = useRef();
  const { size } = useThree();

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
  // the scaled group; the painted helmet (HelmetPaint) copies its world matrix so both stay registered
  const inner = rig;

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
    if (debugWire) { for (const m of meshes) { m.visible = true; m.material = wireMats[m.name] || wireMats.helmet; } return; }
    lineMat.uniforms.uTime.value = state.clock.elapsedTime;
    lineMat.uniforms.uOpacity.value = 0.1 * view.wire;
    lineMat.uniforms.uFloor.value = debugLines ? 1 : 0;
    // pointer-follow: the head's rotation at 1/1.5, on top of the fixed pitch (see usePointer)
    const m = pointer.eased.current;
    const follow = mask.follow;
    const headX = size.width > 768 ? -m.y * FOLLOW_INTENSITY * follow * (1 - progress.current) : 0;
    group.current.rotation.x = THREE.MathUtils.degToRad(pitchDeg) + headX / 1.5;
    group.current.rotation.y = (m.x * FOLLOW_INTENSITY * follow) / 1.5;
  });

  // The GLB is in its own small units (0.077 tall); the original's transform (scale, y, pitch) places it
  // around the portrait's head with no bounding-box fitting. v2 had fitted 0.68 vh and a y offset by
  // line-map extents; the numbers were within 2 % of this, the shape differences came from the camera.
  const scale = [heroS, heroS, heroS * HELMET_SCALE[2] / HELMET_SCALE[0]];
  return (
    <group ref={group} position={[0, heroY, 0]} rotation={[THREE.MathUtils.degToRad(pitchDeg), 0, 0]}> {/* +X pitch: crown toward the viewer, visor looks down */}
      <group ref={inner} scale={scale}>
        {/* the body itself is never drawn here: the painted helmet lives in HelmetPaint. ?debug=wire only */}
        {debugWire && <primitive object={scene} />}
        {blueprint.map((l) => <primitive key={l.name} object={l} />)}
      </group>
    </group>
  );
}

// The helmet row's hover (see hoverMask in FluidSim.js). Timing estimated from screencast frames of the
// original: nothing visible for ~0.65 s after the pointer arrives, then the curtain crosses most of the
// page in ~0.3 s and is done at ~1.0 s; the way back is quiet for ~0.57 s and then gone in 0.1-0.2 s.
// Long quiet start + fast middle = an expo-like in-out; inverting it gives ~1.6 s in, ~1.2 s out.
// (Estimates: the capture's time stamps wobble by ~50 ms while the page is busy.)
// Graded against the bundle afterwards: expo.inOut was right; the real lengths are 1.5 s in and 1.0 s
// out (estimated 1.6-1.7 and 1.1-1.2). One thing observation had missed entirely: while the helmet is
// shown this way, the pointer-follow of head, helmet and camera is eased to zero (power1.inOut over the
// same lengths), so the helmet faces straight ahead; it comes back on the way out. Both values restart
// from wherever they are when the pointer changes its mind (GSAP's overwrite), not along the old curve.
const HOVER_IN = 1.5, HOVER_OUT = 1.0;
const expoInOut = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u < 0.5 ? Math.pow(2, 20 * u - 10) / 2 : 1 - Math.pow(2, -20 * u + 10) / 2);

function Rig({ progress, pointer, helmetHover, mask, view }) {
  const { camera, size, gl } = useThree();
  const tween = useRef({ goal: 0, t: 0, fromHover: 0, fromFollow: 1 });
  // the landing box is sized in rem; read the root font size when the canvas is measured, not per frame
  const rem = useMemo(() => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16, [size.width, size.height]);
  useFrame((_, dt) => {
    pointer.update(dt);
    const tw = tween.current, want = helmetHover?.current ? 1 : 0;
    if (want !== tw.goal) { tw.goal = want; tw.t = 0; tw.fromHover = mask.hover; tw.fromFollow = mask.follow; }
    tw.t += Math.min(dt, 0.1);
    const u = Math.min(1, tw.t / (tw.goal ? HOVER_IN : HOVER_OUT));
    mask.hover = tw.fromHover + (tw.goal - tw.fromHover) * expoInOut(u);             // the curtain
    mask.follow = tw.fromFollow + (1 - tw.goal - tw.fromFollow) * power1InOut(u);   // pointer-follow strength
    const m = pointer.eased.current, p = progress.current;
    // pointer-follow: the camera is nudged with the eased cursor (see usePointer)
    camera.position.x = m.x * CAMERA_NUDGE * mask.follow;
    camera.position.y = size.width > 768 ? -m.y * CAMERA_NUDGE * mask.follow * (1 - p) : 0;

    // Scroll-out (scrollOut.js): the scene is drawn into a viewport that shrinks from the whole screen
    // to the landing box. With the camera's aspect set to the rectangle's, the picture scales with the
    // rectangle's height and shows more to the sides when the rectangle gets relatively wider: what
    // the original does on a narrow screen. (The day-0 guess moved the camera up and back instead.)
    view.vw = size.width; view.vh = size.height; view.p = p; view.e = power1InOut(Math.min(1, Math.max(0, p)));
    rectAt(view.e, size.width, size.height, TARGET_REM[0] * rem, TARGET_REM[1] * rem, view);
    // ...while the camera moves in, so the face ends up larger in the box than a pure shrink would leave it
    camera.position.z = camZ(size.width) - CAMERA_DOLLY * view.e;
    // alive below the breakpoint; crossing it starts a short fade (not tied to the scroll position)
    const aliveGoal = p < ALIVE_UNTIL ? 1 : 0, step = Math.min(dt, 0.1) / ALIVE_FADE;
    view.alive = aliveGoal > view.alive ? Math.min(1, view.alive + step) : Math.max(0, view.alive - step);
    view.wire = Math.min(1, Math.max(0, 1 - p / ALIVE_UNTIL));
    // Outside the rectangle the canvas must stay transparent. three's automatic clear obeys the scissor,
    // so without a full clear first the area the rectangle has just left keeps its old pixels.
    gl.setScissorTest(false); gl.setViewport(0, 0, size.width, size.height); gl.clear();
    const vy = size.height - view.y - view.h; // three's viewport origin is bottom-left
    gl.setViewport(view.x, vy, view.w, view.h); gl.setScissor(view.x, vy, view.w, view.h); gl.setScissorTest(true);
    const aspect = view.w / view.h;
    if (Math.abs(camera.aspect - aspect) > 1e-6) { camera.aspect = aspect; camera.updateProjectionMatrix(); }
  });
  return null;
}

// Tells the page that the hero can be shown: everything under <Suspense> has loaded (this component is
// inside it), the studio HDRI has arrived (the painted helmet is black without it), and the frames have
// become *smooth*. The loader waits for this before it opens.
// Why smooth and not just "a few frames": the first frames after loading are the most expensive of the
// whole session (shader compiles, texture uploads, the helmet material recompiling when the HDRI lands).
// Reporting at once made the loader play its 0.5 s exit inside a 0.58 s freeze: on the capture the lime
// was simply gone from one frame to the next.
const SMOOTH_FRAME = 1 / 40; // s
const SMOOTH_RUN = 12;       // consecutive frames
const GIVE_UP_AFTER = 3;     // s of trying once everything has loaded (slow machines still get in)
function ReadyProbe({ onReady }) {
  const { scene } = useThree();
  const run = useRef(0);
  const waited = useRef(0);
  const sent = useRef(false);
  useFrame((_, dt) => {
    if (sent.current || !scene.environment) return;
    waited.current += dt;
    run.current = dt < SMOOTH_FRAME ? run.current + 1 : 0;
    if (run.current >= SMOOTH_RUN || waited.current > GIVE_UP_AFTER) { sent.current = true; onReady?.(); }
  });
  return null;
}

// The hero has no intro of its own. On the original the loader's "4" opens onto a hero that is already
// in its final state (photo, pulsing blueprint, the automatic cursor painting); the day-0 build had
// invented a solid helmet dissolving into glass here.
// Canvas settings live outside the component: R3F reconfigures the renderer when it is handed new
// `gl` / `camera` objects, and an inline literal is a new object on every render.
const GL_CONFIG = { antialias: false, alpha: true, powerPreference: 'high-performance' };
const CAMERA_CONFIG = { position: [0, 0, CAM_Z], fov: FOV, near: 0.1, far: 100 };

function HeroHead({ onReady, progressRef, helmetHover }) {
  const fallback = useRef(0);
  const progress = progressRef || fallback;

  // Original: pixel ratio capped at 1.25 on desktop (2 on phones) and no MSAA on this scene, which is
  // what keeps the blueprint lines 1 px and crisp.
  const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth > 768 ? 1.25 : 2);
  const pointer = usePointer();
  // shared by everything the cursor "paints": { texture } = the fluid's velocity field (see RevealMask)
  const revealMask = useMemo(() => ({ texture: null, hover: 0, follow: 1 }), []);
  // the shrinking rectangle (CSS px, top-left origin) and the scroll-out's other values; written by Rig
  // every frame, read by everything that draws. toLocal: a pointer position in screen clip space
  // (-1..1) expressed in the rectangle's clip space, so the paint stays under the pointer.
  const view = useMemo(() => {
    const v = { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight, vw: window.innerWidth, vh: window.innerHeight, p: 0, e: 0, alive: 1, wire: 1 };
    v.toLocal = (c, out) => out.set((((c.x + 1) / 2 * v.vw - v.x) / v.w) * 2 - 1, 1 - (((1 - c.y) / 2 * v.vh - v.y) / v.h) * 2);
    return v;
  }, []);
  const helmetRig = useRef();
  return (
    <Canvas className="!absolute inset-0" dpr={dpr} camera={CAMERA_CONFIG} gl={GL_CONFIG}>
      <Env url={hdri('studio_small_08_1k--light')} intensity={1.2} />
      {/* mounted before the waves so its frame callback (the simulation step) runs before they draw */}
      <RevealMask pointer={pointer} reveal={revealMask} view={view} />
      <BackgroundWaves pointer={pointer} reveal={revealMask} view={view} />
      <Suspense fallback={null}>
        <Portrait pointer={pointer} progress={progress} mask={revealMask} view={view} />
        <Helmet pointer={pointer} progress={progress} rig={helmetRig} mask={revealMask} view={view} />
        <HelmetPaint reveal={revealMask} rig={helmetRig} view={view} />
        <Rig progress={progress} pointer={pointer} helmetHover={helmetHover} mask={revealMask} view={view} />
        <ReadyProbe onReady={onReady} />
      </Suspense>
      {/* no lights: the photo and the lines are unlit shaders, the painted helmet is lit by the HDRI alone */}
    </Canvas>
  );
}

// memo: the hero around it re-renders (loader done, route state); none of that concerns the canvas.
// Un-memoised, every parent render cost one frame of 0.5 to 1.3 s (measured while scrolling).
export default memo(HeroHead);
