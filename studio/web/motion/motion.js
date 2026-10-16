// Studio web motion — zero-dependency motion for sites built by any model (studio/web/WEB.md).
// Every effect is opt-in by a data attribute, respects prefers-reduced-motion, and degrades to a readable static page.
//   data-reveal              rise from blur when it enters the view (CSS scroll timeline where supported, else IntersectionObserver)
//   data-split               headline words enter one by one (split on spaces only: Arabic letters are never separated)
//   data-parallax="0.15"     drifts against the scroll by that fraction
//   data-steps               sticky scrollytelling: the visual follows the step in view (data-step on each item)
//   data-ring                3D card ring: drag, wheel or arrow keys to spin; auto-spins until touched
//   data-count="1200"        counts up once when visible (only for real, sourced numbers)
//   data-magnetic            buttons lean toward the pointer
//   .progress                reading progress bar
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
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

  // 3D ring of cards
  for (const ring of $$('[data-ring]')) {
    const cards = $$('.ring-card', ring), n = cards.length, stage = ring.querySelector('.ring-stage');
    if (!n || !stage) continue;
    let angle = 0, vel = reduce ? 0 : 0.06, drag = null, idle = !reduce;
    const radius = () => Math.max(200, Math.min(520, ring.clientWidth * 0.38));
    const layout = () => cards.forEach((c, i) => {
      const a = angle + (i * 360) / n, rad = (a * Math.PI) / 180, front = (Math.cos(rad) + 1) / 2;
      c.style.transform = `rotateY(${a}deg) translateZ(${radius()}px)`;
      c.style.opacity = (0.25 + 0.75 * front).toFixed(3); c.style.filter = front < 0.5 ? `blur(${((0.5 - front) * 6).toFixed(1)}px)` : 'none';
      c.style.zIndex = String(Math.round(front * 100));
      c.setAttribute('aria-hidden', front < 0.75 ? 'true' : 'false');
    });
    const loop = () => { if (!drag) { if (idle) angle += vel; else { angle += vel; vel *= 0.95; if (Math.abs(vel) < 0.002) vel = 0; } } layout(); if (!reduce) requestAnimationFrame(loop); };
    ring.addEventListener('pointerdown', (e) => { idle = false; drag = { x: e.clientX, a: angle, t: performance.now() }; ring.setPointerCapture(e.pointerId); });
    ring.addEventListener('pointermove', (e) => { if (!drag) return; const na = drag.a + (e.clientX - drag.x) * 0.3, now = performance.now(); vel = (na - angle) / Math.max(1, (now - drag.t) / 16); drag.t = now; angle = na; });
    ring.addEventListener('pointerup', () => { drag = null; });
    ring.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { idle = false; angle += (e.key === 'ArrowLeft' ? -1 : 1) * (360 / n); layout(); e.preventDefault(); } });
    ring.addEventListener('wheel', (e) => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { idle = false; vel = e.deltaX * 0.02; e.preventDefault(); } }, { passive: false });
    layout(); if (!reduce) requestAnimationFrame(loop);
  }

  // magnetic buttons
  if (!reduce && matchMedia('(pointer: fine)').matches) for (const b of $$('[data-magnetic]')) {
    b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1)}px, ${((e.clientY - r.top - r.height / 2) * 0.25).toFixed(1)}px)`; });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  }
})();
