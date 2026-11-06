// Entry point. Vite starts here (see the <script> tag at the bottom of
// each page) and pulls in everything else from these imports.

import 'lenis/dist/lenis.css';
import './style.css';
import { createLandscape } from './landscape.js';
import { initMotion } from './motion.js';
import { initRankDial } from './rank.js';
import { initForms } from './forms.js';

const canvas = document.querySelector('.landscape');
if (canvas) createLandscape(canvas);

initForms();
initRankDial();
initMotion();

document.querySelectorAll('[data-year]').forEach((el) => {
  el.textContent = new Date().getFullYear();
});
