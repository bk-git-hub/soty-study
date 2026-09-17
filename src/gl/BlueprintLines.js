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
 * Line material with the sweep: a front runs top -> chin once per period and the lines fade
 * behind it (observed on the original: 0.96 s period, ~0.73 s travel, ~0.3 s fade at the dome).
 */
export function makeBlueprintMaterial({ color = 0xa9aca4, opacity = 0.42 } = {}) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 }, uPeriod: { value: 0.96 }, uSweep: { value: 0.76 }, uDecay: { value: 4.0 },
      uFloor: { value: 0.0 }, uOpacity: { value: opacity }, uColor: { value: new THREE.Color(color) },
      uMinY: { value: -1 }, uMaxY: { value: 1 },
    },
    vertexShader: /* glsl */ `
      uniform float uMinY, uMaxY;
      varying float vH;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vH = clamp((wp.y - uMinY) / (uMaxY - uMinY), 0.0, 1.0); // 1 = top, 0 = chin
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uPeriod, uSweep, uDecay, uFloor, uOpacity;
      uniform vec3 uColor;
      varying float vH;
      void main() {
        float phase = fract(uTime / uPeriod);
        float front = phase / uSweep;                 // 0 at the top -> 1 at the chin during uSweep of the period
        float since = front - (1.0 - vH);             // > 0 once the front has passed this height
        float pulse = since < 0.0 ? 0.0 : exp(-since * uDecay);
        gl_FragColor = vec4(uColor, (uFloor + (1.0 - uFloor) * pulse) * uOpacity);
      }
    `,
  });
}

export function makeBlueprintLines(mesh, material, keep = null, diagonals = true) {
  const lines = new THREE.LineSegments(makeBlueprintGeometry(mesh.geometry, keep, diagonals), material);
  lines.name = 'blueprint-' + mesh.name;
  mesh.getWorldPosition(lines.position);
  lines.quaternion.copy(mesh.getWorldQuaternion(new THREE.Quaternion()));
  lines.scale.copy(mesh.getWorldScale(new THREE.Vector3()));
  return lines;
}
