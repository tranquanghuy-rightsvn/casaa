// Products page: pinned scene-by-scene showcase (same behaviour as the home
// solutions section, kept as a separate module so the page owns its own flow).
const PINNED = '(prefers-reduced-motion: no-preference)';

export function initProducts() {
  const section = document.querySelector('[data-products]');
  if (!section) return;

  const slides = [...section.querySelectorAll('[data-slide]')];
  if (!slides.length) return;

  const navButtons = [...section.querySelectorAll('[data-slides-nav] button')];
  const counter = section.querySelector('[data-slide-current]');
  const P = slides.map(parts);
  const n = slides.length;

  const mm = gsap.matchMedia();

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
        .to(textEls(a), { opacity: 0, duration: .3, ease: 'power1.out' }, 0)
        .to(b.el, { autoAlpha: 1, duration: .5, ease: 'power2.inOut' }, .05)
        .addLabel('rise', '>-.05')
        .to(b.dim, { opacity: 0, duration: 1.1, ease: 'power2.out' }, 'rise')
        .to(b.img, { scale: 1, duration: 2.2, ease: 'power3.out' }, 'rise')
        .add(textIn(b), 'rise+=.4');
    };

    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: () => `+=${(n - 1) * window.innerHeight}`,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      snap: { snapTo: (v) => Math.round(v * (n - 1)) / (n - 1), duration: { min: 0.2, max: 0.6 }, delay: 0.1, ease: 'power1.inOut' },
      onUpdate: (self) => goTo(Math.min(n - 1, Math.round(self.progress * (n - 1)))),
    });

    // Deep link (/san-pham/#lam-hoa-gio): land on that product.
    const hash = decodeURIComponent(location.hash.slice(1));
    const hashIndex = slides.findIndex((s) => s.id === hash);
    if (hashIndex > 0) {
      const align = () => {
        const y = st.start + ((st.end - st.start) * hashIndex) / (n - 1);
        window.scrollTo({ top: Math.ceil(y) + 1, behavior: 'instant' });
      };
      requestAnimationFrame(() => requestAnimationFrame(align));
      document.fonts?.ready.then(() => requestAnimationFrame(align));
      window.addEventListener('load', () => requestAnimationFrame(align), { once: true });
    }

    // First scene: text appears once the section is mostly in view.
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

function parts(slide) {
  return {
    el: slide,
    img: slide.querySelector('.slide__media img'),
    dim: slide.querySelector('.slide__dim'),
    cta: slide.querySelector('.slide__cta'),
    eyebrow: slide.querySelector('.slide__eyebrow'),
    names: slide.querySelectorAll('.slide__name > span'),
    tagline: slide.querySelector('.slide__tagline'),
    feats: slide.querySelectorAll('.slide__feats li'),
  };
}

function textEls(p) {
  return [p.eyebrow, ...p.names, p.tagline, ...p.feats, p.cta].filter(Boolean);
}

function textIn(p) {
  return gsap.timeline()
    .fromTo(p.eyebrow, { opacity: 0, x: -18 }, { opacity: 1, x: 0, duration: .45, ease: 'power3.out' })
    .fromTo(p.names, { opacity: 0, y: 24, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: .7, ease: 'power4.out', stagger: .08 }, '-=.25')
    .fromTo(p.tagline, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .45, ease: 'power3.out' }, '-=.45')
    .fromTo(p.feats, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .4, ease: 'power3.out', stagger: .05 }, '-=.3')
    .fromTo(p.cta, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .5, ease: 'power3.out' }, '-=.25');
}
