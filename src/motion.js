/* ==========================================================================
   MOTION
   Everything that moves on scroll or on the cursor. Each feature is its own
   function, so any one of them can be deleted without touching the others.
   ========================================================================== */

import Lenis from 'lenis';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

let lenis = null;
const scrollListeners = [];

export function initMotion() {
  initSmoothScroll();
  splitHeadlines();
  initIntro();
  initReveals();
  initScrubText();
  initCountUp();
  initHeader();
  initPhotoParallax();
  initCursor();
  initMagnetic();
  initToTop();

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
    wrapWords(el, (word) => {
      const outer = document.createElement('span');
      outer.className = 'w';
      const inner = document.createElement('span');
      inner.textContent = word;
      inner.style.setProperty('--i', index++);
      outer.append(inner);
      return outer;
    });
    el.classList.add('split');
  });
}

// Replaces each word inside `el` with whatever `make(word)` returns,
// keeping elements like <em> around the words they wrapped.
function wrapWords(el, make) {
  for (const node of [...el.childNodes]) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      wrapWords(node, make);
      continue;
    }
    if (node.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) continue;

    const parts = node.textContent.split(/(\s+)/);
    const fragment = document.createDocumentFragment();
    for (const part of parts) {
      if (!part) continue;
      fragment.append(/^\s+$/.test(part) ? document.createTextNode(' ') : make(part));
    }
    node.replaceWith(fragment);
  }
}

/* ---- Intro: 000 → 100, once per visit, homepage only ----
   Driven by the clock and backed by a timer, so it always finishes, even if
   the page loaded in a background tab where animation frames are paused. */
function initIntro() {
  const intro = document.querySelector('.intro');
  const root = document.documentElement;
  const heroTitle = document.querySelector('.hero [data-split]');

  const finish = () => {
    if (root.classList.contains('is-ready')) return;
    root.classList.add('is-ready');
    heroTitle?.classList.add('is-in');
    document.querySelectorAll('.hero [data-reveal]').forEach((el) => el.classList.add('is-in'));
    lenis?.start();
    if (intro) {
      intro.classList.add('is-done');
      setTimeout(() => intro.remove(), 1200);
    }
  };

  const show = intro && !root.classList.contains('intro-seen') && !reducedMotion;
  if (!show) {
    intro?.remove();
    requestAnimationFrame(finish);
    setTimeout(finish, 100);
    return;
  }

  try { sessionStorage.setItem('lorenzask-intro', '1'); } catch (error) { /* private mode: fine */ }

  lenis?.stop();
  window.scrollTo(0, 0);

  const count = intro.querySelector('.intro-count');
  const bar = intro.querySelector('.intro-bar');
  const duration = 1500;
  const start = performance.now();

  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    count.textContent = String(Math.round(eased * 100)).padStart(3, '0');
    bar.style.transform = `scaleX(${eased})`;
    if (t < 1) requestAnimationFrame(tick);
    else setTimeout(finish, 250);
  }
  requestAnimationFrame(tick);
  setTimeout(finish, duration + 800); // safety net
}

/* ---- Reveal on scroll ----
   On the inner pages we tag the usual suspects automatically, so the HTML
   doesn't need an attribute on every element. */
function initReveals() {
  const auto = [
    '.spread > *:not(.factors):not(.stats):not(.steps):not(.facts):not(.address-cards):not(.write-form)',
    '.factors > li', '.stats > div', '.steps > li', '.facts > div', '.address-cards > li',
    '.write-form > *', '.about-copy > *', '.section-body > *', '.section > .label',
    '.footer-top', '.wordmark',
  ];
  document.querySelectorAll(auto.join(',')).forEach((el) => {
    if (!el.closest('.hero')) el.setAttribute('data-reveal', '');
  });

  // Siblings arrive one after another.
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    const siblings = [...el.parentElement.children].filter((s) => s.hasAttribute('data-reveal'));
    if (!el.style.getPropertyValue('--d')) el.style.setProperty('--d', Math.min(siblings.indexOf(el), 6));
  });

  const targets = document.querySelectorAll('[data-reveal], [data-split]:not(.hero [data-split]), .origin-photo');

  if (reducedMotion || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-in'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      if (entry.target.closest('.hero')) continue; // the intro reveals the hero
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  targets.forEach((el) => observer.observe(el));
}

/* ---- Story text that lights up word by word as you scroll ---- */
function initScrubText() {
  document.querySelectorAll('[data-scrub]').forEach((el) => {
    wrapWords(el, (word) => {
      const span = document.createElement('span');
      span.className = 'sw';
      span.textContent = word;
      return span;
    });
    const words = [...el.querySelectorAll('.sw')];

    scrollListeners.push(() => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the text enters the bottom 15% of the screen, 1 when it has risen past 40%.
      const progress = (vh * 0.85 - rect.top) / (rect.height + vh * 0.45);
      const lit = Math.round(Math.min(Math.max(progress, 0), 1) * words.length);
      words.forEach((w, i) => w.classList.toggle('lit', i < lit));
    });
  });
}

/* ---- Numbers that count up when they come into view ---- */
function initCountUp() {
  const els = document.querySelectorAll('[data-count]');
  if (!els.length) return;

  const format = (el, value) => {
    el.textContent = Math.round(value).toLocaleString('en-US') + (el.dataset.suffix || '');
  };

  const run = (el) => {
    const target = Number(el.dataset.count);
    if (reducedMotion) return format(el, target);
    const start = performance.now();
    const duration = 1600;
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1);
      format(el, target * (1 - Math.pow(1 - t, 4)));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    setTimeout(() => format(el, target), duration + 500); // always land on the real number
  };

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      run(entry.target);
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.5 });

  els.forEach((el) => {
    format(el, 0);
    observer.observe(el);
  });
}

/* ---- Header: slides away while you scroll down, returns when you scroll up ---- */
function initHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  let last = 0;
  scrollListeners.push((y) => {
    const goingDown = y > last + 2;
    const goingUp = y < last - 2;
    if (goingDown && y > 160) header.classList.add('is-hidden');
    if (goingUp || y < 160) header.classList.remove('is-hidden');
    last = y;
  });
}

/* ---- The origin photo drifts slightly slower than the page ---- */
function initPhotoParallax() {
  const img = document.querySelector('.origin-photo img');
  if (!img || reducedMotion) return;
  scrollListeners.push(() => {
    const rect = img.parentElement.getBoundingClientRect();
    const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
    img.style.transform = `translateY(${(Math.min(Math.max(progress, 0), 1) - 1) * 15}%)`;
  });
}

/* ---- Custom cursor: a dot, and a ring that trails it ---- */
function initCursor() {
  if (!finePointer || reducedMotion) return;

  const dot = document.createElement('div');
  const ring = document.createElement('div');
  dot.className = 'cursor';
  ring.className = 'cursor-ring';
  document.body.append(dot, ring);
  document.documentElement.classList.add('has-cursor');

  let x = -100, y = -100, rx = -100, ry = -100;

  window.addEventListener('pointermove', (e) => {
    x = e.clientX;
    y = e.clientY;
    dot.style.transform = `translate(${x}px, ${y}px)`;
  }, { passive: true });

  const interactive = 'a, button, input[type="range"], [data-cursor]';
  document.addEventListener('pointerover', (e) => {
    ring.classList.toggle('is-hover', !!e.target.closest(interactive));
  });
  document.addEventListener('pointerdown', () => ring.classList.add('is-down'));
  document.addEventListener('pointerup', () => ring.classList.remove('is-down'));

  (function follow() {
    rx += (x - rx) * 0.16;
    ry += (y - ry) * 0.16;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    requestAnimationFrame(follow);
  })();
}

/* ---- Buttons lean towards the cursor ---- */
function initMagnetic() {
  if (!finePointer || reducedMotion) return;
  document.querySelectorAll('.btn, .send-btn, [data-magnetic]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const box = el.getBoundingClientRect();
      const dx = e.clientX - (box.left + box.width / 2);
      const dy = e.clientY - (box.top + box.height / 2);
      el.style.transform = `translate(${dx * 0.22}px, ${dy * 0.32}px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}

function initToTop() {
  document.querySelectorAll('[data-to-top]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      if (lenis) lenis.scrollTo(0, { duration: 1.6 });
      else window.scrollTo({ top: 0 });
    });
  });
}
