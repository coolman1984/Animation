// Film 12 — «مخطط المساحات» motion showreel for a 3D space-planning app. 20 s, 1080×1920 (Reels), 30 fps, 120 BPM.
// One hero: the CUT PLANE — the app's own "walls cut at 1.10 m". A cyan sheet of light lifts the drawn plan into 3D walls,
// slices them to the app's cut height, sweeps alternative finishes across the flat, flattens the flat, builds four work
// zones, and the story lands in the real app window and the Pixel Plus end card.
// Real Three.js (software WebGL, deterministic): every pose is a closed-form function of t; DOM carries all readable Arabic.
// Plan geometry and room areas are measured from the owner's own app screenshot (Client flat · 10.40 × 8.80 m, 81.19 m²).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { clamp, lerp, ramp, ease, el, textLine, rng } from '../lib/motion.js';
import { springStep, springTrack, hash } from '../lib/kinetics.js';
import { HOME, WORK, SWEEP, EV, DUR } from './timing.js';

const W = 1080, H = 1920;
const C = { ink: '#020816', navy: '#04102A', deep: '#0A1E48', cyan: '#2DE6FF', cyanD: '#10B9E2', ice: '#CFF8FF', white: '#FFFFFF', blue: '#0A66FF', cap: '#161B26', paper: '#F4F8FB' };
const AR = "'Alexandria'";
const px = (v) => `${(+v).toFixed(2)}px`;
const spr = (t, a, d = 0.5, b = 0.2) => (t <= a ? 0 : springStep(t - a, { duration: d, bounce: b }).value);
const sm = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const toAr = (s) => String(s).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]).replace(/\./g, '٫');
const P = (x, y) => [x - 5.2, 4.4 - y]; // plan metres (x east, y north) → world X, Z
const div = (parent, style = {}) => el('div', { style: { position: 'absolute', left: '0', top: '0', ...style } }, parent);
const setBlur = (n, b) => { n.style.filter = b > 0.25 ? `blur(${b.toFixed(2)}px)` : 'none'; };

// ---------------------------------------------------------------- palettes (three finishes = the app's "three options")
const PAL = [
  { wood: '#B47B47', light: '#EEE8DF', dark: '#2A2E36', sofa: '#E8E2D8', rug: '#C8643A', linen: '#F5F1EA', throw: '#C9A27A', green: '#3F7D3A', marble: '#EFEEEC', wall: '#F2EFEA' },
  { wood: '#6E4529', light: '#E5DFD2', dark: '#2B2A28', sofa: '#8FA88A', rug: '#A9B89F', linen: '#EEE9DD', throw: '#6F8F6A', green: '#4E7F45', marble: '#E9E5DC', wall: '#EAE3D4' },
  { wood: '#3A3C41', light: '#FAFAFA', dark: '#1E2024', sofa: '#3C3F45', rug: '#D9D9DB', linen: '#FFFFFF', throw: '#2C2E33', green: '#3F6E3A', marble: '#F4F4F4', wall: '#F7F7F7' },
];
const FLOOR = [['#C58C57', '#8F5E35'], ['#7A5334', '#4C311D'], ['#9A9792', '#6D6A66']];

// ---------------------------------------------------------------- canvas textures
function tex(w, h, draw, { repeat = false, srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
// Herringbone parquet: staircases of a horizontal and a vertical plank (period 256 px both ways), rotated 45° in UV.
function parquet([base, gap], seed) {
  return tex(512, 512, (g) => {
    g.fillStyle = gap; g.fillRect(0, 0, 512, 512);
    const Wp = 32, L = 128, b = new THREE.Color(base);
    const plank = (x, y, w, h, vert) => {
      const k = hash(((x % 256) + 256) % 256, ((y % 256) + 256) % 256, vert ? 7 : 3, seed) / 4294967296;
      const c = b.clone().offsetHSL(0, (k - 0.5) * 0.06, (k - 0.5) * 0.12);
      g.fillStyle = `#${c.getHexString()}`; g.fillRect(x + 1, y + 1, w - 2, h - 2);
      g.strokeStyle = 'rgba(40,20,5,0.10)'; g.lineWidth = 1;
      for (let i = 1; i < 4; i++) { g.beginPath(); if (vert) { g.moveTo(x + (w * i) / 4 + (k - 0.5) * 4, y + 2); g.lineTo(x + (w * i) / 4, y + h - 2); } else { g.moveTo(x + 2, y + (h * i) / 4 + (k - 0.5) * 4); g.lineTo(x + w - 2, y + (h * i) / 4); } g.stroke(); }
    };
    for (let s = -8; s <= 8; s++) for (let n = -26; n <= 26; n++) { const ox = s * L + n * Wp, oy = -s * L + n * Wp; if (ox > 560 || oy > 560 || ox < -300 || oy < -300) continue; plank(ox, oy, L, Wp, false); plank(ox, oy + Wp, Wp, L, true); }
  }, { repeat: true });
}
const tiles = () => tex(256, 256, (g) => { g.fillStyle = '#D9DCDF'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#B9BEC4'; g.lineWidth = 3; for (let i = 0; i <= 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); } }, { repeat: true });
const radial = (stops) => tex(256, 256, (g) => { const r = g.createRadialGradient(128, 128, 0, 128, 128, 128); stops.forEach(([o, c]) => r.addColorStop(o, c)); g.fillStyle = r; g.fillRect(0, 0, 256, 256); }, { srgb: false });
function gridTex() { // blueprint grid, 48 m on 2048 px: 1 m minor, 5 m major, faded to the edges
  return tex(2048, 2048, (g, w) => {
    const m = w / 48;
    for (let i = 0; i <= 48; i++) { const major = i % 4 === 0; g.strokeStyle = major ? 'rgba(45,230,255,0.42)' : 'rgba(45,230,255,0.16)'; g.lineWidth = major ? 2.4 : 1.2;
      g.beginPath(); g.moveTo(i * m, 0); g.lineTo(i * m, w); g.stroke(); g.beginPath(); g.moveTo(0, i * m); g.lineTo(w, i * m); g.stroke(); }
    g.globalCompositeOperation = 'destination-in';
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(0,0,0,1)'); r.addColorStop(0.55, 'rgba(0,0,0,0.75)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, w);
  }, { srgb: false });
}
const screenTex = () => tex(256, 160, (g) => { const r = g.createLinearGradient(0, 0, 0, 160); r.addColorStop(0, '#0B1E4A'); r.addColorStop(0.55, '#3B4C8C'); r.addColorStop(0.8, '#F08A4B'); r.addColorStop(1, '#FFC27A'); g.fillStyle = r; g.fillRect(0, 0, 256, 160);
  g.fillStyle = '#0B1328'; g.beginPath(); g.moveTo(0, 160); g.lineTo(70, 92); g.lineTo(120, 130); g.lineTo(180, 70); g.lineTo(256, 140); g.lineTo(256, 160); g.fill(); });
const uiTex = () => tex(256, 160, (g) => { g.fillStyle = '#0D2340'; g.fillRect(0, 0, 256, 160); g.fillStyle = '#2DE6FF'; for (let i = 0; i < 6; i++) g.fillRect(18, 18 + i * 22, 60 + ((i * 53) % 140), 8); g.fillStyle = '#0A66FF'; g.fillRect(170, 20, 66, 120); });
const corrugated = () => tex(128, 128, (g) => { for (let x = 0; x < 128; x++) { const v = 200 + 55 * Math.sin((x / 128) * Math.PI * 2 * 8); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, 0, 1, 128); } g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, 128, 6); g.fillRect(0, 122, 128, 6); });

// ---------------------------------------------------------------- the flat (measured from the owner's plan screenshot)
// Walls: [x0,y0,x1,y1, thickness, openings [[a,b,'door'|'window']] measured along the wall]
const WALLS = [
  [0, 0, 10.4, 0, 0.22, [[1.1, 1.9, 'door'], [3.6, 5.6, 'window']]],
  [10.4, 0, 10.4, 8.8, 0.22, [[1.8, 3.0, 'window']]],
  [10.4, 8.8, 0, 8.8, 0.22, [[0.7, 1.9, 'window'], [7.6, 8.8, 'window']]],
  [0, 8.8, 0, 0, 0.22, []],
  [0, 4.68, 10.4, 4.68, 0.14, [[4.45, 5.55, 'door'], [9.4, 10.2, 'door']]],
  [4.3, 4.68, 4.3, 8.8, 0.14, [[0.45, 1.25, 'door']]],
  [5.7, 4.68, 5.7, 8.8, 0.14, [[0.5, 1.2, 'door'], [2.3, 3.0, 'door']]],
  [7.89, 4.68, 7.89, 8.8, 0.14, []],
  [5.7, 6.47, 7.89, 6.47, 0.14, []],
  [7.29, 0, 7.29, 4.68, 0.14, [[1.3, 2.2, 'door']]],
];
const ROOMS = [ // name, area (owner's app), rect
  { id: 'reception', name: 'الاستقبال', area: '31.37', r: [0, 0, 7.29, 4.68], cat: 'living' },
  { id: 'kitchen', name: 'المطبخ', area: '12.68', r: [7.29, 0, 10.4, 4.68], cat: 'kitchen' },
  { id: 'master', name: 'نوم رئيسية', area: '15.59', r: [0, 4.68, 4.3, 8.8], cat: 'bedroom' },
  { id: 'bed2', name: 'غرفة نوم', area: '8.66', r: [7.89, 4.68, 10.4, 8.8], cat: 'bedroom' },
  { id: 'bath', name: 'حمام', area: '4.31', r: [5.7, 6.47, 7.89, 8.8], cat: 'bath', noLabel: true },
  { id: 'wc', name: 'تواليت', area: '3.57', r: [5.7, 4.68, 7.89, 6.47], cat: 'bath', noLabel: true },
  { id: 'corridor', name: 'ممر', area: '5.01', r: [4.3, 4.68, 5.7, 8.8], cat: 'none', noLabel: true },
];
// Furniture: [category, type, x, y, rotDeg, params]; back of each piece faces north (-Z) at rot 0.
const FURN = [
  ['bedroom', 'bed', 2.25, 7.62, 0, { w: 1.8, l: 2.1 }], ['bedroom', 'wardrobe', 0.42, 5.75, 90, { w: 1.8 }], ['bedroom', 'night', 1.0, 8.42, 0, {}], ['bedroom', 'night', 3.5, 8.42, 0, {}],
  ['bedroom', 'bed', 9.85, 7.72, 0, { w: 0.95, l: 2.0 }], ['bedroom', 'desk', 8.75, 5.12, 180, {}], ['bedroom', 'chair', 8.75, 5.75, 0, {}], ['bedroom', 'plant', 3.9, 5.15, 0, { s: 0.8 }],
  ['living', 'rug', 1.85, 2.4, 0, { w: 2.0, d: 2.7 }], ['living', 'tv', 0.36, 2.4, 90, {}], ['living', 'sofa', 3.15, 2.4, -90, { w: 2.3 }], ['living', 'table', 1.85, 2.4, 0, {}],
  ['living', 'armchair', 1.85, 0.75, 180, {}], ['living', 'lamp', 3.55, 4.1, 0, {}], ['living', 'plant', 0.45, 4.2, 0, { s: 1.1 }], ['living', 'dining', 5.45, 2.35, 0, {}], ['living', 'plant', 6.85, 0.45, 0, { s: 0.9 }],
  ['kitchen', 'counter', 8.85, 0.37, 180, { l: 2.7 }], ['kitchen', 'fridge', 10.0, 3.95, -90, {}], ['kitchen', 'island', 8.85, 2.45, 0, {}],
  ['bath', 'tub', 6.8, 8.32, 0, {}], ['bath', 'basin', 7.55, 7.45, -90, {}], ['bath', 'toilet', 7.55, 6.85, -90, {}], ['bath', 'toilet', 7.55, 5.15, -90, {}], ['bath', 'basin', 6.45, 6.15, 0, {}],
];
const CATS = ['bedroom', 'living', 'kitchen', 'bath'];

// ---------------------------------------------------------------- module state
let renderer, scene, camera, bp, apt, comm, grid, sheetH, sheetV, pen, penGlow;
const wallPieces = [], items = [], roomGlow = {}, floors = [], bpParts = [], doorArcs = [], tileArr = [], zoneParts = { offices: [], storage: [], line: [], containers: [] };
let tilesIM, beltBoxes = [], dummy;
const clipA = new THREE.Plane(new THREE.Vector3(1, 0, 0), 7), clipB1 = new THREE.Plane(new THREE.Vector3(-1, 0, 0), -7), clipB2 = new THREE.Plane(new THREE.Vector3(1, 0, 0), 7), clipC = new THREE.Plane(new THREE.Vector3(-1, 0, 0), -7);
const CLIPS = [[clipA], [clipB1, clipB2], [clipC]];
// DOM
let bg, canvas, labelsL, copyL, appL, endL, S = {};

// ---------------------------------------------------------------- 3D helpers
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.02, ...extra });
const box = (w, h, d, r = 0) => (r > 0 ? new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)) : new THREE.BoxGeometry(w, h, d));
function part(group, geo, role, x, y, z, { ry = 0, rx = 0, emissive, map, color } = {}) {
  const m = new THREE.Mesh(geo, std(color || '#ffffff', emissive ? { emissive, emissiveIntensity: 1.2, ...(map ? { emissiveMap: map, map } : {}) } : map ? { map } : {}));
  m.position.set(x, y, z); m.rotation.y = ry; m.rotation.x = rx; m.userData.role = role; group.add(m); return m;
}
// Furniture builders — local units metres, origin at the floor centre, back toward -Z.
const BUILD = {
  bed(g, { w, l }) {
    part(g, box(w, 0.32, l, 0.04), 'wood', 0, 0.16, 0); part(g, box(w - 0.08, 0.2, l - 0.16, 0.06), 'linen', 0, 0.42, 0.04);
    part(g, box(w - 0.04, 0.07, l * 0.55, 0.03), 'throw', 0, 0.54, l * 0.2); part(g, box(w + 0.1, 0.95, 0.1, 0.03), 'wood', 0, 0.48, -l / 2 + 0.02);
    const n = w > 1.2 ? 2 : 1; for (let i = 0; i < n; i++) part(g, box(w / n - 0.14, 0.13, 0.36, 0.06), 'light', n === 2 ? (i - 0.5) * (w / 2) : 0, 0.58, -l / 2 + 0.3);
    return [w + 0.1, l];
  },
  wardrobe(g, { w }) { part(g, box(w, 2.05, 0.6, 0.02), 'light', 0, 1.025, 0); part(g, box(0.02, 1.9, 0.01), 'dark', 0, 1.0, 0.305); [-0.12, 0.12].forEach((x) => part(g, box(0.03, 0.35, 0.03), 'dark', x, 1.05, 0.32)); return [w, 0.6]; },
  night(g) { part(g, box(0.48, 0.5, 0.42, 0.03), 'wood', 0, 0.25, 0); part(g, new THREE.CylinderGeometry(0.06, 0.08, 0.2, 16), 'dark', 0, 0.6, 0); part(g, new THREE.CylinderGeometry(0.13, 0.16, 0.18, 24), 'lamp', 0, 0.78, 0, { emissive: '#FFC983' }); return [0.48, 0.42]; },
  desk(g) { part(g, box(1.2, 0.04, 0.6), 'light', 0, 0.74, 0); [-0.56, 0.56].forEach((x) => part(g, box(0.04, 0.72, 0.56), 'dark', x, 0.36, 0)); part(g, box(0.55, 0.34, 0.03), 'dark', 0, 1.0, -0.18); part(g, new THREE.PlaneGeometry(0.5, 0.29), 'screen', 0, 1.0, -0.163, { emissive: '#ffffff', map: S.ui, color: '#000000' }); return [1.2, 0.6]; },
  chair(g) { part(g, box(0.46, 0.06, 0.46, 0.02), 'dark', 0, 0.46, 0); part(g, box(0.46, 0.5, 0.06, 0.02), 'dark', 0, 0.74, 0.2); part(g, new THREE.CylinderGeometry(0.03, 0.03, 0.44, 8), 'dark', 0, 0.22, 0); return [0.5, 0.5]; },
  plant(g, { s = 1 }) { part(g, new THREE.CylinderGeometry(0.17 * s, 0.13 * s, 0.34 * s, 20), 'dark', 0, 0.17 * s, 0); const f = new THREE.IcosahedronGeometry(0.32 * s, 1);
    part(g, f, 'green', 0, 0.62 * s, 0); part(g, new THREE.IcosahedronGeometry(0.22 * s, 1), 'green', 0.1 * s, 0.9 * s, 0.05 * s); return [0.5 * s, 0.5 * s]; },
  rug(g, { w, d }) { part(g, box(w, 0.016, d), 'rug', 0, 0.008, 0); return [w, d]; },
  tv(g) { part(g, box(1.8, 0.42, 0.42, 0.03), 'wood', 0, 0.21, 0); part(g, box(1.3, 0.76, 0.05, 0.01), 'dark', 0, 0.98, -0.08); part(g, new THREE.PlaneGeometry(1.24, 0.7), 'screen', 0, 0.98, -0.052, { emissive: '#ffffff', map: S.tv, color: '#000000' }); part(g, box(0.3, 0.16, 0.2), 'dark', 0, 0.5, -0.08); return [1.8, 0.42]; },
  sofa(g, { w }) { part(g, box(w, 0.4, 0.92, 0.07), 'sofa', 0, 0.2, 0); part(g, box(w, 0.48, 0.22, 0.08), 'sofa', 0, 0.55, -0.35); [-1, 1].forEach((k) => part(g, box(0.2, 0.58, 0.92, 0.08), 'sofa', k * (w / 2 - 0.1), 0.29, 0));
    [-1, 1].forEach((k) => part(g, box(0.42, 0.36, 0.12, 0.05), 'throw', k * w * 0.27, 0.56, -0.2)); return [w, 0.92]; },
  armchair(g) { part(g, box(0.8, 0.4, 0.8, 0.08), 'sofa', 0, 0.2, 0); part(g, box(0.8, 0.45, 0.2, 0.08), 'sofa', 0, 0.55, -0.3); [-1, 1].forEach((k) => part(g, box(0.16, 0.55, 0.8, 0.07), 'sofa', k * 0.32, 0.27, 0)); return [0.8, 0.8]; },
  table(g) { part(g, new THREE.CylinderGeometry(0.42, 0.42, 0.05, 40), 'marble', 0, 0.42, 0); part(g, new THREE.CylinderGeometry(0.18, 0.24, 0.4, 24), 'dark', 0, 0.2, 0); part(g, box(0.22, 0.05, 0.16, 0.02), 'rug', 0.08, 0.47, 0.04); return [0.84, 0.84]; },
  lamp(g) { part(g, new THREE.CylinderGeometry(0.16, 0.18, 0.04, 24), 'dark', 0, 0.02, 0); part(g, new THREE.CylinderGeometry(0.018, 0.018, 1.6, 8), 'dark', 0, 0.8, 0); part(g, new THREE.SphereGeometry(0.17, 24, 16), 'lamp', 0, 1.62, 0, { emissive: '#FFD9A0' }); return [0.36, 0.36]; },
  dining(g) { part(g, new THREE.CylinderGeometry(0.62, 0.62, 0.05, 48), 'wood', 0, 0.75, 0); part(g, new THREE.CylinderGeometry(0.08, 0.28, 0.72, 20), 'dark', 0, 0.36, 0);
    for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2 + Math.PI / 4, cx = Math.sin(a) * 0.85, cz = Math.cos(a) * 0.85; part(g, box(0.42, 0.06, 0.42, 0.02), 'light', cx, 0.46, cz, { ry: a }); part(g, box(0.42, 0.46, 0.05, 0.02), 'light', Math.sin(a) * 1.04, 0.72, Math.cos(a) * 1.04, { ry: a }); }
    for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2 + Math.PI / 4; part(g, new THREE.CylinderGeometry(0.11, 0.1, 0.015, 24), 'marble', Math.sin(a) * 0.42, 0.785, Math.cos(a) * 0.42); }
    part(g, new THREE.IcosahedronGeometry(0.1, 1), 'green', 0, 0.86, 0); return [2.3, 2.3]; },
  counter(g, { l }) { part(g, box(l, 0.86, 0.6, 0.01), 'light', 0, 0.43, 0); part(g, box(l + 0.02, 0.04, 0.64), 'marble', 0, 0.88, 0); part(g, box(0.5, 0.02, 0.36), 'dark', -l * 0.22, 0.9, 0.02); part(g, box(0.56, 0.015, 0.5), 'dark', l * 0.26, 0.905, 0);
    for (let i = 0; i < 4; i++) part(g, new THREE.CylinderGeometry(0.08, 0.08, 0.01, 20), 'metal', l * 0.26 + (i % 2 ? 0.12 : -0.12), 0.915, i < 2 ? -0.11 : 0.11, { color: '#555a62' }); return [l, 0.6]; },
  fridge(g) { part(g, box(0.72, 1.9, 0.7, 0.03), 'dark', 0, 0.95, 0); part(g, box(0.02, 0.6, 0.02), 'metal', -0.25, 1.25, 0.36, { color: '#A0A6AE' }); return [0.72, 0.7]; },
  island(g) { part(g, box(1.7, 0.88, 0.85, 0.02), 'wood', 0, 0.44, 0); part(g, box(1.78, 0.04, 0.95), 'marble', 0, 0.9, 0); part(g, new THREE.IcosahedronGeometry(0.11, 1), 'green', 0.4, 1.0, 0);
    for (let i = 0; i < 3; i++) { part(g, new THREE.CylinderGeometry(0.17, 0.17, 0.05, 24), 'dark', (i - 1) * 0.55, 0.66, 0.78); part(g, new THREE.CylinderGeometry(0.025, 0.025, 0.64, 8), 'dark', (i - 1) * 0.55, 0.32, 0.78); } return [1.78, 1.3]; },
  tub(g) { part(g, box(1.7, 0.56, 0.78, 0.18), 'light', 0, 0.28, 0); part(g, box(1.5, 0.08, 0.6, 0.12), 'water', 0, 0.52, 0, { color: '#BFE6EE' }); return [1.7, 0.78]; },
  basin(g) { part(g, box(0.8, 0.78, 0.48, 0.02), 'wood', 0, 0.39, 0); part(g, box(0.5, 0.08, 0.36, 0.06), 'light', 0, 0.82, 0.02); part(g, box(0.6, 0.7, 0.02), 'mirror', 0, 1.35, -0.23, { color: '#9FC6D6' }); return [0.8, 0.48]; },
  toilet(g) { part(g, box(0.38, 0.4, 0.5, 0.15), 'light', 0, 0.2, 0.05); part(g, box(0.4, 0.42, 0.16, 0.04), 'light', 0, 0.45, -0.2); return [0.4, 0.66]; },
};

function wallPiece(x0, y0, x1, y1, a, b, th, kind) { // one straight piece between along-wall distances a..b
  const len = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / len, uy = (y1 - y0) / len;
  const cx = x0 + ux * (a + b) / 2, cy = y0 + uy * (a + b) / 2, [X, Z] = P(cx, cy), ang = Math.atan2(uy, ux), L = b - a + (kind === 'solid' ? th : 0);
  const geo = new THREE.BoxGeometry(L, 1, th); geo.translate(0, 0.5, 0);
  const meshes = [0, 1, 2].map((k) => { const side = std(PAL[k].wall, { roughness: 0.85, clippingPlanes: CLIPS[k] }), cap = new THREE.MeshBasicMaterial({ color: C.cap, clippingPlanes: CLIPS[k] });
    const m = new THREE.Mesh(geo, [side, side, cap, side, side, side]); m.position.set(X, 0, Z); m.rotation.y = ang; apt.add(m); return m; });
  let glass = null;
  if (kind === 'window') { const gg = new THREE.BoxGeometry(b - a, 1, 0.03); gg.translate(0, 0.5, 0);
    glass = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ color: '#9EE9FF', transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.1, emissive: '#2DE6FF', emissiveIntensity: 0.25 }));
    glass.position.set(X, 0.9, Z); glass.rotation.y = ang; apt.add(glass); }
  wallPieces.push({ meshes, glass, kind, X, Z });
}
function blueprintLine(x0, y0, x1, y1, w, t0, t1, color = C.cyan) { // a drawn line on the floor: grows from its start between t0 and t1
  const [X0, Z0] = P(x0, y0), [X1, Z1] = P(x1, y1), len = Math.hypot(X1 - X0, Z1 - Z0);
  const geo = new THREE.PlaneGeometry(len, w); geo.translate(len / 2, 0, 0); geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.position.set(X0, 0.012, Z0); m.rotation.y = -Math.atan2(Z1 - Z0, X1 - X0); bp.add(m); bpParts.push({ m, t0, t1, len }); return m;
}

// ---------------------------------------------------------------- DOM helpers (all readable copy = .line/.word)
function words(parent, text, { size, weight = 800, color = C.white, cx = 540, top, width = 950, lh = 1.12, accent = {}, z = 5, track = 0, shadow = '' } = {}) {
  const L = textLine(parent, text, { left: px(cx - width / 2), top: px(top), width: px(width), justifyContent: 'center', fontFamily: AR, fontSize: px(size), fontWeight: String(weight), color, lineHeight: String(lh), zIndex: String(z), letterSpacing: `${track}em`, textShadow: shadow });
  L.words.forEach((w, i) => { if (accent[i]) w.style.color = accent[i]; });
  return L;
}
// slam: each word drops from the lens (scale 1.9 + blur), overshoots and settles; exits up with blur.
function slam(L, t, tIn, tOut, { stagger = 0.12, s0 = 0.62, dur = 0.42, blur = 18 } = {}) { // pops up from small with a short overshoot
  const vis = t >= tIn - 0.01 && t <= tOut + 0.4; L.line.style.display = vis ? 'flex' : 'none'; if (!vis) return;
  L.words.forEach((w, i) => {
    const a = tIn + i * stagger, e = spr(t, a, dur, 0.18), out = ease.inOutCubic(ramp(t, tOut + i * 0.04, tOut + i * 0.04 + 0.28));
    w.style.opacity = (clamp((t - a) / 0.08) * (1 - out)).toFixed(3);
    w.style.transform = `translateY(${(-out * 30).toFixed(1)}px) scale(${(lerp(s0, 1, e) * (1 + 0.05 * out)).toFixed(4)})`;
    setBlur(w, (1 - clamp(e)) * blur + out * 10);
  });
}
// rise: words come up out of a soft blur (secondary lines)
function rise(L, t, tIn, tOut, { stagger = 0.07, dist = 34 } = {}) {
  const vis = t >= tIn - 0.01 && t <= tOut + 0.45; L.line.style.display = vis ? 'flex' : 'none'; if (!vis) return;
  L.words.forEach((w, i) => { const p = ease.outExpo(ramp(t, tIn + i * stagger, tIn + i * stagger + 0.6)), o = ease.inOutCubic(ramp(t, tOut + i * 0.03, tOut + i * 0.03 + 0.3));
    w.style.opacity = (p * (1 - o)).toFixed(3); w.style.transform = `translateY(${((1 - p) * dist - o * 20).toFixed(1)}px)`; setBlur(w, (1 - p) * 10 + o * 8); });
}
const ICON = { // line icons drawn for this film (stroke = currentColor)
  bedroom: '<path d="M8 40V18M8 30h48v10M56 40V26a6 6 0 0 0-6-6H30v10M14 26a4 4 0 1 0 8 0a4 4 0 1 0-8 0"/>',
  living: '<path d="M10 40v-8a5 5 0 0 1 5-5h34a5 5 0 0 1 5 5v8M14 27v-7a5 5 0 0 1 5-5h26a5 5 0 0 1 5 5v7M10 40h44M14 40v5M50 40v5M20 32h24"/>',
  kitchen: '<path d="M8 22h48v24H8zM8 32h48M20 14v8M32 10v12M44 14v8M16 27h6M42 27h6M20 38h24"/>',
  bath: '<path d="M8 30h48v4a10 10 0 0 1-10 10H18A10 10 0 0 1 8 34zM14 30V14a5 5 0 0 1 10 0M18 44l-2 4M46 44l2 4M24 16h-6"/>',
  offices: '<path d="M22 14h20v18H22zM18 32h28M32 32v8M22 46l10-6l10 6M32 40v8"/>',
  storage: '<path d="M8 28L32 14l24 14v20H8zM18 48V34h28v14M18 40h28M32 34v14"/>',
  line: '<path d="M8 40h48M12 40a4 4 0 1 0 0 .1M26 40a4 4 0 1 0 0 .1M40 40a4 4 0 1 0 0 .1M52 40a4 4 0 1 0 0 .1M14 34h10v-8H14zM30 34h10v-8H30zM20 18v8M36 18v8M16 18h24"/>',
  containers: '<path d="M8 18h48v28H8zM16 18v28M24 18v28M32 18v28M40 18v28M48 18v28"/>',
};
function chipRow(parent, list, top) {
  const n = list.length, cw = 222, gap = 14, x0 = 540 + ((n * cw + (n - 1) * gap) / 2) - cw; // RTL: first chip on the right
  return list.map(([id, label], i) => {
    const box = div(parent, { left: px(x0 - i * (cw + gap)), top: px(top), width: px(cw), height: '158px', borderRadius: '30px', background: 'rgba(7,24,56,0.62)', border: '2px solid rgba(45,230,255,0.35)', boxShadow: '0 0 0 rgba(0,0,0,0)', zIndex: '6', transformOrigin: '50% 60%' });
    const ic = el('svg', { viewBox: '0 0 64 56', width: '86', height: '75', style: { position: 'absolute', left: px(cw / 2 - 43), top: '12px', color: C.cyan, fill: 'none', stroke: 'currentColor', 'stroke-width': '3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' } }, box);
    ic.innerHTML = ICON[id];
    const L = textLine(box, label, { left: '0', top: '94px', width: px(cw), justifyContent: 'center', fontFamily: AR, fontSize: '34px', fontWeight: '700', color: C.white, lineHeight: '1.2' });
    return { id, box, ic, L };
  });
}

export default {
  duration: DUR, fps: 30,
  init(stage, { W: w0, H: h0 }) {
    if (w0 !== W || h0 !== H) console.warn('film12 is authored for 1080×1920');
    stage.style.background = C.ink; stage.style.overflow = 'hidden';
    bg = div(stage, { width: px(W), height: px(H), background: `radial-gradient(120% 70% at 50% 58%, ${C.deep} 0%, ${C.navy} 45%, ${C.ink} 100%)` });
    S.bgGlow = div(stage, { width: px(W), height: px(H), background: 'radial-gradient(60% 30% at 50% 66%, rgba(45,230,255,0.18), rgba(45,230,255,0) 70%)' });
    canvas = el('canvas', { width: String(W), height: String(H), style: { position: 'absolute', left: '0', top: '0', width: px(W), height: px(H), zIndex: '1', transformOrigin: '50% 52%' } }, stage);
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.localClippingEnabled = true;
    scene = new THREE.Scene();
    scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.4;
    scene.add(new THREE.HemisphereLight('#EAF4FF', '#1C2A48', 0.55));
    const key = new THREE.DirectionalLight('#FFF0DC', 2.6); key.position.set(9, 13, 5); scene.add(key);
    const rim = new THREE.DirectionalLight('#7FE9FF', 0.7); rim.position.set(-10, 6, -8); scene.add(rim);
    camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 500);
    dummy = new THREE.Object3D();
    S.tv = screenTex(); S.ui = uiTex(); S.glow = radial([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']]); S.shadow = radial([[0, 'rgba(0,0,0,0.6)'], [0.6, 'rgba(0,0,0,0.25)'], [1, 'rgba(0,0,0,0)']]);

    // ground: blueprint grid (stays under every chapter)
    grid = new THREE.Mesh(new THREE.PlaneGeometry(48, 48), new THREE.MeshBasicMaterial({ map: gridTex(), transparent: true, depthWrite: false, color: '#ffffff' }));
    grid.rotation.x = -Math.PI / 2; grid.position.y = -0.03; scene.add(grid);
    bp = new THREE.Group(); scene.add(bp); apt = new THREE.Group(); scene.add(apt); comm = new THREE.Group(); scene.add(comm);

    // ---- blueprint drawing: the outer walls by one continuous pen, then the inner walls, door arcs and dimensions
    const outer = [[0, 0, 10.4, 0], [10.4, 0, 10.4, 8.8], [10.4, 8.8, 0, 8.8], [0, 8.8, 0, 0]];
    let acc = 0; const per = 38.4;
    for (const [x0, y0, x1, y1] of outer) { const l = Math.hypot(x1 - x0, y1 - y0); blueprintLine(x0, y0, x1, y1, 0.09, EV.penStart + ((EV.penEnd - EV.penStart) * acc) / per, EV.penStart + ((EV.penEnd - EV.penStart) * (acc + l)) / per); acc += l; }
    WALLS.slice(4).forEach(([x0, y0, x1, y1], i) => blueprintLine(x0, y0, x1, y1, 0.06, EV.interior + i * 0.11, EV.interior + i * 0.11 + 0.32));
    // dimension lines (0.55 m outside the plan) — south edge width and east edge depth
    blueprintLine(0, -0.55, 10.4, -0.55, 0.025, 0.3, 1.5, '#7FEFFF'); blueprintLine(10.95, 0, 10.95, 8.8, 0.025, 0.6, 1.7, '#7FEFFF');
    for (const [x, y] of [[0, -0.55], [10.4, -0.55], [10.95, 0], [10.95, 8.8]]) blueprintLine(x - 0.12, y - 0.12, x + 0.12, y + 0.12, 0.03, 1.4, 1.6, '#7FEFFF');
    // door swings (quarter rings on the floor)
    for (const [x0, y0, x1, y1, , ops] of WALLS) { const len = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / len, uy = (y1 - y0) / len;
      for (const [a, b, kind] of ops) { if (kind !== 'door') continue; const r = b - a, [X, Z] = P(x0 + ux * a, y0 + uy * a);
        const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.02, r + 0.0, 32, 1, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#7FEFFF', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
        ring.rotation.x = -Math.PI / 2; ring.rotation.z = Math.atan2(uy, ux); ring.position.set(X, 0.014, Z); bp.add(ring); doorArcs.push(ring); } }
    pen = new THREE.Sprite(new THREE.SpriteMaterial({ map: S.glow, color: '#9FF6FF', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); pen.scale.set(1.6, 1.6, 1); scene.add(pen);
    penGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: S.glow, color: '#2DE6FF', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 })); penGlow.scale.set(4, 4, 1); scene.add(penGlow);

    // ---- the flat: floors (three finishes clipped by the sweeping plane), wet-room tiles, room glows
    const [fx, fz] = P(5.2, 4.4);
    for (let k = 0; k < 3; k++) { const t = parquet(FLOOR[k], 11 + k); t.rotation = Math.PI / 4; t.center.set(0.5, 0.5); t.repeat.set(10.4 / 1.6, 8.8 / 1.6);
      const f = new THREE.Mesh(new THREE.PlaneGeometry(10.4, 8.8), std('#ffffff', { map: t, roughness: 0.55, clippingPlanes: CLIPS[k], transparent: true }));
      f.rotation.x = -Math.PI / 2; f.position.set(fx, 0.004, fz); apt.add(f); floors.push(f); }
    const tt = tiles(); tt.repeat.set(4, 4);
    for (const id of ['bath', 'wc']) { const r = ROOMS.find((q) => q.id === id).r, [X, Z] = P((r[0] + r[2]) / 2, (r[1] + r[3]) / 2);
      const f = new THREE.Mesh(new THREE.PlaneGeometry(r[2] - r[0], r[3] - r[1]), std('#ffffff', { map: tt, roughness: 0.3, transparent: true })); f.rotation.x = -Math.PI / 2; f.position.set(X, 0.007, Z); apt.add(f); floors.push(f); }
    for (const q of ROOMS) { const [X, Z] = P((q.r[0] + q.r[2]) / 2, (q.r[1] + q.r[3]) / 2);
      const g = new THREE.Mesh(new THREE.PlaneGeometry(q.r[2] - q.r[0] - 0.1, q.r[3] - q.r[1] - 0.1), new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      g.rotation.x = -Math.PI / 2; g.position.set(X, 0.02, Z); apt.add(g); (roomGlow[q.cat] ||= []).push(g); q.X = X; q.Z = Z; }
    // ---- walls (solid / under-window sills + glass), split around openings
    for (const [x0, y0, x1, y1, th, ops] of WALLS) { const len = Math.hypot(x1 - x0, y1 - y0); let a = 0;
      for (const [o0, o1, kind] of [...ops].sort((p, q) => p[0] - q[0])) { if (o0 > a) wallPiece(x0, y0, x1, y1, a, o0, th, 'solid'); if (kind === 'window') wallPiece(x0, y0, x1, y1, o0, o1, th, 'window'); a = o1; }
      if (a < len) wallPiece(x0, y0, x1, y1, a, len, th, 'solid'); }
    // ---- furniture (own materials per piece so each one can change finish when the plane passes it)
    FURN.forEach(([cat, type, x, y, rot, prm], i) => {
      const g = new THREE.Group(), [X, Z] = P(x, y), fp = BUILD[type](g, prm); g.position.set(X, 0, Z); g.rotation.y = (rot * Math.PI) / 180;
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(fp[0] * 1.35 + 0.3, fp[1] * 1.35 + 0.3), new THREE.MeshBasicMaterial({ map: S.shadow, transparent: true, depthWrite: false, opacity: 0 }));
      sh.rotation.x = -Math.PI / 2; sh.position.y = 0.011; g.add(sh);
      const parts = []; g.traverse((m) => { if (m.isMesh && m.userData.role) parts.push(m); });
      const ci = CATS.indexOf(cat), k = FURN.slice(0, i).filter((f) => f[0] === cat).length;
      const land = HOME[cat] + 0.12 + k * 0.125; // every piece lands on a 16th inside its category's two beats
      apt.add(g); items.push({ g, sh, parts, X, Z, land, cat, ci, type, out: EV.sink + 0.02 * Math.hypot(X, Z) });
    });
    // ---- the cut plane (hero) — a horizontal sheet with a bright rim, and a vertical sheet for sweeps
    const sheet = (w, d) => { const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })));
      for (const [x, y, ww, hh] of [[0, d / 2, w, 0.07], [0, -d / 2, w, 0.07], [w / 2, 0, 0.07, d], [-w / 2, 0, 0.07, d]]) { const r = new THREE.Mesh(new THREE.PlaneGeometry(ww, hh), new THREE.MeshBasicMaterial({ color: '#BFF8FF', transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); r.position.set(x, y, 0.001); g.add(r); }
      for (const [x, y] of [[w / 2, d / 2], [-w / 2, d / 2], [w / 2, -d / 2], [-w / 2, -d / 2]]) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: S.glow, color: '#8FF4FF', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.set(1.4, 1.4, 1); s.position.set(x, y, 0.01); g.add(s); }
      scene.add(g); return g; };
    sheetH = sheet(11.4, 9.8); sheetH.rotation.x = -Math.PI / 2; sheetH.position.set(fx, 0, fz);
    sheetV = sheet(1, 1); sheetV.rotation.y = Math.PI / 2;

    // ---- the work floor: 13×10 tiles of 2 m flip open, then four zones build behind the vertical sheet
    tilesIM = new THREE.InstancedMesh(new THREE.BoxGeometry(1.94, 0.1, 1.94), std('#3B4351', { roughness: 0.92 }), 130); comm.add(tilesIM);
    for (let i = 0; i < 13; i++) for (let j = 0; j < 10; j++) { const X = -12 + i * 2, Z = -9 + j * 2; tileArr.push({ X, Z, d: Math.hypot(X, Z) }); }
    const lane = (x0, z0, x1, z1) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(Math.abs(x1 - x0) || 0.12, Math.abs(z1 - z0) || 0.12), new THREE.MeshBasicMaterial({ color: '#F5C542', transparent: true, opacity: 0 })); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0.06, (z0 + z1) / 2); comm.add(m); zoneParts.lanes = (zoneParts.lanes || []).concat(m); };
    lane(-13, -0.0, 13, 0.0); lane(0, -10, 0, 10);
    const zp = (zone, mesh, x, delay = 0, extra = {}) => { comm.add(mesh); zoneParts[zone].push({ m: mesh, base: mesh.position.clone(), x, delay, ...extra }); return mesh; };
    const M = { desk: std('#F2F2F0'), leg: std('#20242B'), mon: std('#15181D'), chair: std('#1C2026'), scr: new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: S.ui, emissiveIntensity: 1.1 }), glass: new THREE.MeshStandardMaterial({ color: '#9EE9FF', transparent: true, opacity: 0.28, roughness: 0.05 }),
      up: std('#1E5BFF', { roughness: 0.4 }), beam: std('#F08A24', { roughness: 0.5 }), carton: std('#C99A62', { roughness: 0.85 }), belt: std('#1B1F26'), frame: std('#9AA3AE', { metalness: 0.4, roughness: 0.35 }), machine: std('#EEF1F4'), light: new THREE.MeshBasicMaterial({ color: C.cyan }), green: std('#3F7D3A'), wall: std('#F2F0EC', { roughness: 0.85 }) };
    const G = { top: new THREE.BoxGeometry(1.5, 0.05, 0.75), leg: new THREE.BoxGeometry(0.05, 0.72, 0.7), mon: new THREE.BoxGeometry(0.62, 0.38, 0.04), scr: new THREE.PlaneGeometry(0.58, 0.34), seat: new RoundedBoxGeometry(0.5, 0.1, 0.5, 2, 0.04), back: new RoundedBoxGeometry(0.5, 0.55, 0.08, 2, 0.04) };
    const up = (geo) => { geo.translate(0, 0.5, 0); return geo; };
    // offices: 3 benches × 5 desks with screens and chairs, a glass meeting box, plants
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) { const x = -11.2 + c * 2.1, z = -8.2 + r * 2.7, d = r * 0.06 + c * 0.05;
      const top = new THREE.Mesh(G.top, M.desk); top.position.set(x, 0.74, z); zp('offices', top, x, d);
      for (const k of [-1, 1]) { const l = new THREE.Mesh(G.leg, M.leg); l.position.set(x + k * 0.7, 0.36, z); zp('offices', l, x, d); }
      const mo = new THREE.Mesh(G.mon, M.mon); mo.position.set(x, 1.0, z - 0.2); zp('offices', mo, x, d + 0.04);
      const sc = new THREE.Mesh(G.scr, M.scr); sc.position.set(x, 1.0, z - 0.177); zp('offices', sc, x, d + 0.04);
      const se = new THREE.Mesh(G.seat, M.chair); se.position.set(x, 0.47, z + 0.62); zp('offices', se, x, d + 0.08);
      const bk = new THREE.Mesh(G.back, M.chair); bk.position.set(x, 0.78, z + 0.86); zp('offices', bk, x, d + 0.08); }
    for (const [x0, z0, x1, z1] of [[-12.6, -9.6, -12.6, -0.6], [-12.6, -9.6, -0.6, -9.6]]) { const len = Math.hypot(x1 - x0, z1 - z0), g = up(new THREE.BoxGeometry(x0 === x1 ? 0.14 : len, 1, x0 === x1 ? len : 0.14)); const w = new THREE.Mesh(g, M.wall); w.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); w.scale.y = 1.1; zp('offices', w, (x0 + x1) / 2, 0, { wall: 1.1 }); }
    { const g = up(new THREE.BoxGeometry(0.06, 1, 2.6)); const gl = new THREE.Mesh(g, M.glass); gl.position.set(-0.9, 0, -7.6); gl.scale.y = 2.2; zp('offices', gl, -0.9, 0.3, { wall: 2.2 }); }
    for (const [x, z] of [[-1.4, -1.2], [-12, -1.2]]) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 1), M.green); p.position.set(x, 0.55, z); zp('offices', p, x, 0.35); }
    // storage: 4 pallet racks (blue uprights, orange beams) filled with cartons
    for (let r = 0; r < 4; r++) { const z = -8.7 + r * 2.35, d = r * 0.07;
      for (let i = 0; i <= 5; i++) for (const s of [-0.5, 0.5]) { const u = new THREE.Mesh(up(new THREE.BoxGeometry(0.09, 1, 0.09)), M.up); const x = 1.6 + i * 2; u.position.set(x, 0, z + s); u.scale.y = 3; zp('storage', u, x, d, { wall: 3 }); }
      for (const lv of [0.12, 1.12, 2.12, 2.95]) for (const s of [-0.5, 0.5]) { const b = new THREE.Mesh(new THREE.BoxGeometry(10.1, 0.09, 0.06), M.beam); b.position.set(6.6, lv, z + s); zp('storage', b, 6.6, d + 0.05); }
      const ci = new THREE.InstancedMesh(new RoundedBoxGeometry(0.86, 0.62, 0.8, 2, 0.03), M.carton, 30); let n = 0; const rr = rng(40 + r);
      for (const lv of [0.17, 1.17, 2.17]) for (let i = 0; i < 10; i++) { if (rr() < 0.18) continue; dummy.position.set(2.1 + i * 1.0, lv + 0.31, z); dummy.rotation.set(0, (rr() - 0.5) * 0.08, 0); dummy.scale.set(1, 0.8 + rr() * 0.25, 1); dummy.updateMatrix(); ci.setMatrixAt(n++, dummy.matrix); }
      ci.count = n; ci.instanceMatrix.needsUpdate = true; zp('storage', ci, 6.6, d + 0.18, { cartons: true }); }
    // production line: two conveyors with machines; cartons ride the belts (pure in t)
    for (const z of [3.0, 7.0]) { const fr = new THREE.Mesh(up(new THREE.BoxGeometry(11.4, 1, 1.0)), M.frame); fr.position.set(-6.6, 0, z); fr.scale.y = 0.62; zp('line', fr, -6.6, z === 3 ? 0 : 0.08, { wall: 0.62 });
      const be = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.04, 0.84), M.belt); be.position.set(-6.6, 0.64, z); zp('line', be, -6.6, z === 3 ? 0.04 : 0.12);
      for (const x of [-10, -6.4, -2.8]) { const m = new THREE.Mesh(up(new RoundedBoxGeometry(1.5, 1, 1.6, 2, 0.08)), M.machine); m.position.set(x, 0, z); m.scale.y = 1.9; zp('line', m, x, 0.1 + (x + 10) * 0.02, { wall: 1.9 });
        const li = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.08, 1.62), M.light); li.position.set(x, 1.55, z); zp('line', li, x, 0.16 + (x + 10) * 0.02); }
      for (let k = 0; k < 7; k++) { const b = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.46, 0.56, 2, 0.03), M.carton); b.position.set(0, 0.89, z); comm.add(b); beltBoxes.push({ m: b, z, k }); } }
    // containers: 20 ft boxes stacked (2,3,1,2), corrugated sides in the brand blues
    { const cor = corrugated(); cor.wrapS = cor.wrapT = THREE.RepeatWrapping; cor.repeat.set(3, 1);
      const cols = ['#16C5E0', '#1E5BFF', '#F2F4F6', '#24314F', '#0FA3B1', '#1E5BFF', '#F2F4F6', '#16C5E0']; let n = 0;
      [[1.9, 2], [4.6, 2], [7.3, 1], [10.0, 2]].forEach(([x, hgt], c) => { for (let lv = 0; lv < hgt; lv++) { const m = new THREE.Mesh(new THREE.BoxGeometry(2.44, 2.59, 6.06), std(cols[n % 8], { map: cor, roughness: 0.55, metalness: 0.2 })); m.position.set(x, 1.3 + lv * 2.6, 5.2); zp('containers', m, x, c * 0.12 + lv * 0.16, { drop: true }); n++; } }); }
  },

  render(t) {
    // ------------------------------------------------ cut plane & wall height
    const riseP = spr(t, EV.rise, 0.8, 0.12), cutP = ease.inOutCubic(ramp(t, EV.cut, EV.cutEnd)), sinkP = ease.inOutCubic(ramp(t, EV.sink, EV.sink + 0.5));
    const sheetY = t < EV.cut ? 2.6 * riseP : t < EV.sink ? lerp(2.6, 1.1, cutP) : lerp(1.1, 0, sinkP);
    const wallH = t < EV.rise ? 0 : Math.max(0, sheetY);
    const sheetOn = sm(EV.rise - 0.05, EV.rise + 0.15, t) * (1 - sm(EV.cutEnd + 0.05, EV.cutEnd + 0.45, t)) + sm(EV.sink - 0.1, EV.sink + 0.05, t) * (1 - sm(EV.sink + 0.45, EV.sink + 0.6, t));
    sheetH.visible = sheetOn > 0.01; sheetH.position.y = sheetY + 0.01;
    sheetH.children.forEach((c, i) => { c.material.opacity = (i === 0 ? 0.16 : 1) * sheetOn; });
    const aptOn = t < EV.sink + 0.7; apt.visible = aptOn && t >= EV.rise - 0.02;
    // finish sweeps (two vertical passes across the flat)
    const s1 = lerp(-6.4, 6.4, ease.inOutCubic(ramp(t, ...SWEEP[0]))), s2 = lerp(-6.4, 6.4, ease.inOutCubic(ramp(t, ...SWEEP[1])));
    clipA.constant = -s1; clipB1.constant = s1; clipB2.constant = -s2; clipC.constant = s2;
    for (const wp of wallPieces) { const h = wp.kind === 'window' ? Math.min(wallH, 0.9) : wallH; wp.meshes.forEach((m) => { m.visible = h > 0.005; m.scale.y = Math.max(h, 0.001); });
      if (wp.glass) { wp.glass.visible = wallH > 0.9; wp.glass.scale.y = Math.max(wallH - 0.9, 0.001); } }
    const floorO = sm(EV.rise, EV.rise + 0.5, t) * (1 - sm(EV.sink + 0.2, EV.sink + 0.6, t)); floors.forEach((f) => { f.material.opacity = floorO; f.visible = floorO > 0.01; });
    // ------------------------------------------------ blueprint
    const bpFade = 1 - sm(EV.rise + 0.2, EV.rise + 0.9, t);
    bp.visible = bpFade > 0.01;
    for (const b of bpParts) { const p = ease.inOutSine(ramp(t, b.t0, b.t1)); b.m.visible = p > 0.001; b.m.scale.x = Math.max(p, 0.001); b.m.material.opacity = 0.95 * bpFade; }
    doorArcs.forEach((d, i) => { d.material.opacity = 0.75 * sm(2.6 + i * 0.06, 2.9 + i * 0.06, t) * bpFade; });
    // pen head rides the outer perimeter, then visits the inner walls
    let pp = null;
    if (t >= EV.penStart && t <= EV.penEnd + 0.15) { const u = clamp((t - EV.penStart) / (EV.penEnd - EV.penStart)) * 38.4; const segs = [[0, 0, 10.4, 0], [10.4, 0, 10.4, 8.8], [10.4, 8.8, 0, 8.8], [0, 8.8, 0, 0]]; let a = u;
      for (const [x0, y0, x1, y1] of segs) { const l = Math.hypot(x1 - x0, y1 - y0); if (a <= l) { pp = P(x0 + ((x1 - x0) * a) / l, y0 + ((y1 - y0) * a) / l); break; } a -= l; } pp ||= P(0, 0); }
    else if (t > EV.interior && t < EV.interior + 6 * 0.11 + 0.4) { const i = Math.min(5, Math.floor((t - EV.interior) / 0.11)), wl = WALLS[4 + i], q = ease.inOutSine(ramp(t, EV.interior + i * 0.11, EV.interior + i * 0.11 + 0.32)); pp = P(lerp(wl[0], wl[2], q), lerp(wl[1], wl[3], q)); }
    const penO = pp ? 1 : 0; pen.visible = penGlow.visible = penO > 0; if (pp) { pen.position.set(pp[0], 0.05, pp[1]); penGlow.position.copy(pen.position); const fl = 1 + 0.12 * Math.sin(t * 47); pen.scale.set(1.5 * fl, 1.5 * fl, 1); }
    // ------------------------------------------------ furniture: lands with squash, changes finish when the sweep passes, leaves at the sink
    for (const it of items) {
      const vis = t >= it.land - 0.32 && t < it.out + 0.3; it.g.visible = vis && aptOn; if (!vis) continue;
      const fall = ease.inCubic(ramp(t, it.land - 0.32, it.land)), k = t - it.land, sq = k > 0 ? 0.2 * Math.exp(-k / 0.1) * Math.cos(k * 30) : 0;
      const opt = it.X < s2 ? 2 : it.X < s1 ? 1 : 0, bump = Math.exp(-(((it.X - s1) / 0.55) ** 2)) * ramp(t, SWEEP[0][0], SWEEP[0][0] + 0.05) * (1 - ramp(t, SWEEP[0][1] - 0.02, SWEEP[0][1] + 0.1)) + Math.exp(-(((it.X - s2) / 0.55) ** 2)) * ramp(t, SWEEP[1][0], SWEEP[1][0] + 0.05) * (1 - ramp(t, SWEEP[1][1] - 0.02, SWEEP[1][1] + 0.1));
      const gone = ease.inCubic(ramp(t, it.out, it.out + 0.22));
      const s = Math.max(0.001, (1 + 0.07 * bump) * (1 - gone));
      it.g.position.y = (1 - fall) * 3.4 + 0.18 * bump + gone * 0.4;
      it.g.scale.set(s * (1 + sq * 0.45), s * (1 - sq), s * (1 + sq * 0.45));
      it.sh.material.opacity = 0.55 * fall * (1 - gone);
      const pal = PAL[opt]; for (const m of it.parts) { const c = pal[m.userData.role]; if (c) m.material.color.set(c); }
    }
    // rooms glow while their category lands
    CATS.forEach((c) => { const a = HOME[c], e = sm(a - 0.1, a + 0.15, t) * (1 - sm(a + 0.85, a + 1.15, t)); (roomGlow[c] || []).forEach((g) => { g.material.opacity = 0.2 * e; g.visible = e > 0.01; }); });
    // ------------------------------------------------ vertical sweep sheet (finishes, then each work zone)
    let sv = null;
    for (const [a, b] of SWEEP) if (t > a - 0.12 && t < b + 0.15) sv = { x: lerp(-6.4, 6.4, ease.inOutCubic(ramp(t, a, b))), z: 0, d: 10.2, h: 1.6, o: sm(a - 0.12, a, t) * (1 - sm(b, b + 0.15, t)) };
    const ZONE = { offices: [-12.6, -0.6, -5.1], storage: [0.6, 12.6, -5.1], line: [-12.6, -0.6, 5.1], containers: [0.6, 12.6, 5.1] };
    for (const [z, t0] of Object.entries(WORK)) if (t > t0 - 0.1 && t < t0 + 0.7) { const [xa, xb, zc] = ZONE[z]; sv = { x: lerp(xa, xb, ease.inOutCubic(ramp(t, t0, t0 + 0.55))), z: zc, d: 9.4, h: z === 'containers' ? 5.6 : 3.4, o: sm(t0 - 0.1, t0, t) * (1 - sm(t0 + 0.55, t0 + 0.7, t)) }; }
    sheetV.visible = !!sv; if (sv) { sheetV.position.set(sv.x, sv.h / 2, sv.z); sheetV.scale.set(sv.d, sv.h, 1); sheetV.children.forEach((c, i) => { c.material.opacity = (i === 0 ? 0.2 : 1) * sv.o; if (c.isSprite) c.scale.set(1.3 / sv.d, 1.3 / sv.h, 1); }); }
    // ------------------------------------------------ the work floor
    const commOn = t >= EV.tiles - 0.02; comm.visible = commOn;
    if (commOn) {
      tileArr.forEach((q, i) => { const p = spr(t, EV.tiles + q.d * 0.045, 0.5, 0.22); dummy.position.set(q.X, -0.06 - (1 - clamp(p)) * 1.2, q.Z); dummy.rotation.set((1 - p) * 1.4, 0, (1 - p) * 0.6); const s = Math.max(0.001, clamp(p * 1.15)); dummy.scale.set(s, 1, s); dummy.updateMatrix(); tilesIM.setMatrixAt(i, dummy.matrix); });
      tilesIM.instanceMatrix.needsUpdate = true;
      (zoneParts.lanes || []).forEach((m) => { m.material.opacity = 0.85 * sm(EV.tiles + 0.4, EV.tiles + 0.8, t); });
      for (const [zone, t0] of Object.entries(WORK)) { const [xa, xb] = ZONE[zone];
        for (const q of zoneParts[zone]) {
          const pass = t0 + 0.55 * clamp((q.x - xa) / (xb - xa)) + q.delay * 0.5, p = spr(t, pass, q.drop ? 0.45 : 0.5, q.drop ? 0.12 : 0.28);
          q.m.visible = t >= pass - (q.drop ? 0.3 : 0);
          if (q.drop) { const f = ease.inCubic(ramp(t, pass - 0.3, pass)), k = t - pass, sq = k > 0 ? 0.12 * Math.exp(-k / 0.1) * Math.cos(k * 26) : 0; q.m.position.y = q.base.y + (1 - f) * 9; q.m.scale.set(1 + sq * 0.4, 1 - sq, 1 + sq * 0.4); }
          else if (q.wall) q.m.scale.y = Math.max(0.001, q.wall * p);
          else if (q.cartons) { q.m.position.z = q.base.z; q.m.scale.set(1, Math.max(0.001, p), 1); }
          else { q.m.position.y = q.base.y * Math.max(0.001, p) ; q.m.scale.set(1, Math.max(0.001, clamp(p, 0, 1.3)), 1); }
        } }
      const lineOn = ramp(t, WORK.line + 0.5, WORK.line + 0.8);
      for (const b of beltBoxes) { const u = (((t - WORK.line) * 1.1 + b.k * 1.63 + (b.z > 5 ? 0.8 : 0)) % 11.4 + 11.4) % 11.4, x = -12.3 + u, e = Math.min(1, u / 0.5, (11.4 - u) / 0.5) * lineOn;
        b.m.visible = e > 0.01; b.m.position.x = x; b.m.scale.setScalar(Math.max(0.001, e)); }
    }
    // ------------------------------------------------ camera: top-down drafting → tilt into 3D → room pushes → pull back over the work floor
    const AZ = springTrack([[0, 0], [EV.rise, -34], [6.0, -26], [7.0, -16], [8.0, -6], [9.0, 4], [10.0, 12], [11.0, 20], [12.1, 38], [15.6, 52]], t, { duration: 1.25, bounce: 0.02 }) + 1.1 * t;
    const EL = springTrack([[0, 89], [EV.rise, 50], [10.0, 55], [12.1, 46], [15.6, 42]], t, { duration: 1.55, bounce: 0 });
    const rc = (c) => { const rs = ROOMS.filter((q) => q.cat === c); return [rs.reduce((s, q) => s + q.X, 0) / rs.length, rs.reduce((s, q) => s + q.Z, 0) / rs.length]; };
    const fc = CATS.map(rc), k8 = 0.3;
    const TX = springTrack([[0, 0], [6.0, fc[0][0] * k8], [7.0, fc[1][0] * k8], [8.0, fc[2][0] * k8], [9.0, fc[3][0] * k8], [10.0, 0], [12.1, 0], [12.75, -4.5], [13.5, 4.5], [14.25, -4.5], [15.0, 4.5], [15.6, 0]], t, { duration: 0.9, bounce: 0.08 });
    const TZ = springTrack([[0, 3.8], [EV.rise, 0.3], [6.0, fc[0][1] * k8], [7.0, fc[1][1] * k8], [8.0, fc[2][1] * k8], [9.0, fc[3][1] * k8], [10.0, 0.3], [12.1, 0], [12.75, -3.5], [13.5, -3.5], [14.25, 3.5], [15.0, 3.5], [15.6, 0]], t, { duration: 0.9, bounce: 0.08 });
    const DI = springTrack([[0, 54], [2.0, 52], [EV.rise, 39], [6.0, 36], [10.0, 38], [12.1, 92], [12.75, 66], [15.6, 96]], t, { duration: 1.0, bounce: 0.06 });
    const az = (AZ * Math.PI) / 180, elv = (Math.min(EL, 89.5) * Math.PI) / 180;
    camera.position.set(TX + DI * Math.cos(elv) * Math.sin(az), DI * Math.sin(elv), TZ + DI * Math.cos(elv) * Math.cos(az));
    camera.up.set(0, 1, 0); camera.lookAt(TX, 0.4, TZ);
    // frame the subject a little below the copy band: shift the principal point up the screen
    camera.setViewOffset(W, H, 0, -150 - 110 * sm(12.0, 12.7, t), W, H);
    grid.material.opacity = 0.9 - 0.3 * sm(EV.rise, EV.rise + 1, t) + 0.25 * sm(EV.tiles, EV.tiles + 0.8, t);
    renderer.render(scene, camera);

    // ------------------------------------------------ DOM: copy, labels, UI
    dom(t);
  },
};

// ================================================================ DOM layer
let built = false;
const proj = new THREE.Vector3();
function screenOf(X, Y, Z) { proj.set(X, Y, Z).project(camera); return [(proj.x + 1) / 2 * W, (1 - proj.y) / 2 * H]; }
function buildDom(stage) {
  labelsL = div(stage, { width: px(W), height: px(H), zIndex: '3' });
  copyL = div(stage, { width: px(W), height: px(H), zIndex: '5' });
  appL = div(stage, { width: px(W), height: px(H), zIndex: '6', perspective: '1600px', perspectiveOrigin: '50% 40%' });
  endL = div(stage, { width: px(W), height: px(H), zIndex: '8' });
  // hook
  S.rules = [0, 1].map((i) => div(copyL, { left: px(i ? 712 : 228), top: '322px', width: '140px', height: '3px', background: C.cyan, borderRadius: '2px', transformOrigin: i ? '0 50%' : '100% 50%' }));
  S.eyebrow = words(copyL, 'مخطط المساحات', { size: 46, weight: 600, color: '#BFEFFF', top: 294, width: 500, lh: 1.2 });
  S.hookA = words(copyL, 'شوف مشروعك', { size: 110, weight: 900, top: 356 });
  S.hookB = words(copyL, 'قبل ما تنفذه', { size: 110, weight: 900, color: C.cyan, top: 492, shadow: '0 0 34px rgba(45,230,255,0.45)' });
  // plan dimensions + room labels
  S.dimW = words(labelsL, '١٠٫٤٠ م', { size: 36, weight: 700, color: '#9FF6FF', top: 0, width: 220, lh: 1.15, z: 3 });
  S.dimH = words(labelsL, '٨٫٨٠ م', { size: 36, weight: 700, color: '#9FF6FF', top: 0, width: 220, lh: 1.15, z: 3 });
  S.rooms = ROOMS.filter((q) => !q.noLabel).map((q) => ({ q, name: words(labelsL, q.name, { size: 34, weight: 500, color: '#A6F3FF', top: 0, width: 260, lh: 1.15 }), area: words(labelsL, `${toAr(q.area)} م²`, { size: 38, weight: 800, color: C.white, top: 0, width: 260, lh: 1.15 }) }));
  // rise
  S.r1 = words(copyL, 'برنامج لتخطيط المساحات', { size: 60, weight: 500, color: '#D8F6FF', top: 300 });
  S.r2 = words(copyL, 'ثلاثي الأبعاد', { size: 134, weight: 900, color: C.cyan, top: 382, shadow: '0 0 40px rgba(45,230,255,0.45)' });
  // furnish
  S.homeChips = chipRow(copyL, [['bedroom', 'غرف نوم'], ['living', 'معيشة'], ['kitchen', 'مطبخ'], ['bath', 'حمام']], 296);
  S.count = words(copyL, '٠ قطعة أثاث في مكانها', { size: 40, weight: 600, color: '#CFF8FF', top: 486, width: 900, lh: 1.2 });
  // options
  S.o1 = words(copyL, '٣ اقتراحات', { size: 136, weight: 900, top: 290 });
  S.o2 = words(copyL, 'فرش وتشطيب مختلف', { size: 66, weight: 600, color: C.cyan, top: 470 });
  S.sel = div(copyL, { left: '270px', top: '578px', width: '540px', height: '84px', borderRadius: '42px', background: 'rgba(7,24,56,0.7)', border: '2px solid rgba(45,230,255,0.4)' });
  S.selKnob = div(S.sel, { left: '0', top: '6px', width: '172px', height: '68px', borderRadius: '34px', background: `linear-gradient(180deg, ${C.cyan}, ${C.cyanD})`, boxShadow: '0 0 26px rgba(45,230,255,0.6)' });
  S.selL = ['أ', 'ب', 'ج'].map((s, i) => words(S.sel, s, { size: 40, weight: 800, color: C.white, cx: 540 - 270 - (i - 1) * 176, top: 12, width: 160, lh: 1.2, z: 2 }));
  // scale
  S.s1 = words(copyL, 'من الشقة..', { size: 100, weight: 900, top: 286 });
  S.s2 = words(copyL, 'للمصنع', { size: 132, weight: 900, color: C.cyan, top: 400, shadow: '0 0 40px rgba(45,230,255,0.45)' });
  S.workChips = chipRow(copyL, [['offices', 'مكاتب'], ['storage', 'مخازن'], ['line', 'خطوط إنتاج'], ['containers', 'حاويات']], 574);
  // app
  S.a1 = words(copyL, 'الخطة جاهزة', { size: 120, weight: 900, top: 292 });
  S.a2 = words(copyL, 'لتقرير العميل', { size: 84, weight: 700, color: C.cyan, top: 456 });
  S.win = div(appL, { left: '50px', top: '640px', width: '980px', height: '612px', borderRadius: '22px', overflow: 'hidden', transformOrigin: '50% 50%', border: '2px solid rgba(45,230,255,0.55)', boxShadow: '0 30px 90px rgba(0,0,0,0.55), 0 0 60px rgba(45,230,255,0.35)', background: '#fff' });
  el('img', { src: new URL('./plates/app-3d.jpg', import.meta.url).href, style: { position: 'absolute', left: '0', top: '0', width: '980px', height: '612px' } }, S.win);
  S.focus = div(S.win, { left: '786px', top: '345px', width: '182px', height: '92px', borderRadius: '14px', border: `4px solid ${C.cyan}`, boxShadow: '0 0 24px rgba(45,230,255,0.9)', opacity: '0' });
  // end card
  S.wipe = div(endL, { width: px(W), height: px(H), background: `radial-gradient(90% 60% at 50% 42%, #FFFFFF 0%, ${C.paper} 60%, #E4F1F7 100%)` });
  S.endRules = [0, 1].map((i) => div(endL, { left: px(i ? 716 : 224), top: '494px', width: '140px', height: '3px', background: C.cyanD, borderRadius: '2px', transformOrigin: i ? '0 50%' : '100% 50%' }));
  S.endEye = words(endL, 'مخطط المساحات', { size: 46, weight: 600, color: '#0B2A55', top: 466, width: 500, lh: 1.2 });
  S.logo = el('img', { src: new URL('./plates/logo.png', import.meta.url).href, style: { position: 'absolute', left: '150px', top: '580px', width: '780px', height: px((780 * 510) / 995), transformOrigin: '50% 50%' } }, endL);
  S.cta = div(endL, { left: '120px', top: '1052px', width: '840px', height: '132px', borderRadius: '66px', background: `linear-gradient(180deg, #4BEFFF, ${C.cyanD})`, boxShadow: '0 18px 50px rgba(16,185,226,0.45)', transformOrigin: '50% 50%' });
  S.ctaL = words(S.cta, 'راسلني وجرّب البرنامج', { size: 60, weight: 800, color: '#04122E', cx: 420, top: 30, width: 800, lh: 1.2 });
  S.ring = div(endL, { left: '120px', top: '1052px', width: '840px', height: '132px', borderRadius: '66px', border: `3px solid ${C.cyanD}`, transformOrigin: '50% 50%', opacity: '0' });
  S.endPlan = el('svg', { viewBox: '0 0 1080 560', width: '1080', height: '560', style: { position: 'absolute', left: '0', top: '1300px' } }, endL);
  const sx = (x) => 540 + (x - 5.2) * 62, sy = (y) => 290 - (y - 4.4) * 62;
  S.endPlan.innerHTML = WALLS.map(([x0, y0, x1, y1]) => `<line x1="${sx(x0)}" y1="${sy(y0)}" x2="${sx(x1)}" y2="${sy(y1)}" stroke="${C.cyanD}" stroke-width="5" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1"/>`).join('');
  S.endLines = [...S.endPlan.querySelectorAll('line')];
  built = true;
}
function chipAnim(chips, t, times, tOut) {
  chips.forEach((c, i) => {
    const a = times[i], p = spr(t, a, 0.5, 0.32), o = ease.inOutCubic(ramp(t, tOut + i * 0.04, tOut + i * 0.04 + 0.3)), vis = t >= a - 0.02 && t < tOut + 0.38;
    c.box.style.display = vis ? 'block' : 'none'; if (!vis) return;
    const act = sm(a - 0.05, a + 0.1, t) * (1 - sm(a + 0.9, a + 1.1, t));
    const op = (clamp(p * 1.4) * (1 - o)).toFixed(3); c.box.style.opacity = op;
    c.box.style.transform = `translateY(${((1 - clamp(p)) * 40 - o * 24).toFixed(1)}px) scale(${(lerp(0.6, 1, p) * (1 + 0.06 * act)).toFixed(4)})`;
    c.box.style.background = `rgba(${Math.round(lerp(7, 18, act))},${Math.round(lerp(24, 90, act))},${Math.round(lerp(56, 120, act))},${(0.62 + 0.2 * act).toFixed(2)})`;
    c.box.style.borderColor = `rgba(45,230,255,${(0.35 + 0.6 * act).toFixed(2)})`;
    c.box.style.boxShadow = `0 0 ${(40 * act).toFixed(0)}px rgba(45,230,255,${(0.55 * act).toFixed(2)})`;
    setBlur(c.box, (1 - clamp(p)) * 8 + o * 6);
    c.L.words.forEach((w) => { w.style.opacity = op; }); // the text gate reads the word's own opacity (CRAFT 45)
  });
}
function dom(t) {
  if (!built) buildDom(canvas.parentElement);
  // hook
  const eyeIn = ease.outExpo(ramp(t, 0.05, 0.6)), eyeOut = ease.inOutCubic(ramp(t, 3.7, 3.95));
  rise(S.eyebrow, t, 0.08, 3.7);
  S.rules.forEach((r) => { r.style.transform = `scaleX(${(eyeIn * (1 - eyeOut)).toFixed(3)})`; r.style.opacity = (1 - eyeOut).toFixed(3); });
  slam(S.hookA, t, 0.5, 3.72); slam(S.hookB, t, 1.0, 3.76);
  // dimensions follow the pen; labels rest on their rooms (projected from 3D)
  const dimO = (a) => sm(a, a + 0.25, t) * (1 - sm(3.75, 4.05, t));
  { const [x, y] = screenOf(...P(5.2, -0.55).flatMap((v, i) => (i ? [0.02, v] : [v]))); const o = dimO(0.9); S.dimW.line.style.display = o > 0.01 ? 'flex' : 'none'; S.dimW.line.style.left = px(x - 110); S.dimW.line.style.top = px(y - 21); S.dimW.line.style.background = C.navy; S.dimW.line.style.borderRadius = '10px'; S.dimW.words.forEach((w) => { w.style.opacity = o.toFixed(3); }); }
  { const [x, y] = screenOf(...P(10.95, 4.4).flatMap((v, i) => (i ? [0.02, v] : [v]))); const o = dimO(1.2); S.dimH.line.style.display = o > 0.01 ? 'flex' : 'none'; S.dimH.line.style.left = px(x - 110 + 2); S.dimH.line.style.top = px(y - 22); S.dimH.line.style.transform = 'rotate(-90deg)'; S.dimH.words.forEach((w) => { w.style.opacity = o.toFixed(3); }); }
  S.rooms.forEach(({ q, name, area }, i) => {
    const a = 2.35 + i * 0.12, p = ease.outExpo(ramp(t, a, a + 0.5)), o = ease.inOutCubic(ramp(t, 3.72, 3.98)), v = t >= a && t < 4.05;
    const [x, y] = screenOf(q.X, 0, q.Z);
    for (const [L, dy] of [[name, -44], [area, 2]]) { L.line.style.display = v ? 'flex' : 'none'; if (!v) continue; L.line.style.left = px(x - 130); L.line.style.top = px(y + dy);
      L.words.forEach((w) => { w.style.opacity = (p * (1 - o)).toFixed(3); w.style.transform = `translateY(${((1 - p) * 16).toFixed(1)}px)`; setBlur(w, (1 - p) * 6 + o * 6); }); }
    const n = Number(q.area), shown = n * ease.outCubic(ramp(t, a, a + 0.6)); area.words[0].textContent = toAr(shown.toFixed(2));
  });
  // rise
  rise(S.r1, t, 4.05, 5.68); slam(S.r2, t, 4.2, 5.7, { blur: 14 });
  // furnish: chips land on the beats with their room; the count follows the landings
  chipAnim(S.homeChips, t, CATS.map((c) => HOME[c]), 9.62);
  const landed = items.filter((it) => t >= it.land).length;
  S.count.words[0].textContent = toAr(landed); rise(S.count, t, 6.15, 9.62);
  // options
  slam(S.o1, t, 10.0, 11.86); rise(S.o2, t, 10.2, 11.86);
  { const vis = t >= 10.05 && t < 12.2, p = ease.outExpo(ramp(t, 10.05, 10.45)), o = ease.inOutCubic(ramp(t, 11.86, 12.1)); S.sel.style.display = vis ? 'block' : 'none';
    S.sel.style.opacity = (p * (1 - o)).toFixed(3); S.sel.style.transform = `translateY(${((1 - p) * 30).toFixed(1)}px)`;
    const k = springTrack([[0, 0], [SWEEP[0][0] + 0.25, 1], [SWEEP[1][0] + 0.25, 2]], t, { duration: 0.42, bounce: 0.25 }); S.selKnob.style.left = px(540 - 172 - 6 - k * 176); // RTL: أ on the right
    S.selL.forEach((L, i) => { const on = clamp(1 - Math.abs(k - i)); L.words[0].style.color = on > 0.5 ? '#04122E' : '#FFFFFF'; L.words[0].style.opacity = '1'; }); }
  // scale
  slam(S.s1, t, 12.15, 15.85); slam(S.s2, t, 12.45, 15.88);
  chipAnim(S.workChips, t, Object.values(WORK), 15.85);
  // app reveal: the 3D canvas recedes into depth while the real app window lands
  { const p = spr(t, EV.appIn, 0.7, 0.16), vis = t >= EV.appIn - 0.01 && t < EV.wipe + 0.6, o = ramp(t, EV.wipe, EV.wipe + 0.4);
    canvas.style.transform = `scale(${lerp(1, 0.72, clamp(p)).toFixed(4)})`; canvas.style.opacity = (1 - clamp(p * 1.4)).toFixed(3); setBlur(canvas, clamp(p) * 12); canvas.style.display = t > EV.appIn + 0.8 ? 'none' : 'block';
    S.win.style.display = vis ? 'block' : 'none';
    S.win.style.opacity = clamp(p * 1.6).toFixed(3); const drift = ease.inOutSine(ramp(t, EV.appIn + 0.6, EV.wipe)); // slow push + tilt while the copy reads, so the hold breathes
    S.win.style.transform = `rotateX(${(lerp(26, 9, clamp(p)) - 5 * drift).toFixed(2)}deg) scale(${(lerp(1.45, 1, p) * (1 + 0.06 * drift)).toFixed(4)}) translateY(${((1 - clamp(p)) * 120).toFixed(1)}px)`; setBlur(S.win, (1 - clamp(p)) * 16);
    const f = sm(16.75, 16.95, t); S.focus.style.opacity = f.toFixed(3); S.focus.style.transform = `scale(${(1 + 0.35 * (1 - ease.outCubic(ramp(t, 16.75, 17.15)))).toFixed(3)})`; }
  slam(S.a1, t, 16.15, 17.82); rise(S.a2, t, 16.4, 17.82);
  // end card: a light wipe opens from the highlighted "ready" box, the logo resolves whole, the CTA pops, then a quiet hold
  { const on = t >= EV.wipe; endL.style.display = on ? 'block' : 'none';
    if (on) { const r = 2200 * ease.outCubic(ramp(t, EV.wipe, EV.wipe + 0.45)); S.wipe.style.clipPath = `circle(${r.toFixed(1)}px at 920px 1060px)`;
      const lp = spr(t, EV.logo, 0.6, 0.12); S.logo.style.opacity = clamp(lp * 1.5).toFixed(3); S.logo.style.transform = `scale(${lerp(1.18, 1, clamp(lp)).toFixed(4)})`; setBlur(S.logo, (1 - clamp(lp)) * 22);
      rise(S.endEye, t, EV.logo + 0.1, 99); const ri = ease.outExpo(ramp(t, EV.logo + 0.1, EV.logo + 0.6)); S.endRules.forEach((r) => { r.style.transform = `scaleX(${ri.toFixed(3)})`; });
      const cp = spr(t, EV.cta, 0.5, 0.35); S.cta.style.opacity = clamp(cp * 2).toFixed(3); S.cta.style.transform = `scale(${lerp(0.5, 1, cp).toFixed(4)})`;
      S.ctaL.words.forEach((w, i) => { const q = ease.outExpo(ramp(t, EV.cta + 0.12 + i * 0.06, EV.cta + 0.6 + i * 0.06)); w.style.opacity = q.toFixed(3); w.style.transform = `translateY(${((1 - q) * 18).toFixed(1)}px)`; });
      const rp = ramp(t, 19.0, 19.8); S.ring.style.opacity = (rp > 0 ? 0.8 * (1 - rp) : 0).toFixed(3); S.ring.style.transform = `scale(${(1 + 0.12 * ease.outCubic(rp)).toFixed(4)}, ${(1 + 0.5 * ease.outCubic(rp)).toFixed(4)})`;
      S.endLines.forEach((l, i) => { const q = ease.inOutSine(ramp(t, EV.logo + 0.2 + i * 0.07, EV.logo + 0.7 + i * 0.07)); l.setAttribute('stroke-dashoffset', (1 - q).toFixed(4)); l.style.opacity = '0.55'; }); } }
}
