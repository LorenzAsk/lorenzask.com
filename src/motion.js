/* ==========================================================================
   MOTION
   Everything that moves on scroll. Each feature is its own function, so any
   one of them can be deleted without touching the others.
   ========================================================================== */

import Lenis from 'lenis';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

let lenis = null;
const scrollListeners = [];

export function initMotion() {
  initSmoothScroll();
  splitHeadlines();
  initReveals();
  initHeader();
  initMagnetic();
  initGlow();
  initBands();

  onScroll(); // set the starting state before anything moves
}

/* ---- Smooth scrolling ----
   Lenis eases the page towards where your wheel or trackpad wants it,
   instead of jumping in steps. The page still scrolls natively underneath. */
function initSmoothScroll() {
  if (!reducedMotion) {
    lenis = new Lenis({ autoRaf: true, anchors: true, lerp: 0.1 });
    lenis.on('scroll', onScroll);
  } else {
    window.addEventListener('scroll', onScroll, { passive: true });
  }
  window.addEventListener('resize', onScroll, { passive: true });
  // Text boxes scroll on their own, not the page.
  document.querySelectorAll('textarea').forEach((el) => el.setAttribute('data-lenis-prevent', ''));
}

function onScroll() {
  for (const fn of scrollListeners) fn(window.scrollY);
}

/* ---- Headlines: wrap every word so each can slide up on its own ---- */
function splitHeadlines() {
  document.querySelectorAll('[data-split]').forEach((el) => {
    let index = 0;
    for (const node of [...el.childNodes]) {
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR') continue;
      const words = node.textContent.split(/(\s+)/);
      const fragment = document.createDocumentFragment();
      for (const word of words) {
        if (!word) continue;
        if (/^\s+$/.test(word)) { fragment.append(document.createTextNode(' ')); continue; }
        const outer = document.createElement('span');
        outer.className = 'w';
        const inner = document.createElement('span');
        inner.textContent = word;
        inner.style.setProperty('--i', index++);
        outer.append(inner);
        fragment.append(outer);
      }
      node.replaceWith(fragment);
    }
    el.classList.add('split');
  });
}

/* ---- Reveal on scroll ----
   The usual suspects are tagged automatically, so the HTML doesn't need an
   attribute on every element. Things in the first screen show straight away. */
function initReveals() {
  const auto = [
    '.block-head:not(.ultra-head)', '.care', '.photo',
    '.story > *', '.about-photo', '.write-form > *',
    '.address-cards > li', '.prose > *', '.footer-cta .stack > *',
  ];
  document.querySelectorAll(auto.join(',')).forEach((el) => el.setAttribute('data-reveal', ''));

  // Siblings arrive one after another.
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    if (el.style.getPropertyValue('--d')) return;
    const siblings = [...el.parentElement.children].filter((s) => s.hasAttribute('data-reveal'));
    el.style.setProperty('--d', Math.min(siblings.indexOf(el), 6));
  });

  const targets = document.querySelectorAll('[data-reveal], [data-split]');

  if (reducedMotion || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-in'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  targets.forEach((el) => observer.observe(el));
}

/* ---- Header: gets a frosted background once you scroll, slides away while
   you scroll down, and comes back as soon as you scroll up ---- */
function initHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  let last = 0;
  scrollListeners.push((y) => {
    header.classList.toggle('is-scrolled', y > 40);
    if (y > last + 2 && y > 200) header.classList.add('is-hidden');
    if (y < last - 2 || y < 200) header.classList.remove('is-hidden');
    last = y;
  });
}

/* ---- Buttons lean towards the cursor ---- */
function initMagnetic() {
  if (!finePointer || reducedMotion) return;
  document.querySelectorAll('.btn, .send-btn, [data-magnetic]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const box = el.getBoundingClientRect();
      const dx = e.clientX - (box.left + box.width / 2);
      const dy = e.clientY - (box.top + box.height / 2);
      el.style.transform = `translate(${dx * 0.2}px, ${dy * 0.3}px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}

/* ---- A soft light-blue glow that follows the mouse ----
   It trails slightly behind the cursor (moving 10% of the way each frame),
   which makes it feel like light rather than a sticker. */
function initGlow() {
  // Pages can opt out with <body data-no-glow> (Contact and Privacy do).
  if (!finePointer || reducedMotion || document.body.hasAttribute('data-no-glow')) return;

  const glow = document.createElement('div');
  glow.className = 'cursor-glow';
  glow.setAttribute('aria-hidden', 'true');
  document.body.append(glow);

  let x = -1000, y = -1000, gx = -1000, gy = -1000;
  let started = false;

  window.addEventListener('pointermove', (e) => {
    x = e.clientX;
    y = e.clientY;
    if (!started) { gx = x; gy = y; started = true; }
    glow.classList.add('is-visible');
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => glow.classList.remove('is-visible'));

  (function follow() {
    gx += (x - gx) * 0.1;
    gy += (y - gy) * 0.1;
    glow.style.transform = `translate(${gx}px, ${gy}px)`;
    requestAnimationFrame(follow);
  })();
}


/* ---- Statement bands: the giant line drifts left as you scroll past ---- */
function initBands() {
  if (reducedMotion) return;
  const tracks = [...document.querySelectorAll('[data-band]')];
  if (!tracks.length) return;
  scrollListeners.push(() => {
    const vh = window.innerHeight;
    for (const track of tracks) {
      const box = track.parentElement.getBoundingClientRect();
      if (box.bottom < 0 || box.top > vh) continue;
      // 0 when the band enters at the bottom, 1 when it leaves at the top.
      const progress = (vh - box.top) / (vh + box.height);
      track.style.transform = `translateX(${(-8 - progress * 22).toFixed(2)}%)`;
    }
  });
}
