// The Kvantra roadmap: a pinned scene on the page.
// While you scroll through the section the screen holds still, the milestones
// slide sideways along a rising curve, and a blue line draws itself over a
// faint one, led by a dot. How far you've scrolled is all that drives it.
//
// If someone prefers reduced motion (or JavaScript is off) none of this runs,
// and the CSS shows a plain row that swipes sideways.

const CURVE = 2.6;   // Higher = flatter at the start and steeper at the end.
const LIFT = 28;     // Space between the line and the text above it, in px.

export function initRoadmap() {
  const scene = document.querySelector('[data-rm-scene]');
  if (!scene) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  scene.classList.add('is-live');
  const pin = scene.querySelector('[data-rm-pin]');
  const track = scene.querySelector('[data-rm-track]');
  const head = scene.querySelector('[data-rm-head]');
  const list = scene.querySelector('[data-roadmap]');
  const items = [...list.children];
  const svg = track.querySelector('svg');
  const base = svg.querySelector('[data-rm-base]');
  const trail = svg.querySelector('[data-rm-trail]');
  const tip = track.querySelector('[data-rm-tip]');

  let g = null; // The measurements from the last layout.

  function layout() {
    // The pin fills the window, wider than the section's own column.
    const left = scene.getBoundingClientRect().left;
    const width = document.documentElement.clientWidth;
    pin.style.marginLeft = `${-left}px`;
    pin.style.width = `${width}px`;
    pin.style.paddingInline = `${left}px`;

    const height = pin.clientHeight;
    const gap = parseFloat(getComputedStyle(list).columnGap) || 0;

    let x = left;
    const boxes = items.map((item) => {
      const box = { item, x, w: item.offsetWidth, h: item.offsetHeight };
      x += box.w + gap;
      return box;
    });
    const last = boxes[boxes.length - 1];
    const xStart = left;
    const xEnd = last.x + last.w;

    const travel = Math.max(0, xEnd + left - width);
    scene.classList.toggle('no-travel', travel === 0);

    // The track sinks as it slides, so the climb stays on screen. The rise is
    // whatever leaves the last milestone just clear of the Roadmap title.
    const baseY = height * 0.8;
    const sink = travel > 0 ? height * 0.16 : 0;
    const headBottom = head.offsetTop + head.offsetHeight;
    const room = baseY + sink - (headBottom + 24 + last.h + LIFT);
    const rise = Math.max(height * 0.08, room);
    const y = (px) => baseY - rise * Math.pow(Math.max(0, px / xEnd), CURVE);

    // Each milestone sits above the line at its right edge, where the line is
    // highest, so the line never runs through the text.
    boxes.forEach((b) => {
      b.item.style.transform = `translate(${b.x}px, ${y(b.x + b.w) - LIFT - b.h}px)`;
    });

    // Both lines share one path. Walking along it gives the length at each x,
    // so the blue one can stop exactly under the dot.
    const end = xEnd + left + 80;
    const step = 6;
    const lengths = [0];
    let d = `M0 ${y(0).toFixed(1)}`;
    for (let px = step; px <= end; px += step) {
      d += `L${px} ${y(px).toFixed(1)}`;
      lengths.push(lengths[lengths.length - 1] + Math.hypot(step, y(px) - y(px - step)));
    }
    const total = lengths[lengths.length - 1];
    base.setAttribute('d', d);
    trail.setAttribute('d', d);
    trail.setAttribute('stroke-dasharray', total);

    g = { xStart, xEnd, travel, sink, y, lengths, step, total };
    update();
  }

  function update() {
    if (!g) return;
    const range = scene.offsetHeight - pin.clientHeight;
    const scrolled = -scene.getBoundingClientRect().top;
    const p = range > 0 ? Math.min(1, Math.max(0, scrolled / range)) : 0;

    track.style.transform = `translate3d(${-g.travel * p}px, ${g.sink * Math.pow(p, 0.6)}px, 0)`;

    const x = g.xStart + (g.xEnd - g.xStart) * p;
    const drawn = g.lengths[Math.min(g.lengths.length - 1, Math.round(x / g.step))];
    trail.setAttribute('stroke-dashoffset', g.total - drawn);
    tip.style.transform = `translate(${x}px, ${g.y(x)}px)`;
  }

  let queued = false;
  window.addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; update(); });
  }, { passive: true });
  window.addEventListener('resize', layout, { passive: true });

  initGlow(tip, scene);

  layout();
  // The big "Next up" changes size when the display font arrives.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
}

// The leading light. Every so often it picks a new random brightness and eases
// towards it, so the pulse has no rhythm. It rests while off screen.
function initGlow(tip, scene) {
  let glow = 0.5;
  let target = 0.5;
  let nextPick = 0;
  let last = 0;
  let running = false;

  function frame(now) {
    if (!running) return;
    if (now >= nextPick) {
      target = Math.random();
      nextPick = now + 250 + Math.random() * 1100;
    }
    glow += (target - glow) * (1 - Math.exp(-(now - last) / 220));
    last = now;
    tip.style.setProperty('--glow', glow.toFixed(3));
    requestAnimationFrame(frame);
  }

  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting === running) return;
    running = entry.isIntersecting;
    if (running) {
      last = performance.now();
      requestAnimationFrame(frame);
    }
  }).observe(scene);
}
