import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { model } from '../lib/assets';
import { helmetMaps, pickLivery } from './helmetMaps';
import { makeToonMaterial, makeOutlineMaterial } from './toonMaterial';
import { SCROLL_FILTER_GLSL } from './scrollOut';
import { REVEAL_MASK_GLSL } from './FluidSim';

/*
 * The painted helmet: "picture B" of the helmet. (Picture A is the photo with the blueprint lines.)
 *
 * It is never drawn into the page directly. Every frame the whole helmet is rendered, with its real
 * materials, into an off-screen sheet (a render target) that has the size of the canvas and a
 * transparent background. A full-screen quad drawn last then copies that sheet onto the page, but
 * only where the fluid's reveal mask is on:   page = mix(page, helmet.rgb, mask * helmet.a)
 * So the helmet is always "there", complete; the cursor only decides where you get to see it.
 *
 * Structure and numbers as in the original (read off its bundle, re-implemented here):
 *  - shell: fully metallic, roughness 0.05, lit by the studio HDRI alone at intensity 3, colour from a
 *    livery texture; visor ("glass"): its own colour / roughness / normal maps, HDRI at 1.5;
 *    the clear plastic parts: a matcap at 25 % opacity, both sides, drawn after the rest;
 *  - no lights and no tone mapping: highlights simply clip at white, which is the glossy studio look;
 *  - target: canvas pixels, 2x MSAA, 8 bit. Colours stay linear in the sheet and are sRGB-encoded once,
 *    by the quad that puts them on screen.
 * The helmet follows the on-screen blueprint exactly because it copies that group's world matrix.
 */

const DRACO = '/orig/runtime/draco/';
const SHELL_ROUGHNESS = 0.05; // the original's value
// Liveries: see helmetMaps.js. Ours ('contour') is the default; the original's files stay reachable in
// dev with ?variant=<folder> for side-by-side comparison. (The original names five variants, a coin flip
// picks "Google", otherwise "Lime" by day and "Dark" at night, but its bundle loads the gold file for
// every one of them except Disco.)

const QUAD_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const COMPOSITE_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D tHelmet, tVelocity;
  uniform float uOpacity, uShowAll, uHover;
  ${REVEAL_MASK_GLSL}
  ${SCROLL_FILTER_GLSL}
  void main() {
    vec4 helmet = texture2D(tHelmet, vUv);
    // ?debug=helmet ignores the mask (the original has the same switch, SHOW_HELMET_PERMANENTLY):
    // the whole helmet at once, for comparing materials without chasing the fluid's phase
    float mask = max(max(revealMask(tVelocity, vUv), hoverMask(vUv, uHover)), uShowAll);
    // straight-alpha blend over whatever is on the page already = mix(page, helmet.rgb, alpha)
    gl_FragColor = vec4(filterPhoto(helmet.rgb), helmet.a * mask * mix(uOpacity, 1.0, uShowAll));
    #include <colorspace_fragment>
  }
`;

export default function HelmetPaint({ reveal, rig, view }) {
  const { gl, scene: pageScene, camera, size } = useThree();
  const livery = useMemo(pickLivery, []);
  const { scene: glb } = useGLTF(model('helmet-21'), DRACO);
  const maps = useMemo(() => helmetMaps(livery), [livery]);
  const tex = useTexture({
    base: maps.base,
    normal: maps.normal,
    glassBase: maps.glassBase,
    glassRoughness: maps.glassRoughness,
    glassNormal: maps.glassNormal,
    matcap: maps.matcap,
  });

  // The memo below must hang on the textures themselves, not on `tex`: useTexture returns a new wrapper
  // object on every render, and with `tex` as a dependency every re-render of this component rebuilt the
  // materials and the render target and flagged all seven textures for upload again. Measured with
  // scripts/tex-upload-log.mjs: the 4096 px normal map and friends went to the GPU at 2.8, 3.9, 5.0 s and
  // again mid-scroll at 18 s (R3F re-measures the canvas while scrolling), 250 to 400 ms each time: a
  // second "speed bump" near the end of the hero.
  const { base, normal, glassBase, glassRoughness, glassNormal, matcap } = tex;
  const off = useMemo(() => {
    for (const t of [base, normal, glassBase, glassRoughness, glassNormal, matcap]) {
      if (t.userData.helmetPaintReady) continue; // configure (and upload) each texture once
      t.userData.helmetPaintReady = true;
      // glTF UVs have their origin at the top; no mipmaps, like the original (crisper, a little shimmery)
      t.flipY = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = false;
      // Repeat, not three's default clamp: the texture holds one grille patch and the right chin vent
      // reaches it through UVs outside 0..1 (a mirrored island). Clamped, that vent sampled the stretched
      // edge texels instead: a flat grey panel with faint streaks where the original shows the mesh.
      t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping;
      t.needsUpdate = true;
    }
    base.colorSpace = THREE.SRGBColorSpace;
    glassBase.colorSpace = THREE.SRGBColorSpace;
    // dev only: ?rough=<0..1> overrides the shell roughness (used to study the r174 vs r186 PMREM difference)
    const q = import.meta.env.DEV ? new URLSearchParams(location.search).get('rough') : null;
    const roughness = q !== null && q !== '' && !isNaN(+q) ? +q : SHELL_ROUGHNESS;
    const toon = maps.toon;
    const shell = toon ? makeToonMaterial(base) : new THREE.MeshStandardMaterial({ map: base, normalMap: normal, metalness: 1, roughness, envMapIntensity: livery === 'disco' ? 1.5 : 3 });
    // the original also hands the visor the *helmet's* metallic map, but with the default metalness factor
    // of 0 it has no effect (the map multiplies the factor), so it is left out: the visor shades as a dark
    // dielectric with sharp HDRI reflections either way
    const glass = toon ? makeToonMaterial(glassBase, { visor: true }) : new THREE.MeshStandardMaterial({ map: glassBase, roughnessMap: glassRoughness, normalMap: glassNormal, envMapIntensity: 1.5 });
    const plastic = new THREE.MeshMatcapMaterial({ matcap, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
    const materials = { helmet: shell, glass, plastic };
    const outline = toon ? makeOutlineMaterial() : null;
    if (outline) materials.outline = outline;

    const root = new THREE.Group();
    root.matrixAutoUpdate = false; // driven by the blueprint helmet's world matrix, see useFrame
    glb.traverse((o) => {
      if (!o.isMesh) return;
      const mesh = new THREE.Mesh(o.geometry, materials[o.name] || shell); // geometry shared with the blueprint
      if (o.name === 'plastic') mesh.renderOrder = 1;
      mesh.frustumCulled = false;
      root.add(mesh);
      if (outline && o.name !== 'plastic') { // the inked silhouette (inverted hull), drawn behind the surface
        const hull = new THREE.Mesh(o.geometry, outline);
        hull.frustumCulled = false;
        root.add(hull);
      }
    });
    const target = new THREE.WebGLRenderTarget(16, 16, { samples: 2, type: THREE.UnsignedByteType });
    return { scene: new THREE.Scene().add(root), root, target, lit: toon ? [] : [shell, glass], materials };
  }, [glb, livery, maps, base, normal, glassBase, glassRoughness, glassNormal, matcap]);
  useEffect(() => () => { off.target.dispose(); Object.values(off.materials).forEach((m) => m.dispose()); }, [off]);

  const quad = useRef();
  const uniforms = useMemo(() => ({
    tHelmet: { value: null }, tVelocity: { value: null }, uOpacity: { value: 0 }, uHover: { value: 0 }, uFilter: { value: 0 },
    uShowAll: { value: import.meta.env.DEV && new URLSearchParams(location.search).get('debug') === 'helmet' ? 1 : 0 },
  }), []);
  const clear = useMemo(() => new THREE.Color(), []);
  const buffer = useMemo(() => new THREE.Vector2(), []);

  useFrame(() => {
    const source = rig.current;
    if (!source || !reveal.texture) return;
    // past the scroll-out's breakpoint nothing of the helmet shows: skip its render altogether
    const alive = view ? view.alive : 1;
    if (quad.current) quad.current.visible = alive > 0;
    if (alive <= 0) return;
    // the studio HDRI arrives late (Env loads it without blocking). A per-material envMap is needed
    // because scene.environment ignores envMapIntensity in current three.
    const env = pageScene.environment;
    for (const m of off.lit) if (m.envMap !== env) { m.envMap = env; m.needsUpdate = true; }

    source.updateWorldMatrix(true, false);
    off.root.matrix.copy(source.matrixWorld);
    off.root.matrixWorldNeedsUpdate = true;

    gl.getDrawingBufferSize(buffer);
    if (off.target.width !== buffer.x || off.target.height !== buffer.y) off.target.setSize(buffer.x, buffer.y);

    // transparent background, so the sheet's alpha is the helmet's silhouette
    gl.getClearColor(clear); const alpha = gl.getClearAlpha();
    gl.setRenderTarget(off.target);
    gl.setClearColor(0x000000, 0); gl.clear();
    gl.render(off.scene, camera);
    gl.setRenderTarget(null);
    gl.setClearColor(clear, alpha);

    const u = quad.current.material.uniforms; // the live material: R3F copies the uniforms prop
    u.tHelmet.value = off.target.texture;
    u.tVelocity.value = reveal.texture;
    u.uHover.value = reveal.hover || 0;
    u.uOpacity.value = alive;
    u.uFilter.value = view ? view.e : 0;
  });

  // drawn last (after the photo at 0 and the blueprint lines at 1), without depth: it is a 2D paste
  return (
    <mesh ref={quad} renderOrder={10} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial vertexShader={QUAD_VERT} fragmentShader={COMPOSITE_FRAG} uniforms={uniforms} transparent depthTest={false} depthWrite={false} />
    </mesh>
  );
}
