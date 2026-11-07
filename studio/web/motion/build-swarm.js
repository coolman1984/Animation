/* BUILD SWARM — a page that is visibly built in front of the visitor (studio motion module, 2026-11-07).
 * Owner reference: a screen recording of a site where a swarm of coloured cursors ("agents") selects each element with a blue
 * box and its W × H, drops measuring guides, rolls the numbers, types the words and fills grey placeholders, section by section,
 * while the visitor scrolls. Grammar learnt from that recording; code, copy and look here are original. Zero dependencies.
 *
 * Markup: mark parts with data-build="text | num | media | box" inside sections marked data-build-section.
 *   text   words are revealed in reading order (RTL aware) behind a caret; the text itself is real DOM text from the start
 *   num    data-to="24" (optional data-suffix): digits roll to the value; the final number is already in the HTML
 *   media  a grey placeholder with handles is drawn, then the image/canvas uncovers
 *   box    a card/rule: its outline is drawn, then its fill appears
 * Optional: <div data-build-bar></div> becomes the control bar (agents, progress, rebuild, pause).
 * Rules kept: without JavaScript, or with prefers-reduced-motion, the page is complete and still (the bar offers a manual run);
 * an element builds in ~0.45 s and a section of ~10 parts in ~1 s with six agents; nothing intercepts pointer events.
 *   BuildSwarm.start({ agents: 6, root: document })
 */
(function () {
  'use strict';
  var COLORS = ['#5B8CFF', '#F2B84B', '#46C79A', '#F06A8A', '#A98BFF', '#57C7E8', '#E8875A', '#C7D94B'];
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var doc = document, layer, agents = [], queue = [], built = 0, total = 0, paused = false, bar, running = false, finaleDone = false;
  var rtl = (doc.documentElement.dir || getComputedStyle(doc.documentElement).direction) === 'rtl';
  // bar and agent labels follow the page language; override with start({ labels: {...} })
  var L = rtl ? { agents: 'وكلاء يبنون', pause: 'إيقاف', resume: 'متابعة', again: 'ابنِ من جديد', still: 'الصفحة مكتملة. الحركة متوقفة حسب إعداد جهازك.', run: 'شغّل البناء', bar: 'تحكم البناء', agent: '' }
             : { agents: 'agents building', pause: 'Pause', resume: 'Resume', again: 'Rebuild', still: 'Page complete. Motion is off in your device settings.', run: 'Play the build', bar: 'Build controls', agent: '' };
  var ar = /[؀-ۿ]/;

  function el(tag, cls, parent) { var e = doc.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }
  function page(r) { return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function untilPlaying() { return paused ? new Promise(function (r) { var t = setInterval(function () { if (!paused) { clearInterval(t); r(); } }, 120); }) : Promise.resolve(); }
  function anim(node, frames, opt) { if (opt && opt.duration && queue.length > agents.length * 2) opt.duration *= 0.55; var a = node.animate(frames, Object.assign({ fill: 'forwards', easing: 'cubic-bezier(.22,.8,.3,1)' }, opt)); return a.finished.catch(function () {}); }
  function digitsAr(s) { return rtl ? String(s).replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; }) : String(s); }

  function makeLayer() {
    layer = el('div', 'sw-layer', doc.body); layer.setAttribute('aria-hidden', 'true');
    sizeLayer(); addEventListener('resize', sizeLayer);
  }
  function sizeLayer() { layer.style.height = doc.documentElement.scrollHeight + 'px'; }

  function makeAgents(n) {
    for (var i = 0; i < n; i++) {
      var a = el('div', 'sw-agent', layer), c = COLORS[i % COLORS.length];
      a.style.setProperty('--c', c);
      a.innerHTML = '<svg viewBox="0 0 16 20" width="28" height="35"><path d="M1 1 L1 16 L5 12 L8 19 L11 18 L8 11 L14 11 Z" fill="' + c + '" stroke="#0B0E13" stroke-width="1.1" stroke-linejoin="round"/></svg><span>' + (L.agent ? L.agent + ' ' : '') + digitsAr(i + 1) + '</span>';
      var start = { x: innerWidth * (0.15 + 0.7 * Math.random()), y: scrollY + innerHeight * (0.3 + 0.5 * Math.random()) };
      a.style.transform = 'translate(' + start.x + 'px,' + start.y + 'px)';
      agents.push({ node: a, x: start.x, y: start.y, busy: false, color: c });
    }
  }

  function fly(agent, x, y, ms) {
    var dx = x - agent.x, dy = y - agent.y, bend = Math.max(-80, Math.min(80, dx * 0.25));
    var mid = 'translate(' + (agent.x + dx / 2 + bend) + 'px,' + (agent.y + dy / 2 - Math.abs(bend) * 0.6) + 'px)';
    var p = anim(agent.node, [{ transform: 'translate(' + agent.x + 'px,' + agent.y + 'px)' }, { transform: mid, offset: 0.5 }, { transform: 'translate(' + x + 'px,' + y + 'px)' }], { duration: ms, easing: 'cubic-bezier(.45,.05,.25,1)' });
    agent.x = x; agent.y = y; return p;
  }

  function selection(b, color) {
    var s = el('div', 'sw-sel', layer); s.style.cssText = 'left:' + b.x + 'px;top:' + b.y + 'px;width:' + b.w + 'px;height:' + b.h + 'px;--c:' + color;
    for (var i = 0; i < 4; i++) el('i', 'h h' + i, s);
    var tag = el('b', 'sw-dim', s); tag.textContent = '0 × 0';
    s.style.transformOrigin = rtl ? 'top right' : 'top left';
    return { node: s, tag: tag };
  }
  function guides(b) {
    var v = el('div', 'sw-guide v', layer), h = el('div', 'sw-guide hz', layer), edge = rtl ? b.x + b.w : b.x;
    v.style.cssText = 'left:' + edge + 'px;top:' + (b.y - 120) + 'px;height:' + (b.h + 240) + 'px';
    h.style.cssText = 'top:' + b.y + 'px;left:0;width:100%';
    [v, h].forEach(function (g) { anim(g, [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 900 }).then(function () { g.remove(); }); });
  }

  // reveal steps per kind; each returns a promise and leaves the element in its real, final state
  var reveal = {
    text: function (node) {
      var from = rtl || ar.test(node.textContent) ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)';
      node.classList.add('sw-typing');
      return anim(node, [{ clipPath: from }, { clipPath: 'inset(0 0 0 0)' }], { duration: Math.min(420, 140 + node.textContent.length * 3), easing: 'steps(' + Math.max(6, Math.min(28, node.textContent.trim().split(/\s+/).length * 2)) + ', end)' })
        .then(function () { node.classList.remove('sw-typing'); });
    },
    num: function (node) {
      var to = +node.getAttribute('data-to'), suffix = node.getAttribute('data-suffix') || '', t0 = performance.now(), d = 520, final = node.textContent;
      return new Promise(function (res) {
        (function step(t) {
          var k = Math.min(1, (t - t0) / d), v = Math.round(to * (1 - Math.pow(1 - k, 3)));
          node.textContent = k < 1 ? digitsAr(k < 0.35 ? Math.floor(Math.random() * Math.pow(10, String(to).length)) : v) + suffix : final;
          if (k < 1) requestAnimationFrame(step); else res();
        })(t0);
      });
    },
    media: function (node) {
      node.classList.add('sw-ph');
      return wait(110).then(function () { node.classList.remove('sw-ph'); return anim(node, [{ clipPath: 'inset(0 0 100% 0)', filter: 'grayscale(1)' }, { clipPath: 'inset(0 0 0 0)', filter: 'grayscale(0)' }], { duration: 320 }); });
    },
    box: function (node) { return anim(node, [{ opacity: 0.35 }, { opacity: 1 }], { duration: 300 }); },
  };

  function buildOne(agent, node) {
    var kind = node.getAttribute('data-build') || 'box', b = page(node.getBoundingClientRect());
    if (!b.w || !b.h) { node.classList.remove('sw-pending'); return Promise.resolve(); }
    var corner = { x: rtl ? b.x + b.w : b.x, y: b.y };
    var dist = Math.hypot(corner.x - agent.x, corner.y - agent.y), ms = Math.max(140, Math.min(300, dist * 0.28));
    var sel;
    return untilPlaying().then(function () { return fly(agent, corner.x - (rtl ? 4 : -4), corner.y - 2, ms); }).then(function () {
      sel = selection(b, agent.color); guides(b);
      var t0 = performance.now(), W = Math.round(b.w), H = Math.round(b.h);
      (function count(t) { var k = Math.min(1, (t - t0) / 180); sel.tag.textContent = Math.round(W * k) + ' × ' + Math.round(H * k); if (k < 1) requestAnimationFrame(count); })(t0);
      fly(agent, rtl ? b.x : b.x + b.w, b.y + b.h, 190);
      return anim(sel.node, [{ transform: 'scale(0.02, 0.02)' }, { transform: 'scale(1,1)' }], { duration: 190 });
    }).then(function () {
      node.classList.remove('sw-pending');
      return reveal[kind] ? reveal[kind](node) : Promise.resolve();
    }).then(function () {
      node.classList.add('sw-done'); built++; updateBar();
      return anim(sel.node, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, delay: 30 }).then(function () { sel.node.remove(); });
    });
  }

  // a part the visitor has already scrolled past (or not reached) is finished at once: nobody waits for a show they cannot see
  function offscreen(n) { var r = n.getBoundingClientRect(); return r.bottom < -40 || r.top > innerHeight + 40; }
  function instant(n) { n.classList.remove('sw-pending'); n.classList.add('sw-done'); built++; }
  function pump() {
    while (queue.length && offscreen(queue[0])) instant(queue.shift());
    updateBar();
    agents.forEach(function (agent) {
      if (agent.busy || !queue.length) return;
      agent.busy = true;
      var node = queue.shift();
      buildOne(agent, node).then(function () { agent.busy = false; pump(); maybeFinale(); });
    });
  }

  function enqueueSection(sec) {
    if (sec.__swQueued) return; sec.__swQueued = true;
    sec.querySelectorAll('[data-build]').forEach(function (n) { if (!n.classList.contains('sw-done')) queue.push(n); });
    queue = queue.filter(function (n) { if (offscreen(n) && !sec.contains(n)) { instant(n); return false; } return true; });
    pump();
  }

  function updateBar() {
    if (!bar) return;
    bar.querySelector('.sw-count').textContent = digitsAr(built) + ' / ' + digitsAr(total);
    bar.querySelector('.sw-meter i').style.width = (total ? (100 * built) / total : 0) + '%';
  }

  function makeBar(host) {
    bar = host; bar.classList.add('sw-bar'); bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', L.bar);
    bar.innerHTML = '<span class="sw-dots">' + agents.map(function (a) { return '<i style="background:' + a.color + '"></i>'; }).join('') + '</span>' +
      '<span class="sw-label">' + digitsAr(agents.length) + ' ' + L.agents + '</span><span class="sw-meter"><i></i></span><span class="sw-count"></span>' +
      '<button type="button" class="sw-pause" aria-pressed="false">' + L.pause + '</button><button type="button" class="sw-again">' + L.again + '</button>';
    bar.querySelector('.sw-pause').onclick = function () { paused = !paused; this.setAttribute('aria-pressed', String(paused)); this.textContent = paused ? L.resume : L.pause; doc.documentElement.classList.toggle('sw-paused', paused); };
    bar.querySelector('.sw-again').onclick = rebuild;
    updateBar();
  }

  // take the visible part apart (selection flashes, content clipped away) and build it again; works with reduced motion too (user asked)
  function rebuild() {
    if (!layer) { setup(); }
    var nodes = Array.prototype.slice.call(doc.querySelectorAll('[data-build]')).filter(function (n) { var r = n.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; });
    nodes.forEach(function (n, i) {
      var b = page(n.getBoundingClientRect()), s = selection(b, COLORS[i % COLORS.length]); s.tag.textContent = Math.round(b.w) + ' × ' + Math.round(b.h);
      anim(s.node, [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }], { duration: 700, delay: i * 25 }).then(function () { s.node.remove(); });
      setTimeout(function () { n.classList.remove('sw-done'); n.classList.add('sw-pending'); built = Math.max(0, built - 1); updateBar(); }, 300 + i * 25);
    });
    setTimeout(function () { queue = nodes.concat(queue.filter(function (n) { return nodes.indexOf(n) < 0; })); finaleDone = false; pump(); }, 420 + nodes.length * 25);
  }

  // the last section built: agents gather on the brand mark and fade (the recording's ending, kept short)
  function maybeFinale() {
    if (finaleDone || queue.length || agents.some(function (a) { return a.busy; })) return;
    var mark = doc.querySelector('[data-build-finale]'); if (!mark || built < total) return;
    var r = mark.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
    finaleDone = true; var b = page(r);
    agents.forEach(function (a, i) { setTimeout(function () { fly(a, b.x + b.w / 2 - 6 + (i - agents.length / 2) * 3, b.y + b.h / 2 - 8, 700); }, i * 60); });
  }

  function setup(opt) {
    opt = opt || {};
    makeLayer(); makeAgents(opt.agents || 6); running = true;
    var all = doc.querySelectorAll('[data-build]'); total = all.length;
    all.forEach(function (n) { n.classList.add('sw-pending'); });
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) enqueueSection(e.target); }); }, { rootMargin: '0px 0px -15% 0px', threshold: 0.05 });
    doc.querySelectorAll('[data-build-section]').forEach(function (s) { io.observe(s); });
    addEventListener('scroll', function () { sizeLayer(); maybeFinale(); }, { passive: true });
    var host = doc.querySelector('[data-build-bar]'); if (host) makeBar(host);
  }

  window.BuildSwarm = {
    start: function (opt) {
      if (opt && opt.labels) Object.assign(L, opt.labels);
      doc.documentElement.classList.add('sw-js');
      var host = doc.querySelector('[data-build-bar]');
      if (reduce) {   // still page; the visitor can still ask for the show
        if (host) { host.classList.add('sw-bar'); host.innerHTML = '<span class="sw-label">' + L.still + '</span><button type="button" class="sw-again">' + L.run + '</button>'; host.querySelector('button').onclick = function () { reduce = false; host.innerHTML = ''; setup(opt); }; }
        return;
      }
      setup(opt);
    },
  };
})();
