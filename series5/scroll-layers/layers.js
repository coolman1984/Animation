/* Staged scroll. A layer is current while it covers the middle of the screen.
   Progress is 0 when the layer's top hits the top of the screen, and 1 when the
   layer has moved up by its own height minus one screen. The part drawing uses the same sum. */
(function () {
  var frame = 0;

  function reduced() {
    return document.documentElement.classList.contains('is-reduced');
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function progress(el) {
    var travel = Math.max(1, el.offsetHeight - window.innerHeight);
    return clamp(-el.getBoundingClientRect().top / travel, 0, 1);
  }

  function tick() {
    frame = 0;
    if (reduced()) return;
    var mark = window.innerHeight * 0.5;
    var layers = document.querySelectorAll('[data-scroll-layer]');
    for (var i = 0; i < layers.length; i++) {
      var el = layers[i];
      var rect = el.getBoundingClientRect();
      var on = rect.top <= mark && rect.bottom > mark;
      el.style.setProperty('--p', progress(el).toFixed(4));
      el.classList.toggle('is-active', on);
      var row = el.dataset.part && document.querySelector('[data-part-link="' + el.dataset.part + '"]');
      if (!row) continue;
      row.classList.toggle('is-current', on);
      var link = row.querySelector('a');
      if (!link) continue;
      if (on) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
    var story = document.querySelector('[data-story]');
    if (!story) return;
    var travel = Math.max(1, story.offsetHeight - window.innerHeight);
    var storyP = clamp(-story.getBoundingClientRect().top / travel, 0, 1);
    var bands = document.querySelectorAll('[data-parallax]');
    for (var j = 0; j < bands.length; j++) {
      var speed = Number(bands[j].dataset.parallax) || 0;
      bands[j].style.transform = 'translate3d(0,' + ((storyP - 0.5) * speed) + 'px,0)';
    }
  }

  function request() {
    if (!frame) frame = window.requestAnimationFrame(tick);
  }

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  tick();
})();
