// Hero "forge": scrolling scrubs the hero video like dragging a timeline.
// The video is pre-cut into a WebP frame sequence (public/assets/hero/{d,m}/000–119.webp);
// scroll progress through the tall section picks a frame and draws it on a canvas,
// while the text chapters, gauge and percentage follow the same progress.
const FRAMES = 120;
const pad = (n) => String(n).padStart(3, '0');

export function initForge() {
  const root = document.querySelector('[data-forge]');
  if (!root) return;

  const pin = root.querySelector('.forge__pin');
  const canvas = root.querySelector('.forge__canvas');
  const ctx = canvas.getContext('2d');
  const poster = root.querySelector('.forge__poster');
  const chapters = [...root.querySelectorAll('.forge__ch')];
  const steps = [...root.querySelectorAll('.forge__steps li')];
  const pctEl = root.querySelector('.forge__pct span');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const portrait = matchMedia('(max-aspect-ratio: 4/5)');

  // Without a canvas the first frame stays as a still image.
  if (!ctx) return;

  steps.forEach((li) => { li.style.bottom = `${parseFloat(li.dataset.at) * 100}%`; });

  /* ---------- Frame loading: coarse to fine, so scrubbing works before everything arrives ---------- */
  let set = null;
  let images = [];
  let loaded = [];

  const loadOrder = () => {
    const order = [];
    const seen = new Set();
    for (const step of [16, 8, 4, 2, 1]) {
      for (let i = 0; i < FRAMES; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
    }
    order.splice(1, 0, FRAMES - 1);
    return [...new Set(order)];
  };

  const startLoading = () => {
    const next = portrait.matches ? 'm' : 'd';
    if (next === set) return;
    set = next;
    images = new Array(FRAMES);
    loaded = new Array(FRAMES).fill(false);
    const token = set;
    const queue = loadOrder();
    let active = 0;
    const MAX = 6;
    const pump = () => {
      while (active < MAX && queue.length) {
        const i = queue.shift();
        active += 1;
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
          active -= 1;
          if (token !== set) return;
          images[i] = img;
          loaded[i] = true;
          needsDraw = true;
          requestTick();
          pump();
        };
        img.onerror = () => { active -= 1; pump(); };
        img.src = `/assets/hero/${set}/${pad(i)}.webp`;
      }
    };
    pump();
  };

  const nearest = (i) => {
    if (loaded[i]) return i;
    for (let d = 1; d < FRAMES; d += 1) {
      if (i - d >= 0 && loaded[i - d]) return i - d;
      if (i + d < FRAMES && loaded[i + d]) return i + d;
    }
    return -1;
  };

  /* ---------- Canvas: cover-fit drawing ---------- */
  let cw = 0;
  let ch = 0;
  let lastDrawn = -1;
  let needsDraw = true;

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = Math.round(r.width * dpr);
    ch = Math.round(r.height * dpr);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    lastDrawn = -1;
    needsDraw = true;
  };

  const draw = (i) => {
    const k = nearest(i);
    if (k < 0 || (k === lastDrawn && !needsDraw)) return;
    const img = images[k];
    const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    lastDrawn = k;
    needsDraw = false;
    if (poster.style.visibility !== 'hidden') poster.style.visibility = 'hidden';
  };

  /* ---------- Scroll progress → frame + UI ---------- */
  let target = 0;
  let current = 0;
  let ticking = false;
  let activeIdx = 0;

  const progress = () => {
    const total = root.offsetHeight - pin.offsetHeight;
    if (total <= 0) return 0;
    const p = -root.getBoundingClientRect().top / total;
    return p < 0 ? 0 : p > 1 ? 1 : p;
  };

  const updateUI = (p) => {
    root.style.setProperty('--p', p.toFixed(4));
    if (pctEl) pctEl.textContent = Math.round(p * 100);
    root.classList.toggle('is-ending', p > 0.85);

    let idx = 0;
    chapters.forEach((c, i) => { if (p >= parseFloat(c.dataset.from)) idx = i; });
    if (idx !== activeIdx) {
      chapters[activeIdx].classList.remove('is-active');
      chapters[idx].classList.add('is-active');
      activeIdx = idx;
    }
    steps.forEach((li, i) => {
      const at = parseFloat(li.dataset.at);
      const nextAt = steps[i + 1] ? parseFloat(steps[i + 1].dataset.at) : 2;
      li.classList.toggle('is-current', p >= at && p < nextAt);
      li.classList.toggle('is-done', p >= nextAt);
    });
  };

  const tick = () => {
    ticking = false;
    // Ease toward the scroll position for a smooth, film-like scrub.
    const diff = target - current;
    current = reduce.matches || Math.abs(diff) < 0.0008 ? target : current + diff * 0.18;
    updateUI(current);
    draw(Math.round(current * (FRAMES - 1)));
    if (current !== target) requestTick();
  };
  function requestTick() {
    if (!ticking) { ticking = true; requestAnimationFrame(tick); }
  }

  // While the hero is near the viewport, sample the scroll position once per frame.
  let visible = true;
  let watching = false;
  const watch = () => {
    if (!visible) { watching = false; return; }
    const t = progress();
    if (t !== target) { target = t; requestTick(); }
    requestAnimationFrame(watch);
  };
  const startWatch = () => { if (!watching) { watching = true; requestAnimationFrame(watch); } };

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) { target = progress(); requestTick(); startWatch(); }
    }, { rootMargin: '200px 0px' }).observe(root);
  } else {
    startWatch();
  }

  const onChange = () => { resize(); startLoading(); target = progress(); requestTick(); };
  window.addEventListener('resize', onChange);
  portrait.addEventListener('change', onChange);

  resize();
  startLoading();
  target = current = progress();
  updateUI(current);
}
