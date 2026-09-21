import { memo } from 'react';
import { Canvas } from '@react-three/fiber';
import BackgroundWaves from './BackgroundWaves';

/*
 * The dark page behind the hero: the same flowing contour lines in the dark palette, on a canvas of its
 * own at the bottom of the stack. It cannot live in the hero's canvas because two lines of DOM text sit
 * between it and the hero's shrinking rectangle (the original draws that text in WebGL, one canvas).
 * `progressRef`: nothing is drawn while the hero still covers the whole screen (progress 0).
 */
const GL_CONFIG = { antialias: false, alpha: false, powerPreference: 'high-performance' };

function DarkWaves({ progressRef }) {
  // CSS-pixel resolution is all the noise has (see BackgroundWaves), so a pixel ratio of 1 loses nothing
  return (
    <Canvas className="!absolute inset-0" dpr={1} gl={GL_CONFIG}>
      <BackgroundWaves palette="dark" active={() => progressRef.current > 0} />
    </Canvas>
  );
}

export default memo(DarkWaves);
