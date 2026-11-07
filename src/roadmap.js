// The Kvantra roadmap.
// 1. When it scrolls into view, the blue line draws itself from the first
//    milestone to today and the dots fill in one by one.
// 2. When the window is too narrow for all the milestones, the strip scrolls
//    sideways: it starts at "Now", the arrows step one milestone at a time,
//    and the edges fade on whichever side has more to see.

export function initRoadmap() {
  const list = document.querySelector('[data-roadmap]');
  if (!list) return;
  initDraw(list);
  initStrip(list);
}

function initDraw(list) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion || !('IntersectionObserver' in window)) {
    list.classList.add('is-drawn');
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    list.classList.add('is-drawn');
    observer.disconnect();
  }, { threshold: 0.4 });
  observer.observe(list);
}

function initStrip(list) {
  const strip = document.querySelector('[data-rm-scroll]');
  const nav = document.querySelector('[data-rm-nav]');
  if (!strip || !nav) return;
  const prev = nav.querySelector('[data-rm-prev]');
  const next = nav.querySelector('[data-rm-next]');
  const items = [...list.children];

  function update() {
    const max = strip.scrollWidth - strip.clientWidth;
    const overflowing = max > 2;
    const left = strip.scrollLeft > 2;
    const right = strip.scrollLeft < max - 2;
    nav.classList.toggle('is-on', overflowing);
    strip.classList.toggle('can-left', overflowing && left);
    strip.classList.toggle('can-right', overflowing && right);
    prev.disabled = !left;
    next.disabled = !right;
  }

  // One milestone at a time: the width of a column plus the gap.
  function step(direction) {
    const width = items[1] ? items[1].offsetLeft - items[0].offsetLeft : strip.clientWidth;
    strip.scrollBy({ left: direction * width, behavior: 'smooth' });
  }
  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));

  strip.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });

  // Start at "Now", the newest milestone.
  strip.scrollLeft = strip.scrollWidth;
  update();
}
