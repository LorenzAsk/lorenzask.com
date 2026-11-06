/* ==========================================================================
   DATA LANDSCAPE
   ==========================================================================

   How it works, in plain words:

   We draw a few dozen horizontal lines, one behind the other, like rows on
   a field. Every point on every line gets a height from `heightAt()` — a
   mix of slow sine waves — so together the lines trace a rolling surface.
   Each frame we move time forward a little and recompute the heights, so
   the surface slowly shifts. Fog fades the far rows into the background
   colour, which is what gives it depth. The camera leans a little towards
   your mouse.
   ========================================================================== */

import * as THREE from 'three';

// ---- Tunable knobs. Change a number, save, and the page updates. ----
const SETTINGS = {
  rows: 56,            // how many lines, front to back
  pointsPerRow: 180,   // how smooth each line is
  width: 36,           // how wide the field is
  depth: 24,           // how far back it goes
  hillHeight: 0.9,     // how tall the hills are
  speed: 0.16,         // how fast the surface shifts
  mouseTilt: 0.12,     // how much the camera follows your mouse (0 = not at all)
  lineOpacity: 0.5,    // how strong the lines are
};

// The surface itself: give it an x (left/right), a z (front/back) and a
// time, and it returns a height. Three waves at different sizes and speeds
// stacked together look organic instead of repetitive.
function heightAt(x, z, t) {
  const big    = Math.sin(x * 0.32 + t) * Math.cos(z * 0.28 - t * 0.7);
  const medium = Math.sin((x + z) * 0.6 - t * 1.3) * 0.45;
  const small  = Math.sin(x * 1.3 - z * 0.9 + t * 1.7) * 0.15;

  // Taller in the middle, flatter towards the left and right edges.
  const centre = 0.55 + 0.45 * Math.exp(-(x * x) / 60);

  return (big + medium + small) * centre * SETTINGS.hillHeight;
}

export function createLandscape(canvas) {
  // Some old devices can't do WebGL. Then we simply show no landscape.
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (error) {
    canvas.remove();
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Scene, camera, fog ----
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xffffff, 8, 28);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  const cameraHome = new THREE.Vector3(0, 4.6, 11);
  const lookTarget = new THREE.Vector3(0, 0, -2);
  camera.position.copy(cameraHome);
  camera.lookAt(lookTarget);

  // ---- The lines ----
  // Phones get fewer, so it stays smooth on smaller chips.
  const isSmall = window.innerWidth < 700;
  const rows = isSmall ? Math.round(SETTINGS.rows * 0.6) : SETTINGS.rows;
  const cols = isSmall ? Math.round(SETTINGS.pointsPerRow * 0.6) : SETTINGS.pointsPerRow;

  const material = new THREE.LineBasicMaterial({
    transparent: true,
    opacity: SETTINGS.lineOpacity,
  });

  const lines = [];
  for (let r = 0; r < rows; r++) {
    // Row 0 is closest to the camera, the last row is furthest away.
    const z = 4 - (r / (rows - 1)) * SETTINGS.depth;

    const positions = new Float32Array(cols * 3);
    for (let c = 0; c < cols; c++) {
      positions[c * 3]     = -SETTINGS.width / 2 + (c / (cols - 1)) * SETTINGS.width; // x
      positions[c * 3 + 2] = z;                                                       // z
      // y (height) is filled in every frame by updateHeights()
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const line = new THREE.Line(geometry, material);
    scene.add(line);
    lines.push(line);
  }

  function updateHeights(t) {
    for (const line of lines) {
      const attribute = line.geometry.attributes.position;
      const p = attribute.array;
      for (let i = 0; i < p.length; i += 3) {
        p[i + 1] = heightAt(p[i], p[i + 2], t);
      }
      attribute.needsUpdate = true; // tells Three.js to send the new numbers to the graphics chip
    }
  }

  // ---- Colours come from the CSS tokens, so light/dark mode just works ----
  function applyColors() {
    const styles = getComputedStyle(document.documentElement);
    material.color.set(styles.getPropertyValue('--line').trim());
    scene.fog.color.set(styles.getPropertyValue('--bg').trim());
  }

  // ---- Mouse: we remember where it is, and ease the camera towards it ----
  const mouse = { x: 0, y: 0 };
  const eased = { x: 0, y: 0 };

  window.addEventListener('pointermove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;  // -1 (left) to 1 (right)
    mouse.y = (event.clientY / window.innerHeight) * 2 - 1; // -1 (top) to 1 (bottom)
  }, { passive: true });

  // ---- One frame ----
  const clock = new THREE.Clock();

  function render() {
    renderer.render(scene, camera);
  }

  function frame() {
    updateHeights(clock.getElapsedTime() * SETTINGS.speed);

    // Move 4% of the remaining distance each frame — a smooth, weighty follow.
    eased.x += (mouse.x - eased.x) * 0.04;
    eased.y += (mouse.y - eased.y) * 0.04;

    camera.position.x = cameraHome.x + eased.x * SETTINGS.mouseTilt * 10;
    camera.position.y = cameraHome.y - eased.y * SETTINGS.mouseTilt * 6;
    camera.lookAt(lookTarget);

    render();
  }

  // ---- Keep the drawing the same size as the canvas on screen ----
  function resize() {
    const { clientWidth: width, clientHeight: height } = canvas;
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (reducedMotion) render();
  }

  new ResizeObserver(resize).observe(canvas);

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    applyColors();
    if (reducedMotion) render();
  });

  // ---- Start ----
  applyColors();
  resize();

  if (reducedMotion) {
    // Visitors who asked their device for less motion get one still frame.
    updateHeights(0);
    render();
    return;
  }

  // Only animate while the landscape is actually on screen. Scrolled past it,
  // it stops drawing entirely — no wasted battery.
  new IntersectionObserver(([entry]) => {
    renderer.setAnimationLoop(entry.isIntersecting ? frame : null);
  }).observe(canvas);
}
