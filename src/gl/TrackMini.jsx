import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
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
 */
const TURN_SECONDS = 3.33;
const ELEVATION = THREE.MathUtils.degToRad(27);
const SPAN = 0.62; // of the canvas width, when the circuit's longest side faces the viewer

// Edges used by exactly one triangle = the outline of a flat mesh.
function borderGeometry(geometry) {
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
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return out;
}

function Circuit({ name, color }) {
  const { scene } = useGLTF(model('tracks-06'));
  const { size, camera } = useThree();
  const spin = useRef();

  const track = useMemo(() => {
    const group = scene.getObjectByName(name);
    let mesh = null;
    group?.traverse((o) => { if (!mesh && o.isMesh && !/^point/i.test(o.name)) mesh = o; });
    if (!mesh) return null;
    const geometry = borderGeometry(mesh.geometry);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox, centre = box.getCenter(new THREE.Vector3()), dims = box.getSize(new THREE.Vector3());
    return { geometry, centre, longest: Math.max(dims.x, dims.z) };
  }, [scene, name]);
  useEffect(() => () => track?.geometry.dispose(), [track]);

  // orthographic frustum in world units: the circuit's longest side takes SPAN of the width
  useEffect(() => {
    if (!track) return;
    const worldWidth = track.longest / SPAN, worldHeight = worldWidth * (size.height / size.width);
    camera.left = -worldWidth / 2; camera.right = worldWidth / 2; camera.top = worldHeight / 2; camera.bottom = -worldHeight / 2;
    camera.position.set(0, Math.sin(ELEVATION) * 10, Math.cos(ELEVATION) * 10);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [track, size, camera]);

  useFrame((_, dt) => { if (spin.current) spin.current.rotation.y += ((Math.PI * 2) / TURN_SECONDS) * Math.min(dt, 0.1); });

  if (!track) return null;
  return (
    <group ref={spin}>
      <lineSegments geometry={track.geometry} position={[-track.centre.x, -track.centre.y, -track.centre.z]}>
        {/* toneMapped off: R3F's default ACES curve would shift the line away from the label's colour */}
        <lineBasicMaterial color={color} toneMapped={false} />
      </lineSegments>
    </group>
  );
}

export default function TrackMini({ circuit, className = '' }) {
  const wrap = useRef(null);
  // same colour as the text around it, as on the original
  const [color, setColor] = useState('#535450');
  useEffect(() => { if (wrap.current) setColor(getComputedStyle(wrap.current).color); }, []);
  return (
    <div ref={wrap} className={className} aria-hidden>
      <Canvas orthographic dpr={Math.min(window.devicePixelRatio || 1, 2)} camera={{ near: 0.1, far: 50, position: [0, 5, 9] }} gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}>
        <Suspense fallback={null}><Circuit name={circuit} color={color} /></Suspense>
      </Canvas>
    </div>
  );
}
