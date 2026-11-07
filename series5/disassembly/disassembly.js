/* Moves one drawn piece while its scroll layer is the current stage.
   Earlier pieces stay out. Later pieces stay in place. The list uses the same part id. */
(function () {
  var table = window.SeriesParts || {};

  function reduced() {
    return document.documentElement.classList.contains('is-reduced');
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function layerProgress(el) {
    var travel = Math.max(1, el.offsetHeight - window.innerHeight);
    return clamp(-el.getBoundingClientRect().top / travel, 0, 1);
  }

  function ease(t) {
    var x = clamp((t - 0.08) / 0.78, 0, 1);
    return x * x * (3 - 2 * x);
  }

  function apply() {
    var nodes = document.querySelectorAll('[data-scroll-layer][data-part]');
    var still = reduced();
    var mark = window.innerHeight * 0.5;
    var active = -1;
    if (!still) {
      for (var i = 0; i < nodes.length; i++) {
        var rect = nodes[i].getBoundingClientRect();
        if (rect.top <= mark && rect.bottom > mark) active = i;
      }
      var story = document.querySelector('[data-story]');
      if (active === -1 && story && story.getBoundingClientRect().bottom <= mark) {
        active = nodes.length;
      }
    }
    for (var n = 0; n < nodes.length; n++) {
      var id = nodes[n].dataset.part;
      var motion = table[id];
      var group = document.getElementById('part-' + id);
      if (!group || !motion) continue;
      var t = still ? 1 : (n < active ? 1 : (n === active ? ease(layerProgress(nodes[n])) : 0));
      var x = motion.x * t;
      var y = motion.y * t;
      var r = motion.r * t;
      group.setAttribute('transform', 'translate(' + x + ' ' + y + ') rotate(' + r + ' ' + motion.ox + ' ' + motion.oy + ')');
    }
  }

  var frame = 0;
  function request() {
    if (reduced()) return;
    if (!frame) frame = window.requestAnimationFrame(function () { frame = 0; apply(); });
  }

  var slot = document.getElementById('car-slot');
  if (!slot) return;
  var url = new URL('series5/disassembly/car.svg', document.baseURI);
  fetch(url)
    .then(function (res) { if (!res.ok) throw new Error('drawing'); return res.text(); })
    .then(function (text) {
      slot.innerHTML = text.replace(/^<\?xml[^>]*>/, '');
      apply();
      if (!reduced()) {
        window.addEventListener('scroll', request, { passive: true });
        window.addEventListener('resize', request);
      }
    })
    .catch(function () { /* the still image in the slot stays */ });
})();
