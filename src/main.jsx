import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
// the Google Fonts build of Mona Sans (wdth + wght axes), the build the original loads: see index.css
import '@fontsource-variable/mona-sans/wdth.css';
import './styles/index.css';
import '@fontsource/instrument-serif/400.css';

if (import.meta.env.DEV) {
  // print full stack lines separately so dev-tools/console readers don't truncate them
  window.addEventListener('error', (e) => (e.error?.stack || '').split('\n').slice(0, 8).forEach((l) => console.error('[stack]', l)));
}

createRoot(document.getElementById('root')).render(
  // StrictMode is off: GSAP/ScrollTrigger and three.js resources are set up in effects and
  // double-invoked effects in dev would create duplicate pins/canvases.
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
