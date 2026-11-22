// The Kvantra mark turns to dust under the mouse and rebuilds itself.
//
// The four outlines are broken into thousands of tiny dots ("atoms"), each
// remembering its place on the line. At rest the dots sit shoulder to
// shoulder, so they read as solid lines. When the pointer comes near, the
// dots close to it are blown away and drift; when it moves on, each dot is
// pulled back home.
//
// Without JavaScript, or when someone has asked for reduced motion, none of
// this runs and the plain line drawing in index.html is shown instead.

const SETTINGS = {
  spacing: 1.1,   // Distance between dots along a line, in px. Smaller = more dots.
  size: 1.5,      // Size of a dot, in px. Matches the line thickness.
  reach: 150,     // How far from the pointer dots are disturbed, in px.
  blast: 2.2,     // How hard nearby dots are pushed away.
  drift: 0.9,     // How much random float the loose dots get.
  pull: 0.012,    // How strongly a dot is pulled back home. Smaller = slower rebuild.
  friction: 0.92, // 1 = dots never slow down, 0 = they stop at once.
  margin: 160,    // Extra room around the mark for flying dots, in px.
};

const mark = document.querySelector('[data-mark]');
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (mark && !still) start(mark);

function start(mark) {
  const svg = mark.querySelector('svg');
  const paths = [...svg.querySelectorAll('path')];
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  mark.append(canvas);
  mark.classList.add('is-live'); // CSS hides the line drawing; the dots take over.

  const colour = getComputedStyle(document.documentElement).getPropertyValue('--mark').trim() || '#453b29';
  const { margin } = SETTINGS;
  let atoms = new Float32Array(0); // 6 numbers per dot: home x, home y, x, y, speed x, speed y
  let ratio = 1;
  let pointer = null;   // Where the pointer is, measured from the canvas corner.
  let running = false;

  // Place a dot every `spacing` px along each outline.
  function build() {
    const box = mark.getBoundingClientRect();
    if (!box.width) return;
    const scale = box.width / svg.viewBox.baseVal.width;
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round((box.width + margin * 2) * ratio);
    canvas.height = Math.round((box.height + margin * 2) * ratio);

    const dots = [];
    for (const path of paths) {
      const length = path.getTotalLength();
      const count = Math.max(2, Math.round((length * scale) / SETTINGS.spacing));
      for (let i = 0; i < count; i++) {
        const point = path.getPointAtLength((i / count) * length);
        const x = point.x * scale + margin, y = point.y * scale + margin;
        dots.push(x, y, x, y, 0, 0);
      }
    }
    atoms = new Float32Array(dots);
    draw();
  }

  function draw() {
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = colour;
    const s = SETTINGS.size, half = s / 2;
    for (let i = 0; i < atoms.length; i += 6) ctx.fillRect(atoms[i + 2] - half, atoms[i + 3] - half, s, s);
  }

  // One step of the animation: push, drift, pull home, slow down.
  function step() {
    const { reach, blast, drift, pull, friction } = SETTINGS;
    let moving = false;
    for (let i = 0; i < atoms.length; i += 6) {
      let x = atoms[i + 2], y = atoms[i + 3], vx = atoms[i + 4], vy = atoms[i + 5];
      if (pointer) {
        const dx = x - pointer.x, dy = y - pointer.y, d = Math.hypot(dx, dy);
        if (d < reach) {
          const power = (1 - d / reach) ** 2;
          vx += ((dx / (d || 1)) * blast + (Math.random() - 0.5) * drift * 4) * power;
          vy += ((dy / (d || 1)) * blast + (Math.random() - 0.5) * drift * 4) * power;
        }
      }
      vx = (vx + (atoms[i] - x) * pull) * friction;
      vy = (vy + (atoms[i + 1] - y) * pull) * friction;
      x += vx; y += vy;
      if (Math.abs(vx) + Math.abs(vy) > 0.02 || Math.abs(atoms[i] - x) + Math.abs(atoms[i + 1] - y) > 0.3) {
        moving = true;
      } else {
        x = atoms[i]; y = atoms[i + 1]; vx = 0; vy = 0; // Close enough: snap home.
      }
      atoms[i + 2] = x; atoms[i + 3] = y; atoms[i + 4] = vx; atoms[i + 5] = vy;
    }
    draw();
    // Keep going while anything is still loose; otherwise rest until the pointer returns.
    if (moving || pointer) requestAnimationFrame(step);
    else running = false;
  }

  function wake() {
    if (running) return;
    running = true;
    requestAnimationFrame(step);
  }

  window.addEventListener('pointermove', (event) => {
    const box = canvas.getBoundingClientRect();
    const x = event.clientX - box.left, y = event.clientY - box.top;
    const near = x > 0 && y > 0 && x < box.width && y < box.height;
    pointer = near ? { x, y } : null;
    if (near) wake();
  }, { passive: true });
  const leave = () => { pointer = null; };
  document.addEventListener('pointerleave', leave);
  window.addEventListener('pointerup', (event) => { if (event.pointerType !== 'mouse') leave(); });
  window.addEventListener('blur', leave);

  new ResizeObserver(build).observe(mark);
  build();
}
