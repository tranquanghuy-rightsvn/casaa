import { initForge } from './forge.js';

// Same scene-by-scene behaviour on every screen size; only reduced motion gets the stacked layout.
const PINNED = '(prefers-reduced-motion: no-preference)';

export function initHome() {
  initHero();
  initSolutions();
  fixHashLanding();
}

// Arriving from another page with /#du-an etc.: the browser jumps before the pinned
// solutions section adds its scroll length, so re-align once the layout is final.
function fixHashLanding() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id || !document.getElementById(id)) return;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const align = () => {
    ScrollTrigger.refresh();
    const el = document.getElementById(id);
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: 'instant' });
  };
  requestAnimationFrame(align);
  document.fonts?.ready.then(() => requestAnimationFrame(align));
  if (document.readyState === 'complete') requestAnimationFrame(align);
  else window.addEventListener('load', () => requestAnimationFrame(align), { once: true });
}

/* ---------------- Hero: scroll-scrubbed video + one orchestrated intro ---------------- */
function initHero() {
  if (!document.querySelector('[data-forge]')) return;
  initForge();

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  gsap.timeline({ delay: .15 })
    .to('.hero__title .line > span', { y: 0, duration: 1.2, ease: 'expo.out', stagger: .12 })
    .to('.hero__lead', { opacity: 1, y: 0, duration: .9, ease: 'power3.out' }, '-=.75')
    .to('.hero__cta', { opacity: 1, y: 0, duration: .9, ease: 'power3.out' }, '-=.7');
}

/* ---------------- Solutions: scene change, then words, then button ---------------- */
function splitWords(slide) {
  slide.querySelectorAll('.slide__title .line').forEach((line) => {
    const words = line.textContent.trim().split(/\s+/);
    line.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(' ');
  });
}

function parts(slide) {
  return {
    el: slide,
    img: slide.querySelector('.slide__media img'),
    dim: slide.querySelector('.slide__dim'),
    words: slide.querySelectorAll('.slide__title .w'),
    cta: slide.querySelector('.slide__cta'),
    eyebrow: slide.querySelector('.slide__eyebrow'),
    names: slide.querySelectorAll('.slide__name > span'),
    tagline: slide.querySelector('.slide__tagline'),
    feats: slide.querySelectorAll('.slide__feats li'),
  };
}

// Every text element of a slide, for hiding / fading out.
function textEls(p) {
  return [p.eyebrow, ...p.names, p.tagline, ...p.feats, ...p.words, p.cta].filter(Boolean);
}

// Product text settles in first, then the title word by word (line 1, then line 2),
// and the button last, like the client's reference video.
function textIn(p) {
  return gsap.timeline()
    .fromTo(p.eyebrow, { opacity: 0, x: -18 }, { opacity: 1, x: 0, duration: .45, ease: 'power3.out' })
    .fromTo(p.names, { opacity: 0, y: 24, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: .7, ease: 'power4.out', stagger: .08 }, '-=.25')
    .fromTo(p.tagline, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .45, ease: 'power3.out' }, '-=.45')
    .fromTo(p.feats, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .4, ease: 'power3.out', stagger: .05 }, '-=.3')
    .fromTo(p.words,
      { opacity: 0, y: '0.35em', filter: 'blur(8px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: .5, ease: 'power3.out', stagger: .065 }, '-=.25')
    .fromTo(p.cta,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: .5, ease: 'power3.out' }, '-=.25');
}

function initSolutions() {
  const section = document.querySelector('[data-solutions]');
  if (!section) return;
  const slides = [...section.querySelectorAll('[data-slide]')];
  const navButtons = [...section.querySelectorAll('[data-slides-nav] button')];
  const counter = section.querySelector('[data-slide-current]');
  slides.forEach(splitWords);
  const P = slides.map(parts);
  const n = slides.length;

  const mm = gsap.matchMedia();

  // Wide screens: the section pins and each scroll step changes the scene.
  mm.add(PINNED, () => {
    let current = 0;
    let tl = null;
    let introDone = false;

    gsap.set(slides, { autoAlpha: 0, zIndex: 0 });
    gsap.set(slides[0], { autoAlpha: 1, zIndex: 1 });
    gsap.set(P.flatMap(textEls), { opacity: 0 });

    const setNav = (i) => {
      navButtons.forEach((b, k) => b.setAttribute('aria-current', String(k === i)));
      if (counter) counter.textContent = String(i + 1).padStart(2, '0');
    };

    const goTo = (next) => {
      if (next === current) return;
      const prev = current;
      current = next;
      setNav(next);
      tl?.kill();

      slides.forEach((s, k) => { if (k !== prev && k !== next) gsap.set(s, { autoAlpha: 0, zIndex: 0 }); });
      const a = P[prev];
      const b = P[next];
      gsap.set(a.el, { zIndex: 1, autoAlpha: 1 });
      gsap.set(b.el, { zIndex: 2, autoAlpha: 0 });
      gsap.set(b.dim, { opacity: 1 });
      gsap.set(b.img, { scale: 1.08 });
      gsap.set(textEls(b), { opacity: 0 });

      tl = gsap.timeline({
        onComplete: () => {
          gsap.set(a.el, { autoAlpha: 0, zIndex: 0 });
          gsap.set(a.dim, { opacity: 0 });
          gsap.set(textEls(a), { opacity: 0 });
        },
      })
        // 1. current scene sinks into darkness
        .to(textEls(a), { opacity: 0, duration: .3, ease: 'power1.out' }, 0)
        .to(b.el, { autoAlpha: 1, duration: .5, ease: 'power2.inOut' }, .05)
        // 2. next scene rises out of the dark with a slow settle
        .addLabel('rise', '>-.05')
        .to(b.dim, { opacity: 0, duration: 1.1, ease: 'power2.out' }, 'rise')
        .to(b.img, { scale: 1, duration: 2.2, ease: 'power3.out' }, 'rise')
        // 3. text starts as soon as the image is mostly lit (not after the slow zoom)
        .add(textIn(b), 'rise+=.4');
    };

    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: () => `+=${(n - 1) * window.innerHeight}`,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      // Settle on the nearest scene once scrolling stops (predictable on touch flicks and dot clicks).
      snap: { snapTo: (v) => Math.round(v * (n - 1)) / (n - 1), duration: { min: 0.2, max: 0.6 }, delay: 0.1, ease: 'power1.inOut' },
      onUpdate: (self) => goTo(Math.min(n - 1, Math.round(self.progress * (n - 1)))),
    });

    // First scene: words appear once the section is mostly in view.
    ScrollTrigger.create({
      trigger: section,
      start: 'top 55%',
      onEnter: () => {
        if (introDone || current !== 0) return;
        introDone = true;
        tl = textIn(P[0]);
      },
    });

    const onNav = (e) => {
      const i = navButtons.indexOf(e.currentTarget);
      const y = st.start + ((st.end - st.start) * i) / (n - 1);
      window.scrollTo({ top: Math.ceil(y) + 1, behavior: 'instant' });
    };
    navButtons.forEach((b) => b.addEventListener('click', onNav));
    setNav(0);

    return () => {
      navButtons.forEach((b) => b.removeEventListener('click', onNav));
      tl?.kill();
    };
  });

}
