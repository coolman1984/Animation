// Studio web motion — zero-dependency motion for sites built by any model (studio/web/WEB.md).
// Every effect is opt-in by a data attribute, respects prefers-reduced-motion, and degrades to a readable static page.
//   data-reveal              rise from blur when it enters the view (CSS scroll timeline where supported, else IntersectionObserver)
//   data-split               headline words enter one by one (split on spaces only: Arabic letters are never separated)
//   data-parallax="0.15"     drifts against the scroll by that fraction
//   data-steps               sticky scrollytelling: the visual follows the step in view (data-step on each item)
//   data-ring                readable collection; native horizontal scroll
//   data-count="1200"        counts up once when visible (only for real, sourced numbers)
// Buttons stay in place so their targets remain predictable.
//   .progress                reading progress bar
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  if (typeof IntersectionObserver !== 'function') return;
  document.documentElement.classList.add('js');
  if (reduce) document.documentElement.classList.add('reduce');

  // split headlines into word spans (kept in reading order; RTL handled by the browser)
  for (const el of $$('[data-split]')) {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.textContent = '';
    words.forEach((w, i) => { const s = document.createElement('span'); s.className = 'w'; s.style.setProperty('--i', i); s.setAttribute('aria-hidden', 'true'); s.textContent = w; el.append(s, i < words.length - 1 ? ' ' : ''); });
  }

  // reveals: native scroll-driven animation when the browser has it, otherwise an observer adds .in
  const native = CSS.supports?.('animation-timeline: view()');
  if (native && !reduce) document.documentElement.classList.add('sda');
  const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
  for (const el of $$('[data-reveal], [data-split], [data-count]')) reduce ? el.classList.add('in') : io.observe(el);

  // counters
  const fmt = (n, lang) => new Intl.NumberFormat(lang || document.documentElement.lang || 'ar-EG').format(n);
  const cio = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return; cio.unobserve(e.target);
    const el = e.target, end = +el.dataset.count, t0 = performance.now(), dur = 1200;
    if (reduce) { el.textContent = fmt(end); return; }
    const tick = (t) => { const u = Math.min(1, (t - t0) / dur), k = 1 - Math.pow(1 - u, 3); el.textContent = fmt(Math.round(end * k)); if (u < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }), { threshold: 0.6 });
  for (const el of $$('[data-count]')) cio.observe(el);

  // sticky steps: mark the step in view, mirror it on the section
  for (const sec of $$('[data-steps]')) {
    const items = $$('[data-step]', sec), pins = $$('.pin span', sec);
    const sio = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { items.forEach((x) => x.classList.toggle('on', x === e.target)); pins.forEach((p, i) => p.classList.toggle('on', String(i) === e.target.dataset.step)); sec.dataset.active = e.target.dataset.step; } }), { rootMargin: '-45% 0px -45% 0px' });
    items.forEach((x) => sio.observe(x));
  }

  // parallax + progress (one passive scroll loop)
  const par = $$('[data-parallax]'), bar = document.querySelector('.progress');
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const h = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`;
    if (reduce) return;
    for (const el of par) { const r = el.getBoundingClientRect(), mid = r.top + r.height / 2 - innerHeight / 2; el.style.transform = `translate3d(0, ${(-mid * (+el.dataset.parallax || 0.15)).toFixed(1)}px, 0)`; }
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll); onScroll();

  // Collections use native horizontal scrolling: no autoplay, inertia or hidden cards.
})();
