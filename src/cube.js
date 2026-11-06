/* ==========================================================================
   RUBIK'S CUBE
   A real 3D cube built from 54 stickers with plain CSS transforms. It turns
   slowly on its own and leans towards your cursor. Click it to scramble,
   click again to solve.
   ========================================================================== */

// The six standard sticker colours, one per face.
const FACES = [
  { name: 'front',  color: '#19a64a', transform: 'translateZ(42px)' },
  { name: 'back',   color: '#1f5fd6', transform: 'rotateY(180deg) translateZ(42px)' },
  { name: 'right',  color: '#e0322c', transform: 'rotateY(90deg) translateZ(42px)' },
  { name: 'left',   color: '#f57d1f', transform: 'rotateY(-90deg) translateZ(42px)' },
  { name: 'top',    color: '#ffffff', transform: 'rotateX(90deg) translateZ(42px)' },
  { name: 'bottom', color: '#ffd51f', transform: 'rotateX(-90deg) translateZ(42px)' },
];

export function initCube() {
  const cube = document.querySelector('[data-cube]');
  if (!cube) return;

  const card = cube.closest('.care-cube');
  const hint = card.querySelector('.cube-hint');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Build the faces and their nine stickers each.
  const stickers = [];
  for (const face of FACES) {
    const el = document.createElement('div');
    el.className = 'cube-face';
    el.style.transform = face.transform;
    for (let i = 0; i < 9; i++) {
      const sticker = document.createElement('i');
      sticker.style.background = face.color;
      sticker.dataset.home = face.color;
      el.append(sticker);
      stickers.push(sticker);
    }
    cube.append(el);
  }

  // Scramble: shuffle all 54 colours. Solve: send every sticker home.
  let scrambled = false;
  function toggle() {
    scrambled = !scrambled;
    if (scrambled) {
      const colors = stickers.map((s) => s.dataset.home);
      for (let i = colors.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [colors[i], colors[j]] = [colors[j], colors[i]];
      }
      stickers.forEach((s, i) => { s.style.background = colors[i]; });
    } else {
      stickers.forEach((s) => { s.style.background = s.dataset.home; });
    }
    if (hint) hint.textContent = scrambled ? 'Click to solve it (faster than 18 seconds)' : 'Click to scramble';
  }
  card.addEventListener('click', toggle);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
  });

  // Turning: a slow spin, plus a lean towards the cursor over the card.
  let spin = 0;
  const lean = { x: -24, y: 0, tx: -24, ty: 0 };

  card.addEventListener('pointermove', (e) => {
    const box = card.getBoundingClientRect();
    lean.ty = ((e.clientX - box.left) / box.width - 0.5) * 70;
    lean.tx = -24 - ((e.clientY - box.top) / box.height - 0.5) * 50;
  });
  card.addEventListener('pointerleave', () => { lean.tx = -24; lean.ty = 0; });

  function draw() {
    lean.x += (lean.tx - lean.x) * 0.08;
    lean.y += (lean.ty - lean.y) * 0.08;
    cube.style.transform = `rotateX(${lean.x}deg) rotateY(${spin + lean.y}deg)`;
  }

  if (reduced) {
    spin = 35;
    draw();
    return;
  }

  // Only spin while the cube is on screen.
  let running = false;
  function frame() {
    if (!running) return;
    spin += 0.35;
    draw();
    requestAnimationFrame(frame);
  }
  new IntersectionObserver(([entry]) => {
    const was = running;
    running = entry.isIntersecting;
    if (running && !was) requestAnimationFrame(frame);
  }).observe(cube);
}
