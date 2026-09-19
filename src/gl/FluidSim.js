import * as THREE from 'three';

/*
 * The "paint" behind the hero reveal: a small 2D fluid simulation that the cursor stirs.
 *
 * Why a simulation at all: a shader is a pure function of (pixel, time), it cannot remember where the
 * cursor *was*. A trail that spreads, swirls and fades needs state, so the state lives in textures
 * (one velocity vector per cell) and every step reads last step's texture and writes the next one.
 * Reading and writing the same texture is not allowed on a GPU, hence two of each ("ping-pong").
 *
 * The steps are Jos Stam's Stable Fluids, in the same arrangement as the open-source fluid-three demo
 * (mnmxmx) that the original site appears to build on. Written from scratch here; the numbers (grid
 * size, time step, fade, force, splat size, iteration count) are the original's, read off its bundle:
 *   1. advect    move the velocity field along itself (things drift with the flow), fade it by 4 %
 *   2. splat     add the cursor's movement as a force in a soft disc around the cursor
 *   3. diverge   measure how much each cell is a source / sink
 *   4. pressure  solve (4 Jacobi sweeps) for the pressure that cancels those sources
 *   5. project   subtract the pressure gradient: the flow becomes swirly instead of piling up
 * The grid is tiny (a tenth of the page in CSS px: 144 x 90 at 1440 x 900), so the five passes are cheap.
 */

const RESOLUTION = 0.1;     // grid = page size (CSS px) x 0.1
const REFERENCE_WIDTH = 1100; // the cell size is normalised to a 1100 px wide page, see resize()
const DT = 0.014;           // simulated time per step
const DISSIPATION = 0.96;   // velocity kept per step: a stroke is gone in about a second
const MOUSE_FORCE = 50;
const CURSOR_SIZE = 18;     // splat radius in cells
const PRESSURE_ITERATIONS = 4;
const STRAIGHTNESS = 1;     // extra damping in the pressure sweeps: less curl, straighter strokes

// Full-screen quad, pulled in by one cell on every side so the outermost cells are never written and
// stay at zero velocity: a still wall around the pool.
const QUAD_VERT = /* glsl */ `
  uniform vec2 uInset;
  varying vec2 vUv;
  void main() {
    vec2 p = position.xy * (1.0 - uInset * 2.0);
    vUv = p * 0.5 + 0.5;
    gl_Position = vec4(p, 0.0, 1.0);
  }
`;

// 1. Advection, semi-Lagrangian: "what arrives here is what was upstream one step ago".
// A single backward look-up blurs the field a little every step. BFECC (back and forth error
// compensation) measures that error by tracing back and then forward again, and starts the real
// look-up from a point corrected by half of the round-trip miss. Strokes keep their shape longer.
const ADVECT_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D tVelocity;
  uniform vec2 uAspectFix; // velocity is in page widths; y needs the aspect ratio to stay isotropic
  void main() {
    vec2 k = uAspectFix * ${DT.toFixed(3)};
    vec2 back = vUv - texture2D(tVelocity, vUv).xy * k;       // where this cell's content came from
    vec2 forth = back + texture2D(tVelocity, back).xy * k;    // and where that would go: should be vUv
    vec2 start = vUv - (forth - vUv) * 0.5;                   // corrected starting point
    vec2 from = start - texture2D(tVelocity, start).xy * k;
    gl_FragColor = vec4(texture2D(tVelocity, from).xy * ${DISSIPATION.toFixed(2)}, 0.0, 1.0);
  }
`;

// 2. The cursor force: a small quad placed at the cursor, drawn with additive blending, strongest at
// its centre and falling off as (1 - r)^2.
const SPLAT_VERT = /* glsl */ `
  uniform vec2 uCenter, uRadius;
  varying vec2 vLocal;
  void main() {
    vLocal = position.xy * 2.0; // plane is 1 x 1: -1..1 across the disc
    gl_Position = vec4(uCenter + position.xy * 2.0 * uRadius, 0.0, 1.0);
  }
`;
const SPLAT_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vLocal;
  uniform vec2 uForce;
  void main() {
    float f = 1.0 - min(length(vLocal), 1.0);
    gl_FragColor = vec4(uForce * f * f, 0.0, 1.0);
  }
`;

// 3. Divergence by central differences (divided by dt, so the pressure comes out in velocity units).
const DIVERGENCE_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D tVelocity;
  uniform vec2 uCell;
  void main() {
    float l = texture2D(tVelocity, vUv - vec2(uCell.x, 0.0)).x;
    float r = texture2D(tVelocity, vUv + vec2(uCell.x, 0.0)).x;
    float b = texture2D(tVelocity, vUv - vec2(0.0, uCell.y)).y;
    float t = texture2D(tVelocity, vUv + vec2(0.0, uCell.y)).y;
    gl_FragColor = vec4(((r - l) + (t - b)) * 0.5 / ${DT.toFixed(3)});
  }
`;

// 4. One Jacobi sweep of the pressure equation. Neighbours two cells away, because divergence and
// gradient are both central differences (each spans two cells). Four sweeps are far from converged;
// the pressure texture is kept between steps, so the solve continues where it left off.
const PRESSURE_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D tPressure, tDivergence;
  uniform vec2 uCell;
  void main() {
    float sum = texture2D(tPressure, vUv + vec2(uCell.x * 2.0, 0.0)).r + texture2D(tPressure, vUv - vec2(uCell.x * 2.0, 0.0)).r
              + texture2D(tPressure, vUv + vec2(0.0, uCell.y * 2.0)).r + texture2D(tPressure, vUv - vec2(0.0, uCell.y * 2.0)).r;
    gl_FragColor = vec4(sum / ${(4 + STRAIGHTNESS).toFixed(1)} - texture2D(tDivergence, vUv).r);
  }
`;

// 5. Projection: remove the part of the velocity that the pressure accounts for.
const PROJECT_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D tVelocity, tPressure;
  uniform vec2 uCell;
  void main() {
    float l = texture2D(tPressure, vUv - vec2(uCell.x, 0.0)).r;
    float r = texture2D(tPressure, vUv + vec2(uCell.x, 0.0)).r;
    float b = texture2D(tPressure, vUv - vec2(0.0, uCell.y)).r;
    float t = texture2D(tPressure, vUv + vec2(0.0, uCell.y)).r;
    vec2 v = texture2D(tVelocity, vUv).xy - vec2(r - l, t - b) * 0.5 * ${DT.toFixed(3)};
    gl_FragColor = vec4(v, 0.0, 1.0);
  }
`;

/*
 * How the composite turns velocity into the reveal mask (GLSL, shared by every shader that needs it).
 * The original first paints the field as a colour, white where still and (vx, vy, 1) * 0.5 + 0.5 where
 * moving, and later thresholds the inverted red channel at 0.1. Folded together that is
 *   0.5 * speed * (1 - vx) >= 0.1
 * so the mask is a hard-edged blob, and it is lopsided: flow to the left opens it sooner than flow to the
 * right. The texture is read through a 2.5 % inset so the still wall around the pool never shows.
 */
export const REVEAL_MASK_GLSL = /* glsl */ `
  float revealMask(sampler2D tVelocity, vec2 screenUv) {
    vec2 v = texture2D(tVelocity, 0.025 + screenUv * 0.95).xy;
    return step(0.1, 0.5 * length(v) * (1.0 - v.x));
  }
`;

export class FluidSim {
  constructor() {
    const target = () => new THREE.WebGLRenderTarget(16, 16, {
      // half floats: velocities are signed and well above 1, and half-float textures can be linearly
      // filtered everywhere (advection reads between cells); full floats cannot on many phones
      type: THREE.HalfFloatType, depthBuffer: false, generateMipmaps: false,
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    });
    this.velocity = [target(), target()]; // [0] = finished field, [1] = work in progress
    this.pressure = [target(), target()];
    this.divergence = target();
    this.cell = new THREE.Vector2();
    this.aspectFix = new THREE.Vector2(1, 1);
    this.camera = new THREE.Camera();

    const pass = (fragmentShader, uniforms) => {
      const material = new THREE.ShaderMaterial({
        vertexShader: QUAD_VERT, fragmentShader, depthTest: false, depthWrite: false,
        uniforms: { uInset: { value: this.cell }, uCell: { value: this.cell }, ...uniforms },
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
      mesh.frustumCulled = false;
      return { scene: new THREE.Scene().add(mesh), uniforms: material.uniforms };
    };
    this.advect = pass(ADVECT_FRAG, { tVelocity: { value: null }, uAspectFix: { value: this.aspectFix } });
    this.diverge = pass(DIVERGENCE_FRAG, { tVelocity: { value: null } });
    this.solve = pass(PRESSURE_FRAG, { tPressure: { value: null }, tDivergence: { value: null } });
    this.project = pass(PROJECT_FRAG, { tVelocity: { value: null }, tPressure: { value: null } });

    const splatMaterial = new THREE.ShaderMaterial({
      vertexShader: SPLAT_VERT, fragmentShader: SPLAT_FRAG, depthTest: false, depthWrite: false,
      blending: THREE.AdditiveBlending, transparent: true,
      uniforms: { uCenter: { value: new THREE.Vector2() }, uRadius: { value: new THREE.Vector2() }, uForce: { value: new THREE.Vector2() } },
    });
    const splatMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), splatMaterial);
    splatMesh.frustumCulled = false;
    this.splat = { scene: new THREE.Scene().add(splatMesh), uniforms: splatMaterial.uniforms };

    this.cursor = new THREE.Vector2();
    this.cursorBefore = new THREE.Vector2();
  }

  get texture() { return this.velocity[0].texture; }

  resize(width, height) {
    const w = Math.max(2, Math.round(width * RESOLUTION)), h = Math.max(2, Math.round(height * RESOLUTION));
    if (this.velocity[0].width === w && this.velocity[0].height === h) return;
    for (const t of [...this.velocity, ...this.pressure, this.divergence]) t.setSize(w, h);
    // One "cell" is always 1 / 110 of the page width (a 1100 px page at 0.1), whatever the real grid
    // is: the strokes keep the same size relative to the page on every screen. In uv units the y
    // step is wider by the aspect ratio so that a cell stays square on screen.
    this.cell.set(1 / (REFERENCE_WIDTH * RESOLUTION), (w / h) / (REFERENCE_WIDTH * RESOLUTION));
    this.aspectFix.set(1, w / h);
  }

  // One fixed step. `cursor` is in clip space (-1..1, +y up).
  step(renderer, cursor) {
    const [done, work] = this.velocity;
    const draw = (pass, target) => { renderer.setRenderTarget(target); renderer.render(pass.scene, this.camera); };
    const autoClear = renderer.autoClear;
    renderer.autoClear = false; // the splat adds onto the advected field; every other pass overwrites

    this.advect.uniforms.tVelocity.value = done.texture;
    draw(this.advect, work);

    // force = how far the cursor moved since the last step (no movement, no force)
    this.cursorBefore.copy(this.cursor);
    this.cursor.copy(cursor);
    const rx = CURSOR_SIZE * this.cell.x, ry = CURSOR_SIZE * this.cell.y;
    const s = this.splat.uniforms;
    s.uForce.value.set((this.cursor.x - this.cursorBefore.x) * 0.5 * MOUSE_FORCE, (this.cursor.y - this.cursorBefore.y) * 0.5 * MOUSE_FORCE);
    // keep the whole disc inside the wall
    s.uCenter.value.set(
      THREE.MathUtils.clamp(this.cursor.x, -1 + rx + this.cell.x * 2, 1 - rx - this.cell.x * 2),
      THREE.MathUtils.clamp(this.cursor.y, -1 + ry + this.cell.y * 2, 1 - ry - this.cell.y * 2),
    );
    s.uRadius.value.set(rx, ry);
    draw(this.splat, work);

    this.diverge.uniforms.tVelocity.value = work.texture;
    draw(this.diverge, this.divergence);

    this.solve.uniforms.tDivergence.value = this.divergence.texture;
    for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
      // even count: the result ends up back in pressure[0], where the next step starts from
      const read = this.pressure[i % 2], write = this.pressure[(i + 1) % 2];
      this.solve.uniforms.tPressure.value = read.texture;
      draw(this.solve, write);
    }

    this.project.uniforms.tVelocity.value = work.texture;
    this.project.uniforms.tPressure.value = this.pressure[0].texture;
    draw(this.project, done);

    renderer.setRenderTarget(null);
    renderer.autoClear = autoClear;
  }

  dispose() {
    for (const t of [...this.velocity, ...this.pressure, this.divergence]) t.dispose();
  }
}
