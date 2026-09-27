import * as THREE from 'three';

/*
 * Our own helmet, built in code instead of loaded from the original GLB. It is a drop-in replacement:
 * same units (about 0.08 tall), same orientation (visor towards +z, crown up) and nearly the same
 * bounding box as helmet-21.glb, so the hero's transform, the face inside it, the blueprint pulse and
 * the painted (cel-shaded) version all keep working unchanged. Meshes are named like the GLB's parts
 * ("helmet", "glass") because the renderers pick materials by name.
 *
 * How the shell is made:
 *  - a latitude / longitude grid around the vertical axis: longitude u (0 = straight ahead, +-180 at
 *    the back), latitude v (from the neck ring at -62 deg up to the crown at +90 deg), in 5 and 4 degree
 *    steps. The visor window is a rectangle in (u, v): |u| <= 60, -16 <= v <= 16, and both of its
 *    edges fall exactly on grid lines, so cutting the window out leaves straight edges, not a staircase.
 *  - each grid direction d gets the radius of an ellipsoid in that direction,
 *    r = 1 / sqrt((dx/rx)^2 + (dy/ry)^2 + (dz/rz)^2), taller below the centre than above so the shell
 *    reaches down over the chin;
 *  - the chin bar is pushed forward: below the window, r grows by up to 11 %, most at the front
 *    (weight cos(u)^2) and more the lower it goes (a smoothstep over the latitude);
 *  - the visor is the window's cells again, pushed out 1.5 % so it sits proud of the shell.
 * A regular grid makes the blueprint pulse read as clean latitude / longitude lines.
 */
const C = new THREE.Vector3(0, 0.0055, 0.002); // centre of the ellipsoid (GLB units)
const RX = 0.0366, RY_UP = 0.0378, RY_DOWN = 0.0445, RZ = 0.0468;
const DEG = Math.PI / 180;
const U_STEP = 5, V_STEP = 4, V_MIN = -62, WIN_U = 60, WIN_V0 = -16, WIN_V1 = 16;

const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

function point(uDeg, vDeg, scale) {
  const u = uDeg * DEG, v = vDeg * DEG;
  const d = new THREE.Vector3(Math.cos(v) * Math.sin(u), Math.sin(v), Math.cos(v) * Math.cos(u));
  const ry = d.y > 0 ? RY_UP : RY_DOWN;
  let r = 1 / Math.sqrt((d.x / RX) ** 2 + (d.y / ry) ** 2 + (d.z / RZ) ** 2);
  // chin bar: forward bulge below the window
  r *= 1 + 0.11 * smooth(WIN_V0, -48, vDeg) * Math.max(0, Math.cos(u)) ** 2;
  return d.multiplyScalar(r * scale).add(C);
}

/** grid over (u, v); `keep(uMid, vMid)` decides which cells stay; `uvOf(u, v)` gives texture coords */
function surface(scale, keep, uvOf) {
  const us = [], vs = [];
  for (let u = -180; u <= 180; u += U_STEP) us.push(u);
  for (let v = V_MIN; v < 90; v += V_STEP) vs.push(v);
  vs.push(90); // crown pole
  const pos = [], uv = [], idx = [];
  for (const v of vs) for (const u of us) {
    const p = point(u, v, scale);
    pos.push(p.x, p.y, p.z);
    uv.push(...uvOf(u, v));
  }
  const row = us.length;
  for (let i = 0; i < vs.length - 1; i++) for (let j = 0; j < us.length - 1; j++) {
    if (!keep((us[j] + us[j + 1]) / 2, (vs[i] + vs[i + 1]) / 2)) continue;
    const a = i * row + j, b = a + 1, c = a + row + 1, d = a + row;
    idx.push(a, b, c, a, c, d); // counter-clockwise seen from outside: normals point out
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const inWindow = (u, v) => Math.abs(u) < WIN_U && v > WIN_V0 && v < WIN_V1;

/** the rear spoiler: a small slanted wing on the back of the crown, baked into world position */
function spoiler() {
  const g = new THREE.BoxGeometry(0.034, 0.0035, 0.013, 6, 1, 3);
  g.applyMatrix4(new THREE.Matrix4().compose(
    new THREE.Vector3(0, 0.031, -0.036),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.75, 0, 0)),
    new THREE.Vector3(1, 1, 1),
  ));
  return g;
}

/** the visor pivots: a flat round cap on each side where the visor meets the shell */
function pods() {
  const out = [];
  for (const side of [-1, 1]) {
    const g = new THREE.CylinderGeometry(0.0062, 0.0068, 0.0028, 24, 1);
    const at = point(side * (WIN_U + 3), 0, 1.004); // just past the window's side edge, on the shell
    const n = at.clone().sub(C).normalize(); // roughly the surface normal there
    g.applyMatrix4(new THREE.Matrix4().compose(at, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n), new THREE.Vector3(1, 1, 1)));
    out.push(g);
  }
  return out;
}

export function makeToonHelmetScene() {
  const group = new THREE.Group();
  // shell: livery uv straight from the grid (the livery is a noise pattern, any smooth mapping reads right)
  const shell = surface(1, (u, v) => !inWindow(u, v), (u, v) => [(u + 180) / 360, (v - V_MIN) / (90 - V_MIN)]);
  // visor: uv laid out so the texture's sun strip (v 0.073..0.114, u 0.13..0.87) runs along the window's
  // top edge and the rest of the glass samples the black below it
  const visor = surface(1.015, inWindow, (u, v) => [0.5 + (u / WIN_U) * 0.37, 0.075 + ((WIN_V1 - v) / (WIN_V1 - WIN_V0)) * 0.225]);
  const parts = [['helmet', shell], ['glass', visor], ['helmet', spoiler()], ...pods().map((g) => ['glass', g])];
  parts.forEach(([name, geometry], i) => {
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    mesh.name = name;
    mesh.userData.part = `${name}-${i}`; // unique, for React keys (two parts share the name "helmet")
    group.add(mesh);
  });
  return group;
}
