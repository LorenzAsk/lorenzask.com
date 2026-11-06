/* ==========================================================================
   THE LONG RUN
   ==========================================================================

   Your life drawn as a race. The section sticks to the screen while you
   scroll through it, and scrolling moves a runner along one line:

   - the line climbs and dips like an elevation profile (and, not by
     accident, like a stock chart)
   - each chapter is a checkpoint on it; the last one passed fills the panel
   - after "Now" the line turns dashed and heads for the finish: Oslo–Bergen

   The chapters themselves live in the HTML as a plain list (<ol>), which is
   what screen readers get. This script reads that list to build the chart.
   ========================================================================== */

// The chart is drawn in a 1000 × 400 box that stretches to fit the screen.
const W = 1000;
const H = 400;
const START_X = 40;
const END_X = 860;

// How high each checkpoint sits (0 = top, 400 = bottom). Up and to the right,
// with a dip or two along the way, like any good run.
const HEIGHTS = [330, 292, 236, 258, 214, 156, 104, 82, 62];
const FINISH = { x: 975, y: 26 };

export function initUltra() {
  const section = document.querySelector('[data-ultra]');
  if (!section) return;

  const items = [...section.querySelectorAll('.ultra-list > li')];
  const chart = section.querySelector('.ultra-chart');
  const svg = chart.querySelector('svg');
  const panel = section.querySelector('.ultra-panel');
  const hud = section.querySelector('[data-hud-cp]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const n = items.length;
  const xs = items.map((_, i) => START_X + (i * (END_X - START_X)) / (n - 1));
  const ys = items.map((_, i) => HEIGHTS[i] ?? HEIGHTS[HEIGHTS.length - 1]);

  // ---- The course: a smooth line through every checkpoint, with small
  // wiggles in between that fade to zero exactly at each checkpoint. ----
  function heightAt(x) {
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    const t = Math.min(Math.max((x - xs[i]) / (xs[i + 1] - xs[i]), 0), 1);
    const ease = (1 - Math.cos(Math.PI * t)) / 2;
    const base = ys[i] + (ys[i + 1] - ys[i]) * ease;
    const wiggle = Math.sin(x * 0.09) * 8 + Math.sin(x * 0.23 + 1.3) * 4.5 + Math.sin(x * 0.53 + 0.7) * 2.4;
    return base + wiggle * Math.sin(Math.PI * t);
  }

  const points = [];
  for (let x = START_X; x <= END_X; x += 2) points.push([x, heightAt(x)]);
  const line = 'M' + points.map(([x, y]) => `${x} ${y.toFixed(1)}`).join(' L');
  const area = `${line} L${END_X} ${H} L${START_X} ${H} Z`;
  const last = points[points.length - 1];
  const future = `M${last[0]} ${last[1].toFixed(1)} Q${(last[0] + FINISH.x) / 2 + 20} ${last[1] - 6} ${FINISH.x} ${FINISH.y}`;

  const ns = 'http://www.w3.org/2000/svg';
  const make = (tag, attrs) => {
    const el = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  };

  svg.append(
    make('path', { d: line, class: 'ultra-ghost' }),            // the whole course, faint
    make('path', { d: future, class: 'ultra-future' }),          // the road still ahead
    make('path', { d: area, class: 'ultra-area', 'clip-path': 'url(#ultra-clip)' }),
    make('path', { d: line, class: 'ultra-line', 'clip-path': 'url(#ultra-clip)' }),
  );
  const clipRect = svg.querySelector('#ultra-clip rect');

  // ---- Checkpoint markers and the runner, as HTML on top of the chart
  // (HTML circles stay round however the chart stretches). ----
  const pct = (x, y) => `left: ${(x / W) * 100}%; top: ${(y / H) * 100}%`;
  const markers = items.map((li, i) => {
    const m = document.createElement('div');
    m.className = i === n - 1 ? 'ultra-marker is-last' : 'ultra-marker';
    m.style.cssText = pct(xs[i], ys[i]);
    m.innerHTML = `<span class="dot"></span><span class="tag">${li.dataset.short}</span>`;
    chart.append(m);

    const tick = document.createElement('span');
    tick.className = 'ultra-tick label';
    tick.style.left = `${(xs[i] / W) * 100}%`;
    tick.textContent = String(i + 1).padStart(2, '0');
    chart.append(tick);
    return m;
  });

  const runner = document.createElement('div');
  runner.className = 'ultra-runner';
  runner.innerHTML = '<span class="you">You</span>';
  chart.append(runner);

  const finish = document.createElement('div');
  finish.className = 'ultra-finish';
  finish.style.cssText = pct(FINISH.x, FINISH.y);
  finish.innerHTML = '<span class="flag"></span>';
  chart.append(finish);

  // ---- The panel shows whichever checkpoint the runner passed last ----
  const label = panel.querySelector('.ultra-when');
  const big = panel.querySelector('.ultra-big');
  const title = panel.querySelector('.ultra-title');
  const text = panel.querySelector('.ultra-text');
  let shown = -1;

  function showCheckpoint(i) {
    if (i === shown) return;
    shown = i;
    const li = items[i];
    label.textContent = `Checkpoint ${String(i + 1).padStart(2, '0')} · ${li.dataset.when}`;
    big.textContent = li.dataset.big;
    title.textContent = li.querySelector('h3').textContent;
    text.textContent = li.querySelector('p').textContent;
    hud.textContent = `CP ${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
    panel.classList.remove('is-swapping');
    void panel.offsetWidth; // restart the little entrance animation
    panel.classList.add('is-swapping');
    markers.forEach((m, k) => {
      m.classList.toggle('is-passed', k <= i);
      m.classList.toggle('is-current', k === i);
    });
  }

  // ---- Scroll → position on the course ----
  function update(progress) {
    const x = START_X + progress * (END_X - START_X);
    const y = heightAt(x);
    clipRect.setAttribute('width', x);
    runner.style.cssText = pct(x, y);

    let current = 0;
    for (let i = 0; i < n; i++) if (x >= xs[i] - 0.5) current = i;
    showCheckpoint(current);
    section.classList.toggle('is-finished', progress > 0.995);
  }

  if (reduced) {
    // Everything drawn at once, and the chapters shown as a plain list.
    section.classList.add('is-static');
    update(1);
    return;
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const rect = section.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const raw = travel > 0 ? -rect.top / travel : 0;
      // A short pause at the start and the end, so the first and last
      // checkpoints get a moment on screen.
      const progress = Math.min(Math.max((raw - 0.04) / 0.9, 0), 1);
      update(progress);
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update(0);
  onScroll();
}
