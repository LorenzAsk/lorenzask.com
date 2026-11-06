/* ==========================================================================
   KVANTRARANK DIAL
   A ring of 50 ticks around a number. Drag the slider (or let it count up
   when it scrolls into view) and the ticks light up to match.
   ========================================================================== */

const TICKS = 50;

export function initRankDial() {
  const dial = document.querySelector('[data-dial]');
  if (!dial) return;

  const svg = dial.querySelector('svg');
  const valueEl = dial.querySelector('.dial-value');
  const input = document.querySelector('[data-dial-input]');
  const percentEl = document.querySelector('[data-dial-percent]');
  const ns = 'http://www.w3.org/2000/svg';

  // Draw the ticks around the circle, starting at the top, going clockwise.
  const ticks = [];
  for (let i = 0; i < TICKS; i++) {
    const angle = (i / TICKS) * Math.PI * 2 - Math.PI / 2;
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', 200 + Math.cos(angle) * 168);
    line.setAttribute('y1', 200 + Math.sin(angle) * 168);
    line.setAttribute('x2', 200 + Math.cos(angle) * 190);
    line.setAttribute('y2', 200 + Math.sin(angle) * 190);
    line.setAttribute('class', 'dial-tick');
    svg.append(line);
    ticks.push(line);
  }

  function show(value) {
    const v = Math.round(value);
    valueEl.textContent = v;
    if (percentEl) percentEl.textContent = `${v}%`;
    const on = Math.round((v / 100) * TICKS);
    ticks.forEach((t, i) => t.classList.toggle('on', i < on));
  }

  input.addEventListener('input', () => show(Number(input.value)));

  // Count up to the slider's starting value the first time it comes into view.
  const target = Number(input.value);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  show(reduced ? target : 0);
  if (reduced) return;

  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / 1800, 1);
      show(target * (1 - Math.pow(1 - t, 4)));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    setTimeout(() => show(Number(input.value)), 2300); // always end on the real value
  }, { threshold: 0.4 });
  observer.observe(dial);
}
