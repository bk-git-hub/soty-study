import * as THREE from 'three';

/**
 * Ghost helmet shell: the "structure" is a grid of UV iso-lines (dense vertical strokes, a few
 * horizontal ones) drawn on the helmet surface and swept by a front that runs top -> chin about
 * once a second, then fades. Observed on the original at 1440x900: 0.96 s period, front travels
 * the shell in ~0.73 s (dome -> low cheek lag 0.4 s), dome fades in ~0.3 s, and only a faint silhouette stays between pulses.
 *
 * uniforms:
 *  uTime     seconds
 *  uPeriod   seconds per pulse
 *  uSweep    fraction of the period the front needs to travel top -> bottom
 *  uDecay    fade speed after the front passed (in "front travel" units)
 *  uLinesU   vertical strokes across the UV width, uLinesV horizontal lines across the UV height
 *  uWidth    stroke width as a fraction of one grid cell
 *  uShell    base opacity of the milky shell (silhouette floor)
 *  uOpacity  master opacity (driven by the intro)
 *  uMinY/uMaxY world-space bounds used to normalise height (1 = top, 0 = chin)
 */
export function makeGhostShellMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 }, uPeriod: { value: 0.96 }, uSweep: { value: 0.76 }, uDecay: { value: 3.0 },
      uLinesU: { value: 140.0 }, uLinesV: { value: 22.0 }, uWidth: { value: 0.16 },
      uShell: { value: 0.025 }, uOpacity: { value: 1 },
      uLineColor: { value: new THREE.Color(0x6b6e66) }, uShellColor: { value: new THREE.Color(0xe6e7e0) },
      uMinY: { value: -1 }, uMaxY: { value: 1 },
    },
    vertexShader: /* glsl */ `
      uniform float uMinY, uMaxY;
      varying float vH; varying vec2 vUv; varying float vFresnel;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vH = clamp((wp.y - uMinY) / (uMaxY - uMinY), 0.0, 1.0);
        vUv = uv;
        vec3 n = normalize(mat3(modelMatrix) * normal);
        vec3 v = normalize(cameraPosition - wp.xyz);
        vFresnel = pow(1.0 - abs(dot(n, v)), 10.0); // narrow rim: only the last few degrees before the silhouette
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uPeriod, uSweep, uDecay, uLinesU, uLinesV, uWidth, uShell, uOpacity;
      uniform vec3 uLineColor, uShellColor;
      varying float vH; varying vec2 vUv; varying float vFresnel;
      // anti-aliased grid line: 1 inside a stroke of width uWidth (cell fraction), 0 elsewhere
      float line(float coord, float count, float width) {
        float f = fract(coord * count);
        float d = min(f, 1.0 - f);              // distance to the nearest grid line in cell units
        float aa = fwidth(coord * count);        // one pixel in cell units
        float w = max(width, aa * 2.2);          // never thinner than ~1 px, so strokes survive small viewports
        return 1.0 - smoothstep(w * 0.5 - aa, w * 0.5 + aa, d);
      }
      void main() {
        // sweep: front goes 0 (top) -> 1 (chin) during uSweep of the period, lines fade behind it
        float phase = fract(uTime / uPeriod);
        float front = phase / uSweep;
        float depth = 1.0 - vH;
        float since = front - depth;
        float pulse = since < 0.0 ? 0.0 : exp(-since * uDecay);
        float grid = max(line(vUv.x, uLinesU, uWidth), 0.6 * line(vUv.y, uLinesV, uWidth));
        float lineA = 0.0; // strokes are now real mesh edges (BlueprintLines.js)
        // measured on the original (glass state): the shell body is at most ~6/255 darker than the page and absent
        // on the cheeks; only a faint rim remains, so the envelope is nearly invisible
        // thin outline: the original's edge dips ~16/255 over 2 px, the body sits 5-7/255 below the page
        float shellA = uShell + 0.20 * vFresnel;
        vec3 col = mix(uShellColor, uLineColor, max(lineA, vFresnel)); // rim takes the line colour
        float a = max(shellA, lineA);
        gl_FragColor = vec4(col, a * uOpacity);
      }
    `,
  });
}
