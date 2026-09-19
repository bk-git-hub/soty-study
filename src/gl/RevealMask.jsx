import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { FluidSim } from './FluidSim';

/*
 * Drives the fluid simulation that every "painted" part of the hero reads as its mask.
 *
 * Who holds the brush (timings observed in the original's bundle):
 *  - the real pointer, while it has moved within the last 2 s (2.5 s of grace after load);
 *  - otherwise an automatic cursor that draws a big S across the page: down in 2.5 s while swinging
 *    left-right twice, a 1.5 s rest, the same way back up in 2.5 s, then 3 s of nothing. 9.5 s per cycle.
 * The simulation itself only ever sees "a cursor position"; it does not know which of the two it is.
 */

const FIRST_IDLE_AFTER = 2.5; // s after mount
const IDLE_AFTER = 2.0;       // s after the last pointer move
const LEG = 2.5, REST = 1.5, PAUSE = 3.0; // down, wait, up, wait
const CYCLE = LEG + REST + LEG + PAUSE;   // 9.5 s
const STEP = 1 / 60;          // the simulation advances at most once per 1/60 s, whatever the display rate

const easeInOutQuad = (u) => (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u)); // GSAP "power1.inOut"

// Position of the automatic cursor `t` seconds after it took over, in clip space (-1..1, +y up).
export function idleCursorAt(t, out) {
  const c = t % CYCLE;
  // p: 0 at the top of the page, 1 at the bottom
  const p = c < LEG ? c / LEG : c < LEG + REST ? 1 : c < LEG + REST + LEG ? 1 - (c - LEG - REST) / LEG : 0;
  // y falls at constant speed; x eases in and out, so the two swings are slow-fast-slow-fast-slow
  return out.set(-Math.cos(easeInOutQuad(p) * Math.PI * 4) * 0.75, Math.cos(p * Math.PI) * 0.5);
}

// `reveal` is a plain ref-like object shared with the shaders' owners: { texture } is the velocity field.
export default function RevealMask({ pointer, reveal }) {
  const { gl, size } = useThree();
  const sim = useMemo(() => new FluidSim(), []);
  useEffect(() => () => sim.dispose(), [sim]);
  sim.resize(size.width, size.height);

  const state = useRef({ mounted: performance.now() / 1000, idleSince: null, pending: 0, cursor: new THREE.Vector2() });
  useFrame((_, dt) => {
    const s = state.current, now = performance.now() / 1000;
    const lastMove = pointer.lastMove.current;
    const moving = lastMove === null ? now - s.mounted < FIRST_IDLE_AFTER : now - lastMove < IDLE_AFTER;
    if (moving) { s.idleSince = null; s.cursor.copy(pointer.target.current); }
    else {
      if (s.idleSince === null) s.idleSince = now; // the S always starts from its top-left end
      idleCursorAt(now - s.idleSince, s.cursor);
    }
    s.pending += dt;
    if (s.pending > STEP) { sim.step(gl, s.cursor); s.pending %= STEP; }
    reveal.texture = sim.texture;
  });
  return null;
}
