// Entry point. Vite starts here (see the <script> tag at the bottom of
// index.html) and pulls in everything else from these imports.

import './style.css';
import { createLandscape } from './landscape.js';

const canvas = document.querySelector('.landscape');
if (canvas) createLandscape(canvas);

const year = document.querySelector('[data-year]');
if (year) year.textContent = new Date().getFullYear();
