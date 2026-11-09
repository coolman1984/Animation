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
 * an element builds in ~0.35 s; 14 agents on desktop, 8 on phones; human-like curved, wavy pointer paths; nothing intercepts pointer events.
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
  function anim(node, frames, opt) { if (opt && opt.duration) opt.duration /= speed; var a = node.animate(frames, Object.assign({ fill: 'forwards', easing: 'cubic-bezier(.22,.8,.3,1)' }, opt)); return a.finished.catch(function () {}); }
  function digitsAr(s) { return rtl ? String(s).replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; }) : String(s); }

  function makeLayer() {
    layer = el('div', 'sw-layer', doc.body); layer.setAttribute('aria-hidden', 'true');
    sizeLayer(); addEventListener('resize', sizeLayer);
  }
  function sizeLayer() { layer.style.height = doc.documentElement.scrollHeight + 'px'; }

  // ---- agents move like a hand on a mouse (owner round 2: "random, circular, wavy, very smooth, like the original") ----
  // Every move is a curved cubic path (arcs and S-curves, random bend), timed with a minimum-jerk profile (how people move a
  // pointer: slow start, fast middle, soft landing, Fitts-like duration), with a small perpendicular wave, a slight overshoot that
  // springs back, and a short motion trail. Waiting agents never freeze: they circle in small loops and drift to new spots.
  // One requestAnimationFrame loop drives all of them; nothing is keyframed, so every path is different.
  var clock = 0, last = 0, speed = 1;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function minJerk(k) { return k * k * k * (10 - 15 * k + 6 * k * k); }
  function bez(a, b, c, d, t) { var u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; }

  function makeAgents(n) {
    for (var i = 0; i < n; i++) {
      var a = el('div', 'sw-agent', layer), c = COLORS[i % COLORS.length], ghosts = [];
      var arrow = '<svg viewBox="0 0 16 20" width="28" height="35"><path d="M1 1 L1 16 L5 12 L8 19 L11 18 L8 11 L14 11 Z" fill="' + c + '" stroke="#0B0E13" stroke-width="1.1" stroke-linejoin="round"/></svg>';
      for (var g = 0; g < 3; g++) { var gh = el('div', 'sw-ghost', layer); gh.innerHTML = arrow; gh.style.opacity = String(0.32 - g * 0.1); ghosts.push(gh); }
      a.style.setProperty('--c', c);
      a.innerHTML = arrow + '<span>' + (L.agent ? L.agent + ' ' : '') + digitsAr(i + 1) + '</span>';
      var x = innerWidth * rnd(0.1, 0.9), y = scrollY + innerHeight * rnd(0.2, 0.85);
      agents.push({ node: a, ghosts: ghosts, hist: [], x: x, y: y, ax: x, ay: y, idleSince: 0, nextWander: rnd(300, 1400),
        R: rnd(7, 16), w: rnd(2.2, 3.8), ph: rnd(0, 6.28), ph2: rnd(0, 6.28), busy: false, move: null, color: c });
    }
  }

  // move an agent to (x, y); opt.drag = called each frame with the cursor position; resolves on arrival
  function fly(agent, x, y, opt) {
    opt = opt || {};
    var x0 = agent.x, y0 = agent.y, dx = x - x0, dy = y - y0, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, px = -uy, py = ux;
    var b1 = rnd(-0.38, 0.38), b2 = Math.random() < 0.7 ? b1 * rnd(0.4, 1) : -b1 * rnd(0.3, 0.8);   // mostly arcs, sometimes an S
    var over = opt.drag ? 0 : Math.min(9, d * 0.045) * rnd(0.4, 1);
    var tx = x + ux * over, ty = y + uy * over;
    var dur = (opt.ms || (110 + 70 * Math.log2(1 + d / 36))) / speed;
    return new Promise(function (res) {
      agent.move = { x0: x0, y0: y0, c1x: x0 + dx * 0.3 + px * d * b1, c1y: y0 + dy * 0.3 + py * d * b1, c2x: x - dx * 0.3 + px * d * b2, c2y: y - dy * 0.3 + py * d * b2,
        x1: tx, y1: ty, fx: x, fy: y, t0: clock, dur: dur, wa: opt.drag ? 1.2 : Math.min(7, d * 0.03) * rnd(0.3, 1), wf: rnd(1.2, 2.6), wp: rnd(0, 6.28),
        px: px, py: py, settle: over > 0.5, drag: opt.drag, done: res };
    });
  }

  function stepAgent(a) {
    var m = a.move, x, y;
    if (m) {
      var k = Math.min(1, (clock - m.t0) / m.dur), e = minJerk(k), wave = m.wa * Math.sin(Math.PI * k) * Math.sin(m.wp + k * m.wf * 6.28);
      x = bez(m.x0, m.c1x, m.c2x, m.x1, e) + m.px * wave; y = bez(m.y0, m.c1y, m.c2y, m.y1, e) + m.py * wave;
      if (m.drag) m.drag(x, y);
      if (k >= 1) {
        if (m.settle) { a.move = { x0: x, y0: y, c1x: x, c1y: y, c2x: m.fx, c2y: m.fy, x1: m.fx, y1: m.fy, fx: m.fx, fy: m.fy, t0: clock, dur: 90 / speed, wa: 0, wf: 0, wp: 0, px: 0, py: 0, settle: false, done: m.done }; }
        else { a.move = null; a.ax = m.x1; a.ay = m.y1; a.idleSince = clock; m.done(); }
      }
    } else {
      // idle: small loops (circle/figure-eight) that fade in, plus an occasional lazy drift to a new spot
      var t = (clock - a.idleSince) / 1000, grow = Math.min(1, t / 0.5);
      x = a.ax + grow * a.R * Math.sin(a.w * t + a.ph); y = a.ay + grow * a.R * 0.75 * Math.sin(2 * a.w * t * 0.5 + a.ph2);
      if (!a.busy && clock - a.idleSince > a.nextWander) {
        a.x = x; a.y = y; a.nextWander = rnd(900, 2600);
        var vx = rnd(innerWidth * 0.08, innerWidth * 0.92), vy = scrollY + rnd(innerHeight * 0.15, innerHeight * 0.85);
        vx = a.x + (vx - a.x) * 0.35; vy = a.y + (vy - a.y) * 0.35;
        fly(a, vx, vy, { ms: rnd(600, 1100) });
      }
    }
    a.x = x; a.y = y;
    a.node.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
    a.hist.push(x, y); if (a.hist.length > 20) a.hist.splice(0, 2);
    for (var g = 0; g < a.ghosts.length; g++) { var i = a.hist.length - 2 - (g + 1) * 4; if (i >= 0) a.ghosts[g].style.transform = 'translate3d(' + a.hist[i].toFixed(1) + 'px,' + a.hist[i + 1].toFixed(1) + 'px,0)'; }
  }

  function loop(t) {
    var dt = last ? Math.min(50, t - last) : 16; last = t;
    if (!paused) { clock += dt; agents.forEach(stepAgent); }
    requestAnimationFrame(loop);
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
    [v, h].forEach(function (g) { anim(g, [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 650 }).then(function () { g.remove(); }); });
  }

  // reveal steps per kind; each returns a promise and leaves the element in its real, final state
  var reveal = {
    text: function (node) {
      var from = rtl || ar.test(node.textContent) ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)';
      node.classList.add('sw-typing');
      return anim(node, [{ clipPath: from }, { clipPath: 'inset(0 0 0 0)' }], { duration: Math.min(300, 110 + node.textContent.length * 2), easing: 'steps(' + Math.max(6, Math.min(28, node.textContent.trim().split(/\s+/).length * 2)) + ', end)' })
        .then(function () { node.classList.remove('sw-typing'); });
    },
    num: function (node) {
      var to = +node.getAttribute('data-to'), suffix = node.getAttribute('data-suffix') || '', t0 = performance.now(), d = 380, final = node.textContent;
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
      return wait(70).then(function () { node.classList.remove('sw-ph'); return anim(node, [{ clipPath: 'inset(0 0 100% 0)', filter: 'grayscale(1)' }, { clipPath: 'inset(0 0 0 0)', filter: 'grayscale(0)' }], { duration: 230 }); });
    },
    box: function (node) { return anim(node, [{ opacity: 0.35 }, { opacity: 1 }], { duration: 200 }); },
  };

  function buildOne(agent, node) {
    var kind = node.getAttribute('data-build') || 'box', b = page(node.getBoundingClientRect());
    if (!b.w || !b.h) { node.classList.remove('sw-pending'); return Promise.resolve(); }
    var cx = rtl ? b.x + b.w : b.x, cy = b.y, sel;
    return untilPlaying().then(function () { return fly(agent, cx + (rtl ? 3 : -3), cy - 2); }).then(function () {
      sel = selection(b, agent.color); guides(b);
      sel.node.style.width = '0px'; sel.node.style.height = '0px';
      if (rtl) sel.node.style.left = cx + 'px';
      // the box follows the cursor while it drags to the opposite corner
      return fly(agent, rtl ? b.x : b.x + b.w, b.y + b.h, { ms: 150 + Math.min(120, (b.w + b.h) * 0.06), drag: function (x, y) {
        var w = Math.max(0, Math.min(b.w, rtl ? cx - x : x - cx)), h = Math.max(0, Math.min(b.h, y - cy));
        sel.node.style.width = w + 'px'; sel.node.style.height = h + 'px'; if (rtl) sel.node.style.left = (cx - w) + 'px';
        sel.tag.textContent = Math.round(w) + ' × ' + Math.round(h);
      } });
    }).then(function () {
      sel.node.style.cssText += ';left:' + b.x + 'px;width:' + b.w + 'px;height:' + b.h + 'px';
      sel.tag.textContent = Math.round(b.w) + ' × ' + Math.round(b.h);
      node.classList.remove('sw-pending');
      return reveal[kind] ? reveal[kind](node) : Promise.resolve();
    }).then(function () {
      node.classList.add('sw-done'); built++; updateBar();
      anim(sel.node, [{ opacity: 1 }, { opacity: 0 }], { duration: 140, delay: 20 }).then(function () { sel.node.remove(); });
    });
  }

  // a part the visitor has already scrolled past (or not reached) is finished at once: nobody waits for a show they cannot see
  function offscreen(n) { var r = n.getBoundingClientRect(); return r.bottom < -40 || r.top > innerHeight + 40; }
  function instant(n) { n.classList.remove('sw-pending'); n.classList.add('sw-done'); built++; }
  function pump() {
    while (queue.length && offscreen(queue[0])) instant(queue.shift());
    updateBar();
    speed = queue.length > agents.length * 2 ? 1.6 : 1;
    agents.forEach(function (agent) {
      if (agent.busy || !queue.length) return;
      agent.busy = true;
      // take the nearest waiting part (a swarm spreads out by itself), preferring parts on screen
      var best = 0, bd = Infinity;
      for (var q = 0; q < queue.length; q++) { var r = queue[q].getBoundingClientRect(), d = Math.hypot(r.left + scrollX - agent.x, r.top + scrollY - agent.y) + (offscreen(queue[q]) ? 1e5 : 0) + q * 25; if (d < bd) { bd = d; best = q; } }
      var node = queue.splice(best, 1)[0];
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
    agents.forEach(function (a) { if (a.finale) { a.finale = false; a.busy = false; a.idleSince = clock; } });
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
    agents.forEach(function (a, i) { setTimeout(function () { a.busy = true; a.finale = true; fly(a, b.x + b.w / 2 - 6 + (i - agents.length / 2) * 3, b.y + b.h / 2 - 8, { ms: 700 }); }, i * 50); });
  }

  function setup(opt) {
    opt = opt || {};
    makeLayer(); makeAgents(opt.agents || (innerWidth < 700 ? 8 : 14)); running = true; requestAnimationFrame(loop);
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
