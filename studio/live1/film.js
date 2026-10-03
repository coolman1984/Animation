// LIVE 1 — live-action study: real footage of a real person + animation before, behind, around and in front of him. 12 s, 1080×1920.
// Footage: Intel IoT sample video (CC BY 4.0), analysed by tools/live.py into live1/plates/pack (frames, mattes, tracks, words).
//  0.0–3.2  he walks toward camera, auto-reframed 16:9 → 9:16; the giant word «حقيقي» sits BEHIND him (he occludes it)
//  3.2–5.0  freeze-frame character intro: world goes grey, he pops in colour with a sticker outline, a tag points at his head
//  5.0–6.8  unfreeze; a ring of brand pixels orbits him, passing behind and in front (the matte sandwich); a label rides his head
//  6.8–8.6  jump cut hidden by a punch-in on his face (lib/edl.mjs plan) + whoosh
//  8.6–12   the footage shrinks into a card; the card clips the plate but not the cutout, so his head breaks out of the frame
// Captions: the scratch voiceover's words (tools/live.py align) as karaoke pages (lib/edl.mjs pageCaptions). Every frame is a function
// of t: footage frames are fetched/decoded and awaited before capture (lib/footage.js), tracked anchors are cached JSON.
import { clamp, lerp, ramp, ease, el, textLine } from '../lib/motion.js';
import { springStep, hash } from '../lib/kinetics.js';
import { footage } from '../lib/footage.js';
import { pageCaptions, wordState, punchIns } from '../lib/edl.mjs';

const W = 1080, H = 1920, FPS = 30;
const C = { ink: '#1F2328', blue: '#0A66FF', cyan: '#18B6FF', paper: '#F2F0EB' };
const AR = "'Alexandria'", MONO = "'Space Mono'";
const oE = ease.outExpo, ioC = ease.inOutCubic;
const sm = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const spr = (t, s, d = 0.5, b = 0.2) => (t <= s ? 0 : springStep(t - s, { duration: d, bounce: b }).value);
const px = (v) => `${(+v).toFixed(2)}px`;
const div = (p, st = {}) => el('div', { style: { position: 'absolute', left: '0', top: '0', ...st } }, p);
const canvas = (p, z) => el('canvas', { width: W, height: H, style: { position: 'absolute', left: '0', top: '0', width: px(W), height: px(H), zIndex: String(z) } }, p);

// ---------- the edit (film seconds → source seconds) ----------
const EDIT = [{ a: 0, b: 3.2, src: 1.2 }, { a: 3.2, b: 5.0, freeze: 5.4 }, { a: 5.0, b: 6.8, src: 5.4 }, { a: 6.8, b: 12.01, src: 8.4 }];
const shotAt = (t) => EDIT.find((e) => t >= e.a && t < e.b) || EDIT[EDIT.length - 1];
const srcAt = (t) => { const e = shotAt(t); return e.freeze ?? e.src + (t - e.a); };
const PUNCH = punchIns([{ i: 0 }, { i: 1 }], { scale: 1.14, push: 0.025 }); // clip 0 = 5.0–6.8 wide, clip 1 = 6.8–8.6 punched in
const CARD = { crop: { cx: 0.5, cy: 0.5, w: 0.6, h: 1 }, dest: { x: 70, y: 240, w: 940, h: 940 * 608 / 648 }, clip: [585, 70, 0, 70] }; // clip: top right bottom left inset px

let F, plate, behind, cut, cutWrap, front, bg, word, tag, tagLine, label, title, sub, caps = [], pages = [];

export default {
  duration: 12, fps: FPS,
  async init(stage) {
    stage.style.background = C.ink;
    bg = div(stage, { width: px(W), height: px(H), zIndex: '0', background: `radial-gradient(ellipse 90% 60% at 50% 35%, #3586FF 0%, #0B5CF2 50%, #0738C2 100%)` });
    plate = canvas(stage, 1);
    behind = canvas(stage, 2);
    word = div(stage, { width: px(W), top: '640px', zIndex: '2', textAlign: 'center', direction: 'rtl', fontFamily: AR, fontWeight: '900', fontSize: '250px', lineHeight: '1', color: C.blue, letterSpacing: '-0.02em', textShadow: '0 20px 60px rgba(10,60,200,0.35)' });
    word.textContent = 'حقيقي';
    cutWrap = div(stage, { width: px(W), height: px(H), zIndex: '3' }); cut = canvas(cutWrap, 1);
    front = canvas(stage, 4);
    tag = div(stage, { zIndex: '6', padding: '18px 30px', borderRadius: '22px', background: C.ink, color: '#fff', direction: 'rtl', whiteSpace: 'nowrap', boxShadow: '0 18px 40px rgba(0,0,0,0.35)' });
    el('div', { text: 'بطل الإعلان', style: { fontFamily: AR, fontWeight: '800', fontSize: '58px', lineHeight: '1.2' } }, tag);
    el('div', { text: 'REAL PERSON · REAL FOOTAGE', style: { fontFamily: MONO, fontSize: '22px', letterSpacing: '0.14em', color: C.cyan, direction: 'ltr', textAlign: 'right' } }, tag);
    tagLine = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { position: 'absolute', left: '0', top: '0', zIndex: '5', overflow: 'visible' } }, stage);
    tagLine = el('path', { d: '', fill: 'none', stroke: '#fff', 'stroke-width': 5, 'stroke-linecap': 'round' }, tagLine);
    label = div(stage, { zIndex: '6', padding: '12px 26px', borderRadius: '40px', background: 'rgba(255,255,255,0.95)', color: C.ink, fontFamily: AR, fontWeight: '700', fontSize: '40px', direction: 'rtl', whiteSpace: 'nowrap', boxShadow: '0 12px 30px rgba(0,0,0,0.25)' });
    label.textContent = 'شخصية حقيقية';
    title = textLine(stage, 'فيديو حقيقي + موشن', { left: '0', top: '1132px', width: px(W), justifyContent: 'center', fontFamily: AR, fontWeight: '800', fontSize: '72px', color: '#fff', lineHeight: '1.25', zIndex: '7' });
    sub = div(stage, { width: px(W), top: '1228px', textAlign: 'center', fontFamily: MONO, fontSize: '28px', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.8)', zIndex: '7' }); sub.textContent = 'PIXEL PLUS';
    F = await footage(new URL('./plates/pack/', import.meta.url), { plate, cutout: cut });
    // captions: voiceover words → pages; one textLine per page so the studio's text/safe-area checks read them
    pages = pageCaptions(F.transcript.words, { maxWords: 4, maxChars: 20, hold: 0.2 });
    caps = pages.map((p) => {
      const L = textLine(stage, p.words.map((w) => w.w).join(' '), { left: '0', top: '1110px', width: px(W), justifyContent: 'center', fontFamily: AR, fontWeight: '800', fontSize: '72px', color: '#fff', lineHeight: '1.35', zIndex: '8' });
      L.words.forEach((w) => Object.assign(w.style, { padding: '0 14px', borderRadius: '16px', textShadow: '0 4px 18px rgba(0,0,0,0.55)' }));
      return L;
    });
  },
  async render(t) {
    const shot = shotAt(t), s = srcAt(t), frozen = !!shot.freeze;
    // ---- camera: follow-crop (9:16) → card; punch-in on the face during the second standing clip
    const face = F.anchor(0, 'nose', s) || [0.5, 0.4];
    const follow = F.follow(s);
    const toCard = ioC(ramp(t, 8.6, 9.3));
    const crop = { cx: lerp(follow.cx, CARD.crop.cx, toCard), cy: 0.5, w: lerp(follow.w, CARD.crop.w, toCard), h: 1 };
    const full = { x: 0, y: 0, w: W, h: H };
    const dest = { x: lerp(full.x, CARD.dest.x, toCard), y: lerp(full.y, CARD.dest.y, toCard), w: lerp(full.w, CARD.dest.w, toCard), h: lerp(full.h, CARD.dest.h, toCard) };
    let zoom = 1;
    if (frozen) zoom = 1 + 0.06 * ioC(ramp(t, 3.2, 5.0));
    else if (t >= 6.8 && t < 8.6) zoom = PUNCH[1].base * (1 + PUNCH[1].push * ramp(t, 6.8, 8.6));
    zoom = lerp(zoom, 1, toCard);
    const fz = sm(3.2, 3.32, t) * (1 - sm(4.95, 5.1, t)), stroke = Math.max(fz, sm(9.0, 9.4, t));
    await F.draw(s, { crop, dest, zoom, focus: face, freeze: frozen ? shot.freeze : undefined, outline: { px: 7 * stroke, color: '#fff' } });
    // ---- card: the plate is clipped to a rounded card, the cutout is not → his head breaks out of the frame
    const k = toCard, [ct, cr, cb, cl] = CARD.clip;
    plate.style.clipPath = k > 0 ? `inset(${px(lerp(0, ct, k))} ${px(lerp(0, cr, k))} ${px(lerp(0, H - dest.y - dest.h + cb, k))} ${px(lerp(0, cl, k))} round ${px(48 * k)})` : 'none';
    // ---- freeze treatment: grey world, colour hero with a sticker outline
    plate.style.filter = fz > 0.01 ? `grayscale(${fz.toFixed(3)}) brightness(${(1 - 0.5 * fz).toFixed(3)})` : 'none';
    cutWrap.style.transform = `scale(${(1 + 0.03 * clamp(spr(t, 3.2, 0.45, 0.35), 0, 1.2) * (1 - sm(4.95, 5.1, t))).toFixed(4)})`;
    cutWrap.style.transformOrigin = `${F.toStage(face)[0].toFixed(1)}px ${F.toStage(face)[1].toFixed(1)}px`;
    // ---- word behind him (shot A)
    const wv = sm(0.15, 0.6, t) * (1 - sm(3.05, 3.25, t));
    word.style.opacity = wv.toFixed(3); word.style.transform = `translateY(${((1 - oE(ramp(t, 0.15, 0.9))) * 80).toFixed(1)}px) scale(${(1 + 0.06 * ramp(t, 0, 3.2)).toFixed(4)})`;
    // ---- orbiting brand pixels around him (behind when far side, in front when near side)
    const bx = behind.getContext('2d'), fx = front.getContext('2d'); bx.clearRect(0, 0, W, H); fx.clearRect(0, 0, W, H);
    const ov = sm(5.0, 5.4, t) * (1 - sm(8.5, 8.8, t));
    const fbox = F.anchor(0, 'face', s);
    if (ov > 0 && fbox) {
      const L = F.toStage([fbox[0], fbox[1]]), R = F.toStage([fbox[0] + fbox[2], fbox[1] + fbox[3]]), c = [(L[0] + R[0]) / 2, (L[1] + R[1]) / 2 - (R[1] - L[1]) * 0.05];
      const rx = (R[0] - L[0]) * 1.05 * (0.6 + 0.4 * ov), ry = rx * 0.24, tilt = -0.16;
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2 + t * 1.6, depth = Math.sin(a), x0 = Math.cos(a) * rx, y0 = depth * ry;
        const x = c[0] + x0 * Math.cos(tilt) - y0 * Math.sin(tilt), y = c[1] + x0 * Math.sin(tilt) + y0 * Math.cos(tilt);
        const size = (14 + 10 * (depth * 0.5 + 0.5)) * ov, g = depth > 0 ? fx : bx;
        g.globalAlpha = 0.55 + 0.45 * (depth * 0.5 + 0.5); g.fillStyle = i % 4 ? C.blue : C.cyan;
        g.fillRect(x - size / 2, y - size / 2, size, size);
      }
      bx.globalAlpha = fx.globalAlpha = 1;
    }
    // ---- freeze: blue burst behind him + tag with a leader line to his head
    const burst = sm(3.2, 3.6, t) * (1 - sm(4.9, 5.05, t));
    if (burst > 0) {
      const h = F.toStage(F.anchor(0, 'head', s) || face), r = 900 * oE(ramp(t, 3.2, 3.8));
      const grd = bx.createRadialGradient(h[0], h[1] + 200, 0, h[0], h[1] + 200, r); grd.addColorStop(0, 'rgba(24,182,255,0.95)'); grd.addColorStop(0.55, 'rgba(10,102,255,0.85)'); grd.addColorStop(1, 'rgba(10,102,255,0)');
      bx.globalAlpha = burst; bx.fillStyle = grd; bx.fillRect(0, 0, W, H); bx.globalAlpha = 1;
    }
    const tp = clamp(spr(t, 3.45, 0.5, 0.3), 0, 1.15) * (1 - sm(4.85, 5.0, t));
    const head = F.toStage(F.anchor(0, 'head', s) || face);
    const tx = 60, ty = 300;
    tag.style.left = px(tx); tag.style.top = px(ty); tag.style.opacity = clamp(tp * 1.5).toFixed(3);
    tag.style.transform = `scale(${(0.7 + 0.3 * tp).toFixed(3)})`; tag.style.transformOrigin = '0 0';
    const lineP = clamp(ramp(t, 3.5, 3.85)) * (1 - sm(4.85, 5.0, t));
    const fb = F.anchor(0, 'face', s), side = fb ? F.toStage([fb[0], fb[1] + fb[3] * 0.45]) : [head[0] - 150, head[1] + 150];
    const lx0 = tx + 160, ly0 = ty + 140, lx1 = lerp(lx0, side[0] - 12, oE(lineP)), ly1 = lerp(ly0, side[1], oE(lineP));
    tagLine.setAttribute('d', lineP > 0 ? `M ${lx0} ${ly0} Q ${lx0} ${(ly0 + ly1) / 2 + 40} ${lx1.toFixed(1)} ${ly1.toFixed(1)}` : '');
    // ---- label riding his head (shot C)
    const lv = sm(5.15, 5.45, t) * (1 - sm(8.35, 8.6, t)), lh = F.toStage(F.anchor(0, 'head', s) || face);
    label.style.opacity = lv.toFixed(3); label.style.left = px(lh[0]); label.style.top = px(lh[1] - 110);
    label.style.transform = `translateX(-50%) translateY(${((1 - oE(ramp(t, 5.15, 5.6))) * 30).toFixed(1)}px)`;
    // ---- end card titles
    const tv = (i) => oE(ramp(t, 9.3 + i * 0.12, 10.0 + i * 0.12));
    title.line.style.display = t >= 9.2 ? 'flex' : 'none';
    title.words.forEach((w, i) => { const p = tv(i); w.style.opacity = clamp(p * 1.4).toFixed(3); w.style.transform = `translateY(${((1 - p) * 40).toFixed(1)}px)`; });
    sub.style.opacity = sm(9.8, 10.3, t).toFixed(3);
    // ---- karaoke captions (inside the 9:16 safe band, above the bottom 35 %)
    pages.forEach((p, i) => {
      const L = caps[i], on = t >= p.start && t < p.end && t < 9.0;
      L.line.style.display = on ? 'flex' : 'none'; if (!on) return;
      const pin = oE(ramp(t, p.start, p.start + 0.3));
      L.line.style.transform = `translateY(${((1 - pin) * 30).toFixed(1)}px)`; L.line.style.opacity = clamp(pin * 1.4).toFixed(3);
      p.words.forEach((w, j) => {
        const st = wordState(w, t), n = L.words[j], pop = st === 'now' ? 1 + 0.08 * Math.sin(Math.PI * clamp((t - w.start) / Math.min(0.25, w.end - w.start))) : 1;
        n.style.background = st === 'now' ? C.blue : 'transparent'; n.style.opacity = st === 'next' ? '0.55' : '1'; n.style.transform = `scale(${pop.toFixed(3)})`;
      });
    });
    bg.style.opacity = '1';
  },
};
