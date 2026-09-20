import { Suspense, memo, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { model } from '../lib/assets';

/*
 * The little 3D circuit in the hero's NEXT RACE card.
 *
 * Built from observation of the original (2026-09-20, no bundle reading), the model file inspected like
 * any other asset:
 *  - the file holds 25 circuits, each a group named after its city with one flat ribbon mesh (y = 0);
 *  - what the card shows is a hairline outline, doubled along the straights: the *border* of that
 *    ribbon, i.e. the edges that belong to one triangle only, drawn as lines;
 *  - it spins about the vertical axis, counter-clockwise seen from above, one turn in 3.33 s
 *    (the projected length swings 22..61 px, half a turn every 1.67 s on average over 6 half turns);
 *  - seen from about 27 degrees above the ground: near side-on the outline's screen angle turns at
 *    ~49 deg/s while the model turns at 108 deg/s, and 49 / 108 = sin(27 deg);
 *  - side-on it spans 61 px of the 99 px wide row (62 %); line and label share one colour.
 * Perspective looked negligible at this size, so the camera is orthographic.
 *
 * Hover (the user pointed out it was missing; measured on the original the same day): with the pointer
 * anywhere on the card's first row the line goes from the label grey to pure lime (210,255,0 on screen)
 * and gets about a third thicker, both in about 0.3 s with a slow start and a fast
 * middle (progress 0.02 at +39 ms, 0.24 at +135, 0.68 at +242, settled by ~+350); the way back takes
 * about as long. The label does not change. WebGL's own lines are always 1 px, so the outline is drawn
 * with three's "fat lines" (LineSegments2), whose width is a uniform that can be animated.
 */
const TURN_SECONDS = 3.33;
const ELEVATION = THREE.MathUtils.degToRad(27);
const SPAN = 0.62; // of the canvas width, when the circuit's longest side faces the viewer
const LIME = new THREE.Color('#d2ff00');
const HOVER_SECONDS = 0.3;
// CSS px. Not "twice as thick": my first ink measure also rose with the colour (lime drops the blue
// channel 1.47x more than the grey does), so 171 -> 337 meant about 1.34x the coverage; counting ink
// pixels on 3x stills gives 1.23x. First pass (0.8 -> 1.6) came out at 1.61x and visibly too heavy.
const WIDTH_REST = 0.75, WIDTH_HOVER = 1.0;
const easeInOut = (u) => u * u * (3 - 2 * u); // slow start, fast middle, as measured

// Edges used by exactly one triangle = the outline of a flat mesh.
function borderSegments(geometry) {
  const pos = geometry.attributes.position, index = geometry.index;
  const count = index ? index.count : pos.count;
  const at = (i) => (index ? index.getX(i) : i);
  // weld by position first: exported meshes often split vertices that sit in the same place
  const ids = new Map(), weld = [];
  for (let i = 0; i < pos.count; i++) {
    const k = `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
    if (!ids.has(k)) ids.set(k, ids.size);
    weld[i] = ids.get(k);
  }
  const edges = new Map();
  for (let t = 0; t < count; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = at(t + e), b = at(t + ((e + 1) % 3));
      const wa = weld[a], wb = weld[b]; if (wa === wb) continue;
      const k = wa < wb ? `${wa}_${wb}` : `${wb}_${wa}`;
      const hit = edges.get(k); if (hit) hit.n++; else edges.set(k, { a, b, n: 1 });
    }
  }
  const pts = [];
  for (const { a, b, n } of edges.values()) if (n === 1) pts.push(pos.getX(a), pos.getY(a), pos.getZ(a), pos.getX(b), pos.getY(b), pos.getZ(b));
  return pts; // flat xyz pairs, one pair per border edge
}

function Circuit({ name, color, hover }) {
  const { scene } = useGLTF(model('tracks-06'));
  const { size, camera } = useThree();
  const spin = useRef();
  const progress = useRef(0); // 0 = at rest, 1 = fully hovered (linear; eased when applied)

  const track = useMemo(() => {
    const group = scene.getObjectByName(name);
    let mesh = null;
    group?.traverse((o) => { if (!mesh && o.isMesh && !/^point/i.test(o.name)) mesh = o; });
    if (!mesh) return null;
    const pts = borderSegments(mesh.geometry);
    const box = new THREE.Box3().setFromArray(pts), centre = box.getCenter(new THREE.Vector3()), dims = box.getSize(new THREE.Vector3());
    const geometry = new LineSegmentsGeometry().setPositions(pts);
    // toneMapped off: R3F's default ACES curve would shift the line away from the label's colour
    const material = new LineMaterial({ color: 0xffffff, linewidth: WIDTH_REST, worldUnits: false, toneMapped: false });
    const lines = new LineSegments2(geometry, material);
    lines.position.set(-centre.x, -centre.y, -centre.z);
    return { lines, material, geometry, longest: Math.max(dims.x, dims.z) };
  }, [scene, name]);
  useEffect(() => () => { track?.geometry.dispose(); track?.material.dispose(); }, [track]);
  const rest = useMemo(() => new THREE.Color(color), [color]);

  // orthographic frustum in world units: the circuit's longest side takes SPAN of the width
  useEffect(() => {
    if (!track) return;
    const worldWidth = track.longest / SPAN, worldHeight = worldWidth * (size.height / size.width);
    camera.left = -worldWidth / 2; camera.right = worldWidth / 2; camera.top = worldHeight / 2; camera.bottom = -worldHeight / 2;
    camera.position.set(0, Math.sin(ELEVATION) * 10, Math.cos(ELEVATION) * 10);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [track, size, camera]);

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.1);
    if (spin.current) spin.current.rotation.y += ((Math.PI * 2) / TURN_SECONDS) * d;
    if (!track) return;
    // walk the progress toward the pointer state at a constant rate, ease it when applying
    const goal = hover.current ? 1 : 0, step = d / HOVER_SECONDS;
    progress.current = goal > progress.current ? Math.min(goal, progress.current + step) : Math.max(goal, progress.current - step);
    const k = easeInOut(progress.current);
    track.material.color.copy(rest).lerp(LIME, k);
    track.material.linewidth = WIDTH_REST + (WIDTH_HOVER - WIDTH_REST) * k;
    track.material.resolution.set(size.width, size.height); // fat lines are sized in screen px
  });

  if (!track) return null;
  return (
    <group ref={spin}>
      <primitive object={track.lines} />
    </group>
  );
}

// stable objects, see HeroHead: new `gl` / `camera` literals per render make R3F reconfigure the renderer
const GL_CONFIG = { antialias: true, alpha: true, powerPreference: 'low-power' };
const CAMERA_CONFIG = { near: 0.1, far: 50, position: [0, 5, 9] };

function TrackMini({ circuit, className = '' }) {
  const wrap = useRef(null);
  // same colour as the text around it, as on the original
  const [color, setColor] = useState('#535450');
  useEffect(() => { if (wrap.current) setColor(getComputedStyle(wrap.current).color); }, []);
  // The whole row reacts, not just the canvas: on the original the pointer can sit on the circuit's name
  // and the line still turns. The row is the link this component sits in.
  const hover = useRef(false);
  useEffect(() => {
    const host = wrap.current?.closest('a') || wrap.current; if (!host) return;
    const on = () => { hover.current = true; }, off = () => { hover.current = false; };
    host.addEventListener('pointerenter', on); host.addEventListener('pointerleave', off);
    return () => { host.removeEventListener('pointerenter', on); host.removeEventListener('pointerleave', off); };
  }, []);
  return (
    <div ref={wrap} className={className} aria-hidden>
      <Canvas orthographic dpr={Math.min(window.devicePixelRatio || 1, 2)} camera={CAMERA_CONFIG} gl={GL_CONFIG}>
        <Suspense fallback={null}><Circuit name={circuit} color={color} hover={hover} /></Suspense>
      </Canvas>
    </div>
  );
}

export default memo(TrackMini);
