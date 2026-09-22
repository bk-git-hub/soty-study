import { memo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import BackgroundWaves from './BackgroundWaves';

/*
 * The contour lines behind the whole page. On the original they live in its one full-screen canvas: the
 * lines are attached to the page (a still, a 113 px wheel, a still: the lines have moved 113 px; measured
 * in the impact statement and in a white section), morph with time like the hero's, and their colours
 * follow the sections (src/lib/waves.js). Here: one fixed canvas at the very back; the noise is sampled
 * in page space (viewport uv + scroll), so scrolling slides the field instead of leaving it behind.
 */
const GL_CONFIG = { antialias: false, alpha: false, powerPreference: 'high-performance' };

function PageWaves({ scrollFrom }) {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden>
      <Canvas className="!absolute inset-0" dpr={1} gl={GL_CONFIG}>
        <BackgroundWaves palette="page" scrollFrom={scrollFrom} />
      </Canvas>
    </div>
  );
}
export default memo(PageWaves);
