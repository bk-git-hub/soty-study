import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { REVEAL_MASK_GLSL } from './FluidSim';
import { SCROLL_FILTER_GLSL } from './scrollOut';

/*
 * The hero background: slowly flowing contour lines ("white waves").
 *
 * How the original builds it (mechanism and numbers observed in its bundle, written here from scratch):
 *  pass 1, into a render target the size of the page in CSS px:
 *    - a 3D simplex noise sampled at (x, y, time): time is the third axis, so the pattern morphs
 *      instead of scrolling;
 *    - its coordinates are first bent by a second, ten times slower noise (domain warping), which is
 *      why the lines stretch and curl rather than drift rigidly;
 *    - the 0..1 value is multiplied by 3 and wrapped with fract(), then cut at 0.5: three repeats of a
 *      0/1 band across the value range, exactly like elevation bands on a map;
 *    - while the pointer moves, a cone around it (scaled by the eased pointer speed) pushes the
 *      coordinates, so the bands bulge away from the cursor and relax when it stops.
 *  pass 2, on screen: only the band *borders* are drawn, one pixel each side, in a pale grey-green
 *  on the page colour. (The band fill is used later by the cursor paint; see the reveal work.)
 *
 * R = band (0/1), G = the wrapped noise value, kept for the paint / hover steps that read it.
 *
 * The same component also draws the dark layer behind the hero (palette="dark", its own small canvas):
 * on scroll the light page shrinks to a rectangle and the dark page around it carries the same flowing
 * lines. On the original the lines inside the rectangle are a scaled-down copy of the ones outside
 * (they do not join at the rectangle's edge), so both canvases run the noise on one shared clock.
 */

// params of the original's head scene
const COLOR_BACKGROUND = '#F8F8F3';
const COLOR_OUTLINE = '#CBCBB9';
// inside the cursor paint: band 0, band 1, and the borders between them
const COLOR_CURSOR_BACKGROUND = '#E8E8DF';
const COLOR_CURSOR_FOREGROUND = '#CFD2C5';
const COLOR_CURSOR_OUTLINE = '#E8E8DF';
// the dark page around the shrinking rectangle, as measured on screen (page 40,44,32, lines 54,59,37)
const DARK_BACKGROUND = [40, 44, 32], DARK_OUTLINE = [54, 59, 37];
// one clock for every instance, so the dark layer and the hero show the same field at the same moment
const T0 = performance.now();
const wavesTime = () => (performance.now() - T0) / 1000;
const SCALE = 1, SPEED = 0.1, DISTORT_SCALE = 1, DISTORT_INTENSITY = 0.5, NOISE_DETAIL = 3;
const CURSOR_INTENSITY = 0.15, CURSOR_SCALE = 3, CURSOR_BOUNCE = -0.75;

// 3D simplex noise: the public-domain/MIT "webgl-noise" implementation by Ian McEwan and Stefan
// Gustavson (Ashima Arts), https://github.com/stegu/webgl-noise. Returns -1..1.
const SIMPLEX = /* glsl */ `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }
`;

const QUAD_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const NOISE_FRAG = /* glsl */ `
  precision highp float;
  ${SIMPLEX}
  varying vec2 vUv;
  uniform float uAspect, uTime, uPace;
  uniform vec2 uMouse; // -1..1, +y up
  void main() {
    vec2 uv = vUv; uv.x *= uAspect;
    // cone around the pointer, alive only while it moves (uPace = eased speed)
    vec2 mouse = uMouse * 0.5 + 0.5; mouse.x *= uAspect;
    float cursor = clamp((1.0 - distance(mouse, uv) * ${CURSOR_SCALE.toFixed(1)}) * uPace, ${CURSOR_BOUNCE.toFixed(2)}, 1.0);
    // slow noise that bends the coordinates of the main one
    float warp = 0.5 + 0.5 * snoise(vec3(uv * ${DISTORT_SCALE.toFixed(1)}, uTime * ${(SPEED * 0.1).toFixed(3)}));
    vec2 q = (uv + cursor * ${CURSOR_INTENSITY.toFixed(2)} + warp * ${DISTORT_INTENSITY.toFixed(2)}) * ${SCALE.toFixed(1)};
    float n = 0.5 + 0.5 * snoise(vec3(q, uTime * ${SPEED.toFixed(2)}));
    n = fract(n * ${NOISE_DETAIL.toFixed(1)});          // wrap: three 0..1 ramps over the value range
    gl_FragColor = vec4(step(0.5, n), n, 0.0, 1.0);   // R = band, G = wrapped value
  }
`;

// Border test: a pixel is on a contour if any of its four neighbours lies in the other band. That marks
// one texel on each side of every boundary: lines 2 CSS px wide, which is what the original shows
// (measured on its screenshot: horizontal runs of 2 px across near-vertical lines).
// (The original gets there by sampling a linearly filtered texture 5e-6 uv away and testing `!=`; with
// an exactly texel-aligned quad that difference rounds to zero on this GPU, so the neighbours are
// read explicitly here.)
const SCREEN_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D tNoise, tVelocity;
  uniform vec2 uTexel;
  uniform float uDebug, uHover, uAlive;
  uniform vec3 uBackground, uOutline, uCursorBackground, uCursorForeground, uCursorOutline;
  ${REVEAL_MASK_GLSL}
  ${SCROLL_FILTER_GLSL}
  void main() {
    float c = texture2D(tNoise, vUv).r;
    float e = 0.0;
    if (texture2D(tNoise, vUv + vec2(uTexel.x, 0.0)).r != c) e = 1.0;
    if (texture2D(tNoise, vUv - vec2(uTexel.x, 0.0)).r != c) e = 1.0;
    if (texture2D(tNoise, vUv + vec2(0.0, uTexel.y)).r != c) e = 1.0;
    if (texture2D(tNoise, vUv - vec2(0.0, uTexel.y)).r != c) e = 1.0;
    vec3 page = mix(uBackground, uOutline, e);
    // The paint: inside the reveal mask the same bands are *filled* (band 0 / band 1 in two greys) and
    // the borders take the lighter grey, so the stroke follows the grain of the waves instead of being
    // a flat blob. Outside the mask only the borders show.
    vec3 painted = mix(mix(uCursorBackground, uCursorForeground, c), uCursorOutline, e);
    // uAlive: the paint (and the helmet-row hover) exists only above the scroll-out's breakpoint
    float mask = max(revealMask(tVelocity, vUv), hoverMask(vUv, uHover)) * uAlive;
    gl_FragColor = vec4(filterPage(mix(page, painted, mask)), 1.0);
    #include <colorspace_fragment>
    if (uDebug > 1.5) {
      // ?debug=mask: the fluid's velocity as a colour (white = still; x in red, y in green around 0.5)
      // and the reveal mask it produces in flat magenta (a colour nothing else on the page has, so the
      // measuring script can count it exactly)
      vec2 v = texture2D(tVelocity, 0.025 + vUv * 0.95).xy;
      vec3 field = mix(vec3(1.0), vec3(v * 0.5 + 0.5, 1.0), min(length(v), 1.0));
      gl_FragColor = vec4(mix(field, vec3(1.0, 0.0, 1.0), revealMask(tVelocity, vUv)), 1.0);
    } else if (uDebug > 0.5) gl_FragColor = vec4(texture2D(tNoise, vUv).rg, 0.0, 1.0); // ?debug=noise: raw band / value
  }
`;

export default function BackgroundWaves({ pointer, reveal, view, palette = 'light', active }) {
  const { size, gl } = useThree();
  // The noise lives at CSS-pixel resolution like the original's (not multiplied by the pixel ratio).
  // A plain 8-bit target is enough: it stores a 0/1 band and a 0..1 ramp.
  const fbo = useMemo(() => new THREE.WebGLRenderTarget(16, 16, { depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false, type: THREE.UnsignedByteType }), []);
  useEffect(() => () => fbo.dispose(), [fbo]);
  if (fbo.width !== size.width || fbo.height !== size.height) fbo.setSize(size.width, size.height);
  const off = useMemo(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const material = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT, fragmentShader: NOISE_FRAG, depthTest: false, depthWrite: false,
      uniforms: { uAspect: { value: 1 }, uTime: { value: 0 }, uPace: { value: 0 }, uMouse: { value: new THREE.Vector2() } },
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    mesh.frustumCulled = false; scene.add(mesh);
    return { scene, camera, material };
  }, []);
  const screen = useRef();
  // The original feeds its hex colours to the shader as if they were linear and then sRGB-encodes the
  // output, so what reaches the screen is lighter than the hex: page 252,252,250 and lines 231,231,221
  // (measured), not 248,248,243 / 203,203,185. Same here: no sRGB -> linear conversion on the way in.
  const uniforms = useMemo(() => ({
    tNoise: { value: null }, tVelocity: { value: null }, uHover: { value: 0 }, uAlive: { value: 1 }, uFilter: { value: 0 }, uTexel: { value: new THREE.Vector2(1, 1) },
    uDebug: { value: import.meta.env.DEV ? ({ noise: 1, mask: 2 })[new URLSearchParams(location.search).get('debug')] || 0 : 0 },
    // (the dark pair was measured on screen, so it goes in as real sRGB and comes out as measured)
    uBackground: { value: palette === 'dark' ? new THREE.Color().setRGB(...DARK_BACKGROUND.map((v) => v / 255), THREE.SRGBColorSpace) : new THREE.Color().setStyle(COLOR_BACKGROUND, THREE.LinearSRGBColorSpace) },
    uOutline: { value: palette === 'dark' ? new THREE.Color().setRGB(...DARK_OUTLINE.map((v) => v / 255), THREE.SRGBColorSpace) : new THREE.Color().setStyle(COLOR_OUTLINE, THREE.LinearSRGBColorSpace) },
    uCursorBackground: { value: new THREE.Color().setStyle(COLOR_CURSOR_BACKGROUND, THREE.LinearSRGBColorSpace) },
    uCursorForeground: { value: new THREE.Color().setStyle(COLOR_CURSOR_FOREGROUND, THREE.LinearSRGBColorSpace) },
    uCursorOutline: { value: new THREE.Color().setStyle(COLOR_CURSOR_OUTLINE, THREE.LinearSRGBColorSpace) },
  }), [palette]);
  const local = useMemo(() => new THREE.Vector2(), []);

  useFrame(() => {
    // the dark layer is hidden behind the hero until the page scrolls: nothing to draw
    if (active && !active()) { if (screen.current) screen.current.visible = false; return; }
    if (screen.current) screen.current.visible = true;
    const u = off.material.uniforms;
    // inside the shrinking rectangle the field keeps the rectangle's proportions, and the pointer is
    // taken in the rectangle's own space (the quad below fills the viewport = the rectangle)
    u.uAspect.value = view ? view.w / view.h : size.width / size.height;
    u.uTime.value = wavesTime();
    if (pointer) { if (view) view.toLocal(pointer.eased.current, local); else local.copy(pointer.eased.current); u.uMouse.value.copy(local); u.uPace.value = pointer.pace.current * 4; }
    gl.setRenderTarget(fbo);
    gl.render(off.scene, off.camera);
    gl.setRenderTarget(null);
    // Set through the live material: R3F copies the `uniforms` prop into the material's own object, so
    // writing to ours after mount never reaches the shader (the texture stayed null = black for an hour).
    const su = screen.current.material.uniforms;
    su.tNoise.value = fbo.texture;
    su.tVelocity.value = reveal ? reveal.texture : null;
    su.uHover.value = reveal ? reveal.hover || 0 : 0;
    su.uAlive.value = reveal ? (view ? view.alive : 1) : 0;
    su.uFilter.value = view ? view.e : 0;
    su.uTexel.value.set(1 / size.width, 1 / size.height);
  });

  // full-screen quad drawn first (renderOrder -10), no depth: everything else paints over it
  return (
    <mesh ref={screen} renderOrder={-10} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial vertexShader={QUAD_VERT} fragmentShader={SCREEN_FRAG} uniforms={uniforms} depthTest={false} depthWrite={false} />
    </mesh>
  );
}
