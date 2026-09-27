import * as THREE from 'three';

/**
 * Blueprint lines = the helmet's real mesh edges (all parts: shell, vents, ear pods, visor).
 *
 * The GLB is triangulated. The original's blueprint shows the diagonals too (clearly on the visor),
 * so by default every triangle edge is kept; edges are de-duplicated so shared edges are drawn once.
 */
/** keep(ax,ay,az,bx,by,bz) -> false drops an edge (used to leave out parts the original does not draw) */
export function makeBlueprintGeometry(geometry, keep = null, diagonals = true) {
  const pos = geometry.attributes.position;
  const index = geometry.index;
  const triCount = index ? index.count / 3 : pos.count / 3;
  const key = (a, b) => (a < b ? a * 4294967296 + b : b * 4294967296 + a);
  const edges = new Map();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let t = 0; t < triCount; t++) {
    const i0 = index ? index.getX(t * 3) : t * 3, i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1, i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;
    a.fromBufferAttribute(pos, i0); b.fromBufferAttribute(pos, i1); c.fromBufferAttribute(pos, i2);
    const e = [[i0, i1, a.distanceToSquared(b)], [i1, i2, b.distanceToSquared(c)], [i2, i0, c.distanceToSquared(a)]];
    e.sort((p, q) => p[2] - q[2]);
    // diagonals=true keeps all three edges (the original shows diagonals, e.g. on the visor);
    // false drops the longest edge per triangle, which is the quad diagonal on a regular grid
    for (const [u, v] of (diagonals ? e : e.slice(0, 2))) { const k = key(u, v); if (!edges.has(k)) edges.set(k, [u, v]); }
  }
  const out = new Float32Array(edges.size * 6);
  let o = 0;
  for (const [u, v] of edges.values()) {
    a.fromBufferAttribute(pos, u); b.fromBufferAttribute(pos, v);
    if (keep && !keep(a.x, a.y, a.z, b.x, b.y, b.z)) continue;
    out[o++] = a.x; out[o++] = a.y; out[o++] = a.z; out[o++] = b.x; out[o++] = b.y; out[o++] = b.z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(out.subarray(0, o), 3));
  return geo;
}

/**
 * Line material with the sweep, in the form the original uses (read off its bundle, confirmed on the
 * 60 s reference recording: period 1.000 s, tail matches a 4th power):
 *
 *   alpha = 0.1 * fract(-y * 10 - t)^4      y = vertex y in the GLB's own units, t in seconds
 *
 * Read it per vertex: fract(...) is a sawtooth that drops from 1 to 0 over one second and jumps
 * back, so a point lights up to 0.1 when the front arrives and fades as (1 - age)^4: half gone
 * after 0.16 s, invisible (< 0.003) after 0.6 s. Read it across the helmet at one instant: the
 * front sits where the sawtooth wraps and moves down 0.1 units per second, i.e. top to chin
 * (0.077 units) in 0.77 s, and the lines above it fade with distance. The colour is black; the
 * lines are 1 px wide and not antialiased (the original renders them without MSAA).
 *
 * Drawn after the portrait relief with a depth test: lines behind the face are hidden, lines in
 * front blend over the skin (at most 10 % darker). There is no self-occlusion: the far side of the
 * shell and the inner lining draw too, exactly like the original's merged wireframe mesh.
 */
export function makeBlueprintMaterial({ color = 0x000000, opacity = 0.1 } = {}) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: true,
    uniforms: {
      uTime: { value: 0 }, uOpacity: { value: opacity }, uColor: { value: new THREE.Color(color) },
      uFloor: { value: 0.0 }, // debug: 1 lights every line at full strength
    },
    vertexShader: /* glsl */ `
      varying float vY;
      void main() {
        vY = position.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uOpacity, uFloor;
      uniform vec3 uColor;
      varying float vY;
      void main() {
        float phi = fract(-vY * 10.0 - uTime);
        float a = max(pow(phi, 4.0), uFloor);
        gl_FragColor = vec4(uColor, a * uOpacity);
      }
    `,
  });
}

export function makeBlueprintLines(mesh, material, keep = null, diagonals = true) {
  const lines = new THREE.LineSegments(makeBlueprintGeometry(mesh.geometry, keep, diagonals), material);
  lines.name = 'blueprint-' + (mesh.userData.part || mesh.name); // parts may share a name
  lines.renderOrder = 1; // after the portrait relief (see makeBlueprintMaterial)
  mesh.getWorldPosition(lines.position);
  lines.quaternion.copy(mesh.getWorldQuaternion(new THREE.Quaternion()));
  lines.scale.copy(mesh.getWorldScale(new THREE.Vector3()));
  return lines;
}
