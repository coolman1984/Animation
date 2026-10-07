// Film 13 — «اتكلم كورة» football-show motion showreel. 20 s, 1080×1920 Reels, 30 fps, 120 BPM. 3D (Three.js) + 2D (SVG/DOM).
// Follows the owner's reference order (lights → tactics → players and ball → giant screen with the host → title), never its artwork.
// One hero: THE CHALK LINE. It scribbles in the dark, sweeps the show name onto a 2D tactics board, rises into 3D as the pass
// arcs, becomes the ball's flight and the replay's measured trajectory, and finally underlines the title.
// Every pose is a closed-form function of t (no clocks, no randomness at render time). The host appears only as the owner's own
// footage (reference 7.4–10.1 s, cropped clear of the generator watermark) on the stadium screen.
import * as THREE from 'three';
import { clamp, lerp, ramp, ease, el, textLine, rng } from '../lib/motion.js';
import { springStep, springTrack, hash } from '../lib/kinetics.js';
import { EV, DUR } from './timing.js';

const W = 1080, H = 1920;
const C = { night: '#03060D', navy: '#07142B', chalk: '#F4F7FA', cyan: '#5CF2FF', gold: '#FFC94D', goldD: '#E39A12', grass: '#1F6B35', red: '#FF5A5F' };
const AR = "'Alexandria'";
const px = (v) => `${(+v).toFixed(2)}px`;
const spr = (t, a, d = 0.5, b = 0.2) => (t <= a ? 0 : springStep(t - a, { duration: d, bounce: b }).value);
const sm = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const toAr = (s) => String(s).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
const div = (parent, style = {}) => el('div', { style: { position: 'absolute', left: '0', top: '0', ...style } }, parent);
const setBlur = (n, b) => { n.style.filter = b > 0.25 ? `blur(${b.toFixed(2)}px)` : 'none'; };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------- the play (metres; pitch centre = origin, attack toward +x)
const ATT = [[12, -14], [24, 0], [34, 14], [40, -4], [14, 10], [30, -20]];
const DEF = [[36, -9], [38, 6], [44, -12], [45, 4], [47, 12], [51.2, 0]];
const PASS = [[EV.passes[0], EV.passes[1], ATT[0], ATT[1], 1.3], [EV.passes[1], EV.passes[2], ATT[1], ATT[2], 1.7], [EV.passes[2], EV.passes[3], ATT[2], ATT[3], 2.2]];
const SHOT_A = [44.6, -1.6], SHOT_B = [53.1, 2.0, 2.7], NET = [54.3, 2.9];
const FREEZE_U = 0.56;
function shotAt(u) { return V(lerp(SHOT_A[0], SHOT_B[0], u), lerp(0.45, SHOT_B[1], u) + 1.25 * Math.sin(Math.PI * u), lerp(SHOT_A[1], SHOT_B[2], u)); }
function ballAt(t) {
  if (t < EV.passes[0]) return V(ATT[0][0] + 0.9, 0.45, ATT[0][1]);
  for (const [a, b, A, B, h] of PASS) if (t < b) { const u = ease.outCubic(ramp(t, a, b)); return V(lerp(A[0] + 0.9, B[0] - 0.6, u), 0.45 + h * Math.sin(Math.PI * u), lerp(A[1], B[1], u)); }
  if (t < EV.shot) { const u = ramp(t, EV.dribble, EV.shot); return V(lerp(ATT[3][0] - 0.6, SHOT_A[0], u), 0.45 + 0.35 * Math.abs(Math.sin(u * Math.PI * 3)), lerp(ATT[3][1], SHOT_A[1], u)); }
  if (t < EV.goal) return shotAt(ease.outCubic(ramp(t, EV.shot, EV.goal)) * 0.97 + 0.03 * ramp(t, EV.shot, EV.goal));
  if (t < EV.replay) { const k = ease.outCubic(ramp(t, EV.goal, EV.goal + 0.6)); const p = shotAt(1); return V(lerp(p.x, NET[0], k), lerp(p.y, 0.5, ease.inCubic(ramp(t, EV.goal + 0.15, EV.goal + 0.75))), lerp(p.z, NET[1], k)); }
  if (t < EV.freeze) { const k = ease.inOutCubic(ramp(t, EV.replay, EV.freeze)); return shotAt(lerp(1, FREEZE_U, k)); } // rewind
  if (t < EV.unfreeze) return shotAt(FREEZE_U);
  return shotAt(lerp(FREEZE_U, 1, ease.inCubic(ramp(t, EV.unfreeze, EV.unfreeze + 0.35))));
}

// ---------------------------------------------------------------- textures
function tex(w, h, draw, { repeat = false, srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function pitchTex() { // 120 × 80 m, 17 px per metre: mowing stripes, white lines
  return tex(2040, 1360, (g, w, h) => {
    const m = w / 120, X = (x) => (x + 60) * m, Z = (z) => (z + 40) * m;
    g.fillStyle = '#0B2414'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) { g.fillStyle = i % 2 ? '#1E6A35' : '#23793D'; g.fillRect(X(-52.5 + i * 105 / 18), Z(-34), 105 / 18 * m + 1, 68 * m); }
    const r = rng(9); for (let i = 0; i < 26000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${(0.02 + r() * 0.03).toFixed(3)})`; g.fillRect(X(-52.5) + r() * 105 * m, Z(-34) + r() * 68 * m, 2, 2); }
    g.strokeStyle = 'rgba(245,250,245,0.92)'; g.lineWidth = 0.13 * m;
    const rect = (x0, z0, x1, z1) => g.strokeRect(X(x0), Z(z0), (x1 - x0) * m, (z1 - z0) * m);
    rect(-52.5, -34, 52.5, 34); g.beginPath(); g.moveTo(X(0), Z(-34)); g.lineTo(X(0), Z(34)); g.stroke();
    g.beginPath(); g.arc(X(0), Z(0), 9.15 * m, 0, Math.PI * 2); g.stroke();
    for (const s of [-1, 1]) { rect(s < 0 ? -52.5 : 52.5 - 16.5, -20.16, s < 0 ? -52.5 + 16.5 : 52.5, 20.16); rect(s < 0 ? -52.5 : 52.5 - 5.5, -9.16, s < 0 ? -52.5 + 5.5 : 52.5, 9.16);
      g.beginPath(); g.arc(X(s * 41.5), Z(0), 9.15 * m, s < 0 ? -0.93 : Math.PI - 0.93, s < 0 ? 0.93 : Math.PI + 0.93); g.stroke();
      g.fillStyle = 'rgba(245,250,245,0.92)'; g.beginPath(); g.arc(X(s * 41.5), Z(0), 0.3 * m, 0, Math.PI * 2); g.fill(); }
    g.beginPath(); g.arc(X(0), Z(0), 0.3 * m, 0, Math.PI * 2); g.fill();
  });
}
const crowdTex = () => tex(1024, 256, (g, w, h) => { g.fillStyle = '#070B14'; g.fillRect(0, 0, w, h); const r = rng(3);
  for (let i = 0; i < 9000; i++) { const hue = Math.floor(r() * 360), l = 10 + r() * 22; g.fillStyle = `hsl(${hue},${(8 + r() * 22).toFixed(0)}%,${l.toFixed(0)}%)`; g.fillRect(r() * w, r() * h, 2 + r() * 2, 3 + r() * 2); }
  g.fillStyle = 'rgba(0,0,0,0.35)'; for (let y = 0; y < h; y += 16) g.fillRect(0, y, w, 4); }, { repeat: true });
function ballTex() { // white ball with 12 dark patches at icosahedron vertices (equirectangular)
  const phi = (1 + Math.sqrt(5)) / 2, vs = [[-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0], [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi], [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]].map((v) => { const l = Math.hypot(...v); return v.map((c) => c / l); });
  return tex(512, 256, (g, w, h) => { const d = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const th = (x / w) * Math.PI * 2, ph = (y / h) * Math.PI, p = [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)];
      let best = -1; for (const v of vs) best = Math.max(best, p[0] * v[0] + p[1] * v[1] + p[2] * v[2]); const dark = best > 0.968, edge = best > 0.955 && !dark, i = (y * w + x) * 4;
      const c = dark ? 22 : edge ? 120 : 242; d.data[i] = d.data[i + 1] = d.data[i + 2] = c; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0); });
}
const radial = (stops) => tex(256, 256, (g) => { const r = g.createRadialGradient(128, 128, 0, 128, 128, 128); stops.forEach(([o, c]) => r.addColorStop(o, c)); g.fillStyle = r; g.fillRect(0, 0, 256, 256); }, { srgb: false });
const streakTex = () => tex(512, 64, (g) => { const r = g.createLinearGradient(0, 0, 512, 0); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.5, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 28, 512, 8); }, { srgb: false });

// ---------------------------------------------------------------- module state
let renderer, scene, camera, ball, net, netPos, crowdPts = [], banks = [], players = [], marks = [], arcs = [], trail = [], sparks, screen, screenMat, hostTex = [], fog;
const S = {};
let built = false, canvas, copyL, hudL, flashL, titleL;

const basic = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });
const glowMat = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
function chalkSeg(group, x0, z0, x1, z1, w = 0.28, color = C.chalk) { // flat chalk stroke on the grass
  const len = Math.hypot(x1 - x0, z1 - z0), g = new THREE.PlaneGeometry(len, w); g.translate(len / 2, 0, 0); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, glowMat(color, 0.95)); m.position.set(x0, 0.06, z0); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); group.add(m); return m;
}
function arcCurve(A, B, h, lift) { return new THREE.QuadraticBezierCurve3(V(A[0], 0.08 + 0.3 * lift, A[1]), V((A[0] + B[0]) / 2, 0.08 + 2 * h * lift, (A[1] + B[1]) / 2), V(B[0], 0.08 + 0.3 * lift, B[1])); }

export default {
  duration: DUR, fps: 30,
  async init(stage) {
    stage.style.background = C.night; stage.style.overflow = 'hidden';
    canvas = el('canvas', { width: String(W), height: String(H), style: { position: 'absolute', left: '0', top: '0', width: px(W), height: px(H), zIndex: '1' } }, stage);
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.setClearColor(C.night, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.outputColorSpace = THREE.SRGBColorSpace;
    scene = new THREE.Scene(); fog = new THREE.FogExp2('#060B16', 0.0065); scene.fog = fog;
    camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 600);
    S.hemi = new THREE.HemisphereLight('#9FB8FF', '#0B1A10', 0.35); scene.add(S.hemi);
    S.key = new THREE.DirectionalLight('#EAF2FF', 0); S.key.position.set(-30, 60, 40); scene.add(S.key);
    S.glow = radial([[0, 'rgba(255,255,255,1)'], [0.2, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']]); S.streak = streakTex();

    // pitch + surroundings
    S.pitch = new THREE.Mesh(new THREE.PlaneGeometry(120, 80), new THREE.MeshStandardMaterial({ map: pitchTex(), roughness: 0.95 })); S.pitch.rotation.x = -Math.PI / 2; scene.add(S.pitch);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), basic('#05080F')); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; scene.add(ground);
    // stands: two elliptical tiers + roof ring, crowd texture, flickering phone lights
    const ct = crowdTex(); ct.repeat.set(14, 1);
    for (const [rb, rt, y0, hgt, rep] of [[64, 82, 0, 14, 14], [86, 104, 17, 15, 16]]) {
      const g = new THREE.CylinderGeometry(rt, rb, hgt, 128, 1, true); g.translate(0, y0 + hgt / 2, 0);
      const t = ct.clone(); t.repeat.set(rep, 1); t.needsUpdate = true;
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: t, side: THREE.BackSide, roughness: 1, color: '#D6DCEA', emissive: '#1A2236', emissiveMap: t, emissiveIntensity: 0.45 })); m.scale.z = 0.72; scene.add(m); }
    { const g = new THREE.CylinderGeometry(112, 104, 4, 128, 1, true); g.translate(0, 34, 0); const m = new THREE.Mesh(g, basic('#0A0F1A', { side: THREE.DoubleSide })); m.scale.z = 0.72; scene.add(m); }
    for (let k = 0; k < 3; k++) { const n = 900, pos = new Float32Array(n * 3), r = rng(70 + k);
      for (let i = 0; i < n; i++) { const tier = r() < 0.55 ? 0 : 1, u = r(), a = r() * Math.PI * 2, rad = tier ? lerp(86, 104, u) : lerp(64, 82, u), y = tier ? 17 + 15 * u : 14 * u; pos.set([Math.cos(a) * rad, y + 0.5, Math.sin(a) * rad * 0.72], i * 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const p = new THREE.Points(g, new THREE.PointsMaterial({ color: k === 1 ? '#FFE3A8' : '#FFFFFF', size: 0.55, map: S.glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
      scene.add(p); crowdPts.push(p); }
    // advertising boards round the pitch (abstract light strips, no third-party names)
    for (const [x, z, len, ry] of [[0, -37, 108, 0], [0, 37, 108, 0], [-56, 0, 70, Math.PI / 2]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(len, 0.9, 0.2), new THREE.MeshBasicMaterial({ color: '#0E2A5C' })); b.position.set(x, 0.45, z); b.rotation.y = ry; scene.add(b);
      const s = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.18), glowMat(C.cyan, 0.55)); s.position.set(x + (ry ? 0.12 : 0), 0.62, z + (ry ? 0 : z < 0 ? 0.12 : -0.12)); s.rotation.y = ry ? Math.PI / 2 : z < 0 ? 0 : Math.PI; scene.add(s); S.boards = (S.boards || []).concat(s); }
    // floodlight banks on the roof: lamp grid + glow + streak + a light cone to the pitch
    [[0, 38, -47], [-26, 38, -47], [26, 38, -47], [0, 38, 47], [-26, 38, 47], [26, 38, 47]].forEach(([x, y, z], i) => {
      const g = new THREE.Group(); g.position.set(x, y, z); g.lookAt(x * 0.3, 0, 0); scene.add(g);
      g.add(new THREE.Mesh(new THREE.BoxGeometry(14, 4.5, 0.6), basic('#151B28', { fog: false })));
      const lamps = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) { const l = new THREE.Mesh(new THREE.CircleGeometry(0.62, 16), basic('#ffffff', { fog: false })); l.position.set(-5.6 + c * 1.6, -1.3 + r * 1.3, 0.35); g.add(l); lamps.push(l); }
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: S.glow, color: '#DDEBFF', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); glow.scale.set(20, 13, 1); glow.position.z = 1; g.add(glow);
      const st = new THREE.Sprite(new THREE.SpriteMaterial({ map: S.streak, color: '#BFD8FF', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); st.scale.set(48, 2.6, 1); st.position.z = 1.2; g.add(st);
      const coneG = new THREE.ConeGeometry(22, 70, 40, 1, true); coneG.translate(0, -35, 0); coneG.rotateX(-Math.PI / 2); // apex at the bank, opening toward the pitch
      const cone = new THREE.Mesh(coneG, new THREE.MeshBasicMaterial({ color: '#9CC2FF', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false })); cone.rotation.y = Math.PI; g.add(cone);
      banks.push({ g, lamps, glow, st, cone, on: [0, 0.25, 0.5, 0.75, 1.0, 1.25][i] });
    });
    // goal + net (the net bulges when the ball arrives)
    const post = new THREE.MeshStandardMaterial({ color: '#F4F6F8', roughness: 0.4 });
    for (const z of [-3.66, 3.66]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.44, 12), post); p.position.set(52.5, 1.22, z); scene.add(p); }
    { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 7.48, 12), post); b.rotation.x = Math.PI / 2; b.position.set(52.5, 2.44, 0); scene.add(b); }
    { const g = new THREE.PlaneGeometry(7.32, 2.44, 24, 10); g.rotateY(-Math.PI / 2); g.translate(54.5, 1.22, 0); netPos = g.attributes.position.array.slice();
      net = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: '#E8EEF5', wireframe: true, transparent: true, opacity: 0.5 })); scene.add(net);
      for (const z of [-3.66, 3.66]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(2, 2.44, 6, 10), net.material); s.position.set(53.5, 1.22, z); scene.add(s); }
      const top = new THREE.Mesh(new THREE.PlaneGeometry(2, 7.32, 6, 24), net.material); top.rotation.x = -Math.PI / 2; top.position.set(53.5, 2.44, 0); scene.add(top); }
    // the big screen behind the goal: shows the owner's footage of the host (pre-loaded frames, chosen by t)
    { const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 25.5, 43), basic('#0A0E16')); frame.position.set(76.6, 26, 0); scene.add(frame);
      const rim = new THREE.Mesh(new THREE.PlaneGeometry(42.4, 24.9), glowMat(C.gold, 0.0)); rim.position.set(75.9, 26, 0); rim.rotation.y = -Math.PI / 2; scene.add(rim); S.rim = rim;
      screenMat = new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false, toneMapped: false }); screen = new THREE.Mesh(new THREE.PlaneGeometry(40, 22.5), screenMat); screen.position.set(75.8, 26, 0); screen.rotation.y = -Math.PI / 2; scene.add(screen);
      const loader = new THREE.TextureLoader();
      for (let i = 1; i <= 64; i++) { const url = new URL(`./plates/host/h${String(i).padStart(3, '0')}.jpg`, import.meta.url).href; const p = loader.loadAsync(url).then((t) => { t.colorSpace = THREE.SRGBColorSpace; hostTex[i - 1] = t; }); (window.studioWait || ((x) => x))(p); await p; }
      S.idle = tex(512, 288, (g, w, h) => { const r = g.createLinearGradient(0, 0, 0, h); r.addColorStop(0, '#0A1E46'); r.addColorStop(1, '#03070F'); g.fillStyle = r; g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(92,242,255,0.35)'; g.lineWidth = 2; for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } });
      screenMat.map = S.idle; }

    // tactics board: chalk O (attackers) and X (defenders) on the grass, arrows = the pass lines
    const board = new THREE.Group(); scene.add(board); S.board = board;
    ATT.forEach(([x, z], i) => { const m = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.25, 40), glowMat(C.chalk, 0.95)); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.07, z); board.add(m); marks.push({ m, t: EV.board + i * 0.09, kind: 'o' }); });
    DEF.forEach(([x, z], i) => { const g = new THREE.Group(); g.position.set(x, 0.07, z); chalkSeg(g, -1.1, -1.1, 1.1, 1.1, 0.32, C.red); chalkSeg(g, -1.1, 1.1, 1.1, -1.1, 0.32, C.red); board.add(g); marks.push({ m: g, t: EV.board + 0.5 + i * 0.07, kind: 'x' }); });
    const arcDefs = [...PASS.map(([, , A, B, h]) => [A, B, h]), [[ATT[3][0], ATT[3][1]], [SHOT_B[0], SHOT_B[2]], 1.6]];
    arcDefs.forEach(([A, B, h], i) => { const mat = glowMat(i === 3 ? C.gold : C.cyan, 0.95); const head = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.9, 16), mat); head.rotation.z = -Math.PI / 2; scene.add(head);
      arcs.push({ A, B, h, mat, mesh: null, head, t0: EV.arrows + i * 0.16, lastKey: '' }); });
    // players: holographic silhouettes rising out of their chalk marks on the drop
    const body = new THREE.CapsuleGeometry(0.42, 1.0, 6, 16), headG = new THREE.SphereGeometry(0.3, 20, 14);
    [...ATT.map((p) => [p, C.cyan]), ...DEF.map((p) => [p, '#FF8A8E'])].forEach(([[x, z], col], i) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
      const b = new THREE.Mesh(body, mat); b.position.y = 0.95; g.add(b); const hd = new THREE.Mesh(headG, mat); hd.position.y = 1.95; g.add(hd);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: S.glow, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 })); halo.scale.set(4.5, 5.5, 1); halo.position.y = 1.2; g.add(halo);
      scene.add(g); players.push({ g, mat, halo, t: EV.lift + (i % 6) * 0.06 + (i >= 6 ? 0.18 : 0), x, z }); });
    // ball + trail + goal sparks
    ball = new THREE.Mesh(new THREE.SphereGeometry(0.5, 40, 28), new THREE.MeshStandardMaterial({ map: ballTex(), roughness: 0.35, emissive: '#ffffff', emissiveIntensity: 0.18 })); scene.add(ball);
    S.ballGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: S.glow, color: '#FFFFFF', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 })); S.ballGlow.scale.set(3.4, 3.4, 1); scene.add(S.ballGlow);
    for (let k = 0; k < 22; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: S.glow, color: k < 6 ? '#FFFFFF' : C.gold, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(s); trail.push(s); }
    { const n = 260, pos = new Float32Array(n * 3), r = rng(5); S.sparkV = []; for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, u = r() * 2 - 1, sp = 6 + r() * 14; S.sparkV.push([Math.sqrt(1 - u * u) * Math.cos(a) * sp - 4, Math.abs(u) * sp * 0.8 + 4, Math.sqrt(1 - u * u) * Math.sin(a) * sp]); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sparks = new THREE.Points(g, new THREE.PointsMaterial({ color: C.gold, size: 0.5, map: S.glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(sparks); }
    buildDom(stage);
  },

  render(t) {
    // ------------------------------------------------ lights
    const lightsOn = banks.reduce((s, b) => s + clamp((t - b.on) / 0.12), 0) / banks.length;
    banks.forEach((b, i) => { const on = clamp((t - b.on) / 0.1), flick = t < b.on + 0.35 ? (hash(i, Math.round(t * 30)) % 3 === 0 ? 0.55 : 1) : 1, k = on * flick;
      b.lamps.forEach((l) => l.material.color.setScalar(0.08 + 0.92 * k)); b.glow.material.opacity = 0.95 * k; b.st.material.opacity = 0.55 * k * (1 + 0.6 * Math.exp(-(t - b.on) / 0.25));
      b.cone.material.opacity = 0.06 * k * (1 - 0.6 * sm(EV.screen, EV.screen + 0.6, t)); });
    S.hemi.intensity = 0.06 + 0.5 * lightsOn; S.key.intensity = 1.6 * lightsOn;
    const goalFlash = Math.exp(-Math.max(0, t - EV.goal) / 0.35) * (t >= EV.goal ? 1 : 0);
    crowdPts.forEach((p, k) => { p.material.opacity = (0.18 + 0.25 * lightsOn) * (0.6 + 0.4 * Math.sin(t * 9 + k * 2.1)) + 0.8 * goalFlash * (k === 1 ? 1 : 0.6); p.material.size = 0.55 + 0.6 * goalFlash; });
    (S.boards || []).forEach((b, i) => { b.material.opacity = (0.25 + 0.35 * lightsOn) * (0.75 + 0.25 * Math.sin(t * 6 + i)) + 0.5 * goalFlash; });
    // ------------------------------------------------ tactics board: marks pop, arrows draw flat, then lift into 3D arcs on the drop
    const boardFade = 1 - sm(EV.lift + 0.3, EV.lift + 1.0, t) * 0.75;
    marks.forEach((q) => { const p = spr(t, q.t, 0.35, 0.35); q.m.visible = t >= q.t; q.m.scale.setScalar(Math.max(0.001, p)); const mat = q.kind === 'o' ? [q.m.material] : q.m.children.map((c) => c.material); mat.forEach((m) => { m.opacity = 0.95 * boardFade * (1 - sm(EV.screen - 0.2, EV.screen, t)); }); });
    const lift = ease.inOutCubic(ramp(t, EV.lift, EV.lift + 0.7));
    arcs.forEach((a, i) => {
      const p = ease.inOutSine(ramp(t, a.t0, a.t0 + 0.42)), vis = t >= a.t0 && t < EV.replay;
      const used = i < 3 ? clamp((t - EV.passes[i]) / 0.5) : 0; // a pass line fades after the ball has used it
      const key = `${(lift).toFixed(3)}|${p.toFixed(3)}`;
      if (vis && key !== a.lastKey) { if (a.mesh) { a.mesh.geometry.dispose(); scene.remove(a.mesh); } const curve = arcCurve(a.A, a.B, a.h, lift); const g = new THREE.TubeGeometry(curve, 64, 0.11 + 0.05 * lift, 8, false);
        g.setDrawRange(0, Math.max(0, Math.floor((g.index.count / 64) * Math.round(64 * p)))); a.mesh = new THREE.Mesh(g, a.mat); scene.add(a.mesh); a.lastKey = key; a.curve = curve; }
      if (a.mesh) a.mesh.visible = vis; a.head.visible = vis && p > 0.02;
      if (a.curve && vis) { const pt = a.curve.getPoint(Math.max(0.001, p)), tg = a.curve.getTangent(Math.max(0.001, p)); a.head.position.copy(pt); a.head.quaternion.setFromUnitVectors(V(0, 1, 0), tg); a.head.scale.setScalar(0.55 - 0.25 * lift); }
      a.mat.opacity = 0.95 * (1 - 0.8 * used) * (i === 3 ? 1 - sm(EV.goal, EV.goal + 0.4, t) : 1);
    });
    players.forEach((q, i) => { const p = spr(t, q.t, 0.55, 0.3), vis = t >= q.t && t < EV.screen + 0.6; q.g.visible = vis; if (!vis) return;
      q.g.scale.set(1, Math.max(0.001, p), 1); q.g.position.y = 0.05 * Math.sin(t * 5 + i); q.mat.opacity = 0.8 * clamp(p) * (1 - 0.75 * sm(EV.replay, EV.freeze, t) * (1 - sm(EV.unfreeze, EV.unfreeze + 0.3, t)));
      q.halo.material.opacity = 0.5 * clamp(p) + 0.4 * Math.exp(-Math.max(0, t - q.t) / 0.25); });
    // ------------------------------------------------ ball, trail, net, sparks
    const B = ballAt(t), ballVis = t >= EV.lift + 0.4 && t < EV.screen + 0.3; ball.visible = S.ballGlow.visible = ballVis; ball.position.copy(B); S.ballGlow.position.copy(B);
    const frozen = t >= EV.freeze && t < EV.unfreeze; ball.rotation.set(t * (frozen ? 1.2 : 9), t * (frozen ? 0.7 : 4), 0);
    trail.forEach((s, k) => { const tk = frozen ? EV.freeze - 0.02 * (k + 1) * 1.6 : t - 0.018 * (k + 1), q = ballAt(tk), mv = B.distanceTo(q); s.position.copy(q); const o = (1 - k / trail.length) * clamp(mv * 2) * (ballVis ? 1 : 0) * (t > EV.passes[0] - 0.05 ? 1 : 0); s.material.opacity = 0.75 * o; s.scale.setScalar(1.3 * (1 - k / trail.length) + 0.25); });
    { const a = net.geometry.attributes.position.array, bulge = t >= EV.goal ? Math.exp(-(t - EV.goal) / 0.5) * Math.sin(Math.min(Math.PI / 2, (t - EV.goal) * 12)) : 0;
      for (let i = 0; i < a.length; i += 3) { const y = netPos[i + 1], z = netPos[i + 2], d = Math.hypot(y - 2.0, z - 2.7); a[i] = netPos[i] + 1.6 * bulge * Math.exp(-(d * d) / 2.2); } net.geometry.attributes.position.needsUpdate = true; }
    { const a = sparks.geometry.attributes.position.array, k = t - EV.goal, on = k > 0 && k < 1.4; sparks.visible = on;
      if (on) { S.sparkV.forEach(([vx, vy, vz], i) => { a.set([NET[0] - 1.4 + vx * k * 0.6, 1.8 + vy * k * 0.6 - 4.9 * k * k, NET[1] + vz * k * 0.6], i * 3); }); sparks.geometry.attributes.position.needsUpdate = true; sparks.material.opacity = 1 - k / 1.4; } }
    // ------------------------------------------------ the big screen: idle grid → the host's footage → the title backdrop
    { const hi = Math.floor((t - EV.host) * 24 * 0.92); screenMat.map = t >= EV.host && t < EV.final ? hostTex[clamp(hi, 0, 63)] : S.idle; screenMat.color.setScalar(t >= EV.host ? 1 : 0.55); S.rim.material.opacity = 0.75 * sm(EV.screen, EV.host, t); }
    // ------------------------------------------------ camera: spring shots + ball follow + bullet-time orbit
    const key = [[0, [0, 26, -14], [0, 36, -47], 0], [0.9, [0, 2.6, 12], [0, 21, -47], 0], [EV.board - 0.25, [30, 74, 0.01], [30, 0, 0], 1], [EV.lift - 0.35, [4, 6.5, 22], [32, 0.5, -1], 0], [5.0, [12, 11, 31], [33, 0, -2], 0],
      [8.62, [40, 4.6, 15], [52.5, 1.6, 1.5], 0], [EV.screen, [23, 26, 0.01], [76, 26, 0], 0], [EV.final, [27, 26, 0.01], [76, 26, 0], 0]];
    const tr = (j, k) => springTrack(key.map((q) => [q[0], q[j][k]]), t, { duration: j === 1 && t > EV.screen - 0.2 && t < EV.screen + 1 ? 0.7 : 0.95, bounce: 0.06 });
    const pos = V(tr(1, 0), tr(1, 1), tr(1, 2)), tgt = V(tr(2, 0), tr(2, 1), tr(2, 2)), upTop = springTrack(key.map((q) => [q[0], q[3]]), t, { duration: 0.95, bounce: 0 });
    const wf = sm(5.7, 6.1, t) * (1 - sm(EV.goal - 0.15, EV.goal + 0.2, t));
    if (wf > 0) { const fpos = B.clone().add(V(-9, 4.2, 8.5)); pos.lerp(fpos, wf); tgt.lerp(B.clone().add(V(4, 0, 0)), wf); }
    const wo = sm(EV.replay - 0.1, EV.freeze + 0.1, t) * (1 - sm(EV.unfreeze - 0.05, EV.screen + 0.05, t));
    if (wo > 0) { const F = shotAt(FREEZE_U), az = lerp(2.4, 2.4 + 3.6, ease.inOutSine(ramp(t, EV.replay, EV.unfreeze))), r = 11.5 - 1.5 * Math.sin(ramp(t, EV.replay, EV.unfreeze) * Math.PI);
      pos.lerp(V(F.x + Math.cos(az) * r, F.y + 1.0 + 0.8 * Math.sin(az * 0.5), F.z + Math.sin(az) * r), wo); tgt.lerp(F, wo); }
    const shake = t >= EV.goal ? 0.35 * Math.exp(-(t - EV.goal) / 0.25) : 0; pos.x += shake * Math.sin(t * 91); pos.y += shake * Math.sin(t * 77 + 1);
    camera.position.copy(pos); const up = V(1, 0, 0).multiplyScalar(clamp(upTop)).add(V(0, 1, 0).multiplyScalar(1 - clamp(upTop))).normalize(); camera.up.copy(up); camera.lookAt(tgt);
    camera.fov = 40 + 14 * (1 - sm(0.6, 1.6, t)) + 8 * Math.exp(-Math.max(0, t - EV.goal) / 0.4) * (t >= EV.goal ? 1 : 0) - 4 * (wo > 0.5 ? 1 : 0) * 0; camera.updateProjectionMatrix();
    fog.density = 0.006 - 0.0028 * lightsOn;
    renderer.render(scene, camera);
    dom(t, B);
  },
};

// ================================================================ 2D layer: copy, chalk, HUD, title
function words(parent, text, { size, weight = 900, color = '#fff', cx = 540, top, width = 960, lh = 1.12, z = 5, shadow = '' } = {}) {
  return textLine(parent, text, { left: px(cx - width / 2), top: px(top), width: px(width), justifyContent: 'center', fontFamily: AR, fontSize: px(size), fontWeight: String(weight), color, lineHeight: String(lh), zIndex: String(z), textShadow: shadow });
}
function pop(L, t, tIn, tOut, { stagger = 0.1, s0 = 0.62, dur = 0.42, blur = 16 } = {}) {
  const vis = t >= tIn - 0.01 && t <= tOut + 0.4; L.line.style.display = vis ? 'flex' : 'none'; if (!vis) return;
  L.words.forEach((w, i) => { const a = tIn + i * stagger, e = spr(t, a, dur, 0.18), out = ease.inOutCubic(ramp(t, tOut + i * 0.04, tOut + i * 0.04 + 0.28));
    w.style.opacity = (clamp((t - a) / 0.08) * (1 - out)).toFixed(3); w.style.transform = `translateY(${(-out * 30).toFixed(1)}px) scale(${(lerp(s0, 1, e) * (1 + 0.04 * out)).toFixed(4)})`; setBlur(w, (1 - clamp(e)) * blur + out * 10); });
}
const proj = new THREE.Vector3();
const toScreen = (v) => { proj.copy(v).project(camera); return [(proj.x + 1) / 2 * W, (1 - proj.y) / 2 * H, proj.z]; };
function buildDom(stage) {
  hudL = el('svg', { width: String(W), height: String(H), viewBox: `0 0 ${W} ${H}`, style: { position: 'absolute', left: '0', top: '0', zIndex: '3', overflow: 'visible' } }, stage);
  S.vig = div(stage, { width: px(W), height: px(H), zIndex: '2', background: 'radial-gradient(120% 75% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.6) 100%)' });
  copyL = div(stage, { width: px(W), height: px(H), zIndex: '5' });
  titleL = div(stage, { width: px(W), height: px(H), zIndex: '6' });
  flashL = div(stage, { width: px(W), height: px(H), zIndex: '7', background: '#fff', opacity: '0' });
  // hook: chalk scribble in the dark, then the show name
  hudL.innerHTML = `
    <defs><filter id="g13" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <path id="scrib" d="M 140 1500 C 260 1220, 520 1380, 470 1180 S 700 960, 860 1080 S 980 1300, 760 1330" fill="none" stroke="${C.chalk}" stroke-width="9" stroke-linecap="round" pathLength="1" filter="url(#g13)"/>
    <path id="sweep" d="M -60 760 C 260 560, 640 860, 1140 420" fill="none" stroke="${C.cyan}" stroke-width="16" stroke-linecap="round" pathLength="1" filter="url(#g13)"/>
    <g id="hud" filter="url(#g13)">
      <circle id="r1" r="120" fill="none" stroke="${C.cyan}" stroke-width="5" pathLength="1" stroke-dasharray="0.06 0.025"/>
      <circle id="r2" r="168" fill="none" stroke="${C.gold}" stroke-width="3" pathLength="1"/>
      <g id="ticks"></g>
      <polyline id="traj" fill="none" stroke="${C.gold}" stroke-width="6" stroke-dasharray="4 16" stroke-linecap="round"/>
      <path id="brk" fill="none" stroke="${C.chalk}" stroke-width="5"/>
    </g>
    <g id="burst"></g>`;
  S.scrib = hudL.querySelector('#scrib'); S.sweep = hudL.querySelector('#sweep'); S.hud = hudL.querySelector('#hud'); S.r1 = hudL.querySelector('#r1'); S.r2 = hudL.querySelector('#r2'); S.traj = hudL.querySelector('#traj'); S.brk = hudL.querySelector('#brk'); S.burst = hudL.querySelector('#burst');
  const tk = hudL.querySelector('#ticks'); tk.innerHTML = Array.from({ length: 36 }, (_, i) => `<line x1="0" y1="-196" x2="0" y2="${i % 3 ? -182 : -170}" stroke="${C.cyan}" stroke-width="3" transform="rotate(${i * 10})"/>`).join(''); S.ticks = tk;
  S.burst.innerHTML = Array.from({ length: 24 }, (_, i) => `<line x1="0" y1="0" x2="0" y2="-1" stroke="${i % 2 ? C.gold : C.chalk}" stroke-width="${i % 2 ? 6 : 10}" stroke-linecap="round" transform="rotate(${i * 15})"/>`).join(''); S.rays = [...S.burst.querySelectorAll('line')];
  S.hookA = words(copyL, 'اتكلم كورة', { size: 150, top: 760, shadow: '0 0 40px rgba(92,242,255,0.55)' });
  // title: layered extrusion (2D faux depth) + light sweep, over the stadium screen
  S.tWrap = div(titleL, { width: px(W), height: px(H) });
  S.tLayers = [];
  for (let i = 14; i >= 1; i--) { const d = div(S.tWrap, { left: '0', top: px(640), width: px(W), textAlign: 'center', fontFamily: AR, fontSize: '230px', fontWeight: '900', lineHeight: '1.05', direction: 'rtl', color: i < 4 ? C.goldD : `rgb(${Math.round(lerp(150, 40, i / 14))},${Math.round(lerp(95, 25, i / 14))},${Math.round(lerp(10, 5, i / 14))})`, transform: `translate(${(i * 1.6).toFixed(1)}px, ${(i * 2.4).toFixed(1)}px)` }); d.innerHTML = 'اتكلم<br>كورة'; S.tLayers.push(d); }
  S.tA = words(S.tWrap, 'اتكلم', { size: 230, top: 640, lh: 1.05, shadow: '0 0 30px rgba(255,255,255,0.35)' });
  S.tB = words(S.tWrap, 'كورة', { size: 230, top: 640 + 241, lh: 1.05, color: C.gold });
  S.under = el('svg', { width: '1080', height: '200', viewBox: '0 0 1080 200', style: { position: 'absolute', left: '0', top: '1150px' } }, S.tWrap);
  S.under.innerHTML = `<path d="M 170 60 C 380 150, 700 150, 900 40" fill="none" stroke="${C.cyan}" stroke-width="14" stroke-linecap="round" pathLength="1" filter="url(#g13)"/><circle cx="930" cy="34" r="0" fill="#fff"/>`;
  S.underP = S.under.querySelector('path'); S.underB = S.under.querySelector('circle');
  built = true;
}
function dom(t, B) {
  // chalk scribble (0.1–1.3) and the hero line sweep that wipes the name into the board (1.9–2.4)
  const sp = ease.inOutSine(ramp(t, 0.1, 1.2)), so = 1 - sm(1.6, 2.0, t); S.scrib.setAttribute('stroke-dasharray', `${sp.toFixed(4)} 1`); S.scrib.style.opacity = so.toFixed(3); S.scrib.style.display = so > 0.01 ? 'inline' : 'none';
  const wp = ease.inOutCubic(ramp(t, EV.line, EV.lineEnd)), wo = 1 - sm(EV.lineEnd, EV.lineEnd + 0.25, t); S.sweep.setAttribute('stroke-dasharray', `${wp.toFixed(4)} 1`); S.sweep.style.display = t > EV.line && wo > 0.01 ? 'inline' : 'none'; S.sweep.style.opacity = wo.toFixed(3);
  pop(S.hookA, t, EV.title, EV.line + 0.05, { stagger: 0.25 });
  // chapter labels
    // owner 2026-10-07: the only words in the film are «اتكلم كورة» — no chapter labels, no clock
  // goal flash + rays from the net
  { const f = t >= EV.goal ? Math.exp(-(t - EV.goal) / 0.09) : 0; flashL.style.opacity = (0.85 * f).toFixed(3); flashL.style.display = f > 0.01 ? 'block' : 'none';
    const k = t - EV.goal, on = k > 0 && k < 0.9; S.burst.style.display = on ? 'inline' : 'none';
    if (on) { const [x, y] = toScreen(V(NET[0] - 1.5, 1.8, NET[1])); S.burst.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`); const r0 = 60 + 900 * ease.outCubic(clamp(k / 0.6)), r1 = 60 + 700 * ease.outCubic(clamp((k - 0.08) / 0.6));
      S.rays.forEach((l, i) => { l.setAttribute('y1', (-r1 * (i % 2 ? 0.8 : 1)).toFixed(1)); l.setAttribute('y2', (-r0 * (i % 2 ? 0.8 : 1)).toFixed(1)); }); S.burst.style.opacity = (1 - clamp(k / 0.9)).toFixed(3); } }
  // HUD around the frozen ball: rings, ticks, brackets and the dotted remaining trajectory (3D projected into 2D)
  { const on = sm(EV.freeze - 0.05, EV.freeze + 0.25, t) * (1 - sm(EV.unfreeze - 0.15, EV.unfreeze + 0.05, t)); S.hud.style.display = on > 0.01 ? 'inline' : 'none';
    if (on > 0.01) { const [x, y] = toScreen(B), d1 = ease.outCubic(ramp(t, EV.freeze, EV.freeze + 0.5)), d2 = ease.outCubic(ramp(t, EV.freeze + 0.2, EV.freeze + 0.8));
      S.r1.setAttribute('cx', x.toFixed(1)); S.r1.setAttribute('cy', y.toFixed(1)); S.r2.setAttribute('cx', x.toFixed(1)); S.r2.setAttribute('cy', y.toFixed(1));
      S.r1.setAttribute('transform', `rotate(${(t * 40).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})`); S.r2.setAttribute('stroke-dasharray', `${d2.toFixed(4)} 1`); S.r2.setAttribute('transform', `rotate(${(-90 - t * 25).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})`);
      const [ex] = toScreen(B.clone().add(camera.up.clone().cross(camera.getWorldDirection(V(0, 0, 0))).normalize().multiplyScalar(0.5))), br = Math.max(30, Math.abs(ex - x)); S.r1.setAttribute('r', ((br + 26) * (0.5 + 0.5 * d1)).toFixed(1)); S.r2.setAttribute('r', (br + 60).toFixed(1)); S.ticks.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${(t * -12).toFixed(1)}) scale(${(0.6 + 0.4 * d2).toFixed(3)})`);
      const pts = []; for (let i = 0; i <= 24; i++) { const [px2, py2] = toScreen(shotAt(lerp(FREEZE_U, 1, i / 24))); pts.push(`${px2.toFixed(1)},${py2.toFixed(1)}`); } S.traj.setAttribute('points', pts.slice(0, 1 + Math.round(24 * ease.inOutSine(ramp(t, EV.freeze + 0.3, EV.freeze + 1.1)))).join(' '));
      S.traj.setAttribute('stroke-dashoffset', (-t * 40).toFixed(1));
      const [gx, gy] = toScreen(V(52.5, 2.44, 3.66)), [hx, hy] = toScreen(V(52.5, 0, -3.66)), e = 24 * d2; S.brk.setAttribute('d', `M ${gx - e} ${gy} L ${gx} ${gy} L ${gx} ${gy + e} M ${hx + e} ${hy} L ${hx} ${hy} L ${hx} ${hy - e}`);
      S.hud.style.opacity = on.toFixed(3); } }
  // title over the big screen: rises from blur, extrusion grows, light sweep, the line underlines it and the ball lands as the full stop
  { const on = t >= EV.final; S.tWrap.style.display = on ? 'block' : 'none';
    if (on) { const p = spr(t, EV.final, 0.6, 0.2), q = spr(t, EV.final + 0.18, 0.6, 0.2), dep = ease.outCubic(ramp(t, EV.final + 0.15, EV.final + 0.6));
      [S.tA, S.tB].forEach((L, j) => { const e = j ? q : p; L.words.forEach((w) => { w.style.opacity = clamp(e * 2).toFixed(3); w.style.transform = `scale(${lerp(0.6, 1, e).toFixed(4)})`; setBlur(w, (1 - clamp(e)) * 18); });
        L.words[0].style.backgroundImage = `linear-gradient(100deg, ${j ? C.gold : '#FFFFFF'} 0%, ${j ? C.gold : '#FFFFFF'} ${(-30 + 160 * ramp(t, 18.6, 19.4)).toFixed(1)}%, #FFF7D6 ${(-20 + 160 * ramp(t, 18.6, 19.4)).toFixed(1)}%, ${j ? C.gold : '#FFFFFF'} ${(-10 + 160 * ramp(t, 18.6, 19.4)).toFixed(1)}%)`; L.words[0].style.webkitBackgroundClip = 'text'; L.words[0].style.backgroundClip = 'text'; L.words[0].style.color = 'transparent'; });
      S.tLayers.forEach((d, i) => { const k = 14 - i; d.style.opacity = (clamp(p * 2) * (k <= Math.ceil(14 * dep) ? 1 : 0)).toFixed(3); d.style.transform = `translate(${(k * 1.6 * dep).toFixed(1)}px, ${(k * 2.4 * dep).toFixed(1)}px) scale(${lerp(0.6, 1, Math.min(p, q)).toFixed(4)})`; d.style.transformOrigin = '50% 50%'; });
      const u = ease.inOutSine(ramp(t, EV.final + 0.55, EV.final + 1.05)); S.underP.setAttribute('stroke-dasharray', `${u.toFixed(4)} 1`); S.underB.setAttribute('r', (18 * spr(t, EV.final + 1.0, 0.4, 0.4)).toFixed(2));
      S.tWrap.style.transform = `translateY(${(-8 * ease.inOutSine(ramp(t, EV.hold, 20))).toFixed(2)}px)`; } }
}
