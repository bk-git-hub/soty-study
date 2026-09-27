import * as THREE from 'three';

/*
 * Cel ("toon") shading for the helmet, so it matches the cartoon characters:
 *  - light is not a smooth gradient but three flat steps (lit / half / shade), picked by N . L;
 *  - the specular highlight is a hard white blob: N . H above a threshold, nothing below;
 *  - a rim of light where the surface turns away from the viewer (1 - N . V), also cut hard;
 *  - the visor adds two diagonal shine streaks in screen space, the classic anime glass look.
 * Colours stay linear: HelmetPaint renders into an off-screen sheet and sRGB-encodes once when it
 * pastes that sheet onto the page, so this shader must not encode on its own.
 */
const VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;
const FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uVisor;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec3 base = texture2D(uMap, vUv).rgb;
    vec3 N = normalize(vNormal), V = normalize(vView);
    if (!gl_FrontFacing) N = -N;
    vec3 L = normalize(vec3(-0.45, 0.65, 0.6)); // key light: upper left, towards the viewer (view space)
    float ndl = dot(N, L);
    // three flat light steps instead of a gradient
    float light = ndl > 0.45 ? 1.0 : (ndl > 0.0 ? 0.72 : 0.5);
    vec3 col = base * light;
    // hard highlight: the Blinn half vector close enough to the normal -> pure white, else nothing
    float spec = step(0.997, dot(N, normalize(L + V)));
    // hard rim on the side away from the light
    float rim = step(0.62, 1.0 - max(dot(N, V), 0.0)) * step(ndl, 0.25);
    col = mix(col, vec3(1.0), spec * 0.9);
    col += rim * 0.18;
    if (uVisor > 0.5) {
      // two diagonal shine streaks across the glass, in screen space so they stay put as it turns
      vec2 p = gl_FragCoord.xy / 900.0;
      float d = fract(p.x - p.y * 0.6);
      float streak = step(abs(d - 0.30), 0.035) + step(abs(d - 0.40), 0.012);
      col = mix(col, vec3(1.0), clamp(streak, 0.0, 1.0) * 0.55 * step(0.0, ndl + 0.3));
    }
    gl_FragColor = vec4(col, 1.0);
  }
`;
export function makeToonMaterial(map, { visor = false } = {}) {
  return new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { uMap: { value: map }, uVisor: { value: visor ? 1 : 0 } } });
}

/*
 * Ink outline by the "inverted hull" trick: draw the same mesh a second time, slightly inflated along
 * its normals, showing only its back faces, in near-black. Where the real surface is in front it hides
 * the hull; at the silhouette the hull pokes out as a line of even width.
 * `width` is in the mesh's own units (the helmet GLB is ~0.08 units tall).
 */
export function makeOutlineMaterial(width = 0.0011, color = '#111112') {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { uWidth: { value: width }, uColor: { value: new THREE.Color(color) } },
    vertexShader: /* glsl */ `
      uniform float uWidth;
      void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * uWidth, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      void main() { gl_FragColor = vec4(uColor, 1.0); }
    `,
  });
}
