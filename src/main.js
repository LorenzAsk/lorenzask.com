// Entry point. Vite starts here (see the <script> tag at the bottom of
// each page) and pulls in everything else from these imports.

import 'lenis/dist/lenis.css';
import './style.css';
import { createLandscape } from './landscape.js';
import { initMotion } from './motion.js';
import { initCube } from './cube.js';
import { initUltra } from './ultra.js';
import { initForms } from './forms.js';
import { initRoadmap } from './roadmap.js';
import { initTravel } from './travel.js';

const canvas = document.querySelector('.landscape');
if (canvas) createLandscape(canvas);

initForms();
initCube();
initUltra();
initRoadmap();
initTravel();
initMotion();

document.querySelectorAll('[data-year]').forEach((el) => {
  el.textContent = new Date().getFullYear();
});
