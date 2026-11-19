// Four worlds. Shared conventions: the stage sits at negative Z facing +Z, the crowd stands between
// z ≈ -14 and +35, the DJ is near (0, 2.4, -20). Every world exposes anchors for the camera director,
// emitters for pyro/CO2/fireworks and an update() that reads the lighting desk's look.
import * as THREE from 'three';
import { aim } from './show.js';
import { BeamRig, Crowd, instanced, makeLaserSheet, makeLED, makeSky, trsMatrix, tube, updateLED } from './fixtures.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const tmpDir = new THREE.Vector3(), tmpO = new THREE.Vector3(), out2 = [0, 0];

// ---------------------------------------------------------------- small JS noise for terrain
function hash(x, y) { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, o = 5) { let s = 0, a = 0.5; for (let i = 0; i < o; i++) { s += a * vnoise(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 9.2; a *= 0.5; } return s; }

const dirFrom = (az, el, out) => out.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));

// ---------------------------------------------------------------- base
class World {
  constructor(ctx, key) {
    this.ctx = ctx;
    this.key = key;
    this.group = new THREE.Group();
    this.updaters = [];
    this.leds = [];
    this.emit = { flames: [], co2: [], fireworks: [], confetti: V(0, 6, -14) };
    this.lights = [];
  }

  add(o) { this.group.add(o); return o; }
  mat(color, opts = {}) { return new THREE.MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.6, ...opts }); }
  glow(color = 0xffffff) { return new THREE.MeshBasicMaterial({ color, toneMapped: false }); }

  crowdSpots(n, { zNear = -13, zFar = 34, xHalf = 20, stage = V(0, 0, -20), y = 0, filter } = {}) {
    const spots = [];
    let guard = 0;
    while (spots.length < n && guard++ < n * 20) {
      const t = Math.pow(Math.random(), 1.35);
      const z = zNear + t * (zFar - zNear);
      const widen = 0.7 + 0.3 * t;
      const x = (Math.random() * 2 - 1) * xHalf * widen;
      if (filter && !filter(x, z)) continue;
      spots.push({ x, z, y, yaw: Math.atan2(stage.x - x, stage.z - z) + (Math.random() - 0.5) * 0.5, s: 0.9 + Math.random() * 0.2 });
    }
    // sort near-to-far from the stage so a smaller count keeps the front rows full
    spots.sort((a, b) => a.z - b.z);
    return spots;
  }

  // standing moving heads with pan/tilt and a volumetric beam each
  movingHeads(specs, { length = 40, radius = 2.4 } = {}) {
    const A = this.ctx.assets;
    const rig = new BeamRig(specs.length, { kind: 'beam', length, radius });
    this.add(rig.mesh);
    const lensA = this.glow(), lensB = this.glow();
    const fx = specs.map((s, i) => {
      const g = new THREE.Group();
      g.position.set(s.x, s.y, s.z);
      const yoke = new THREE.Group(), head = new THREE.Group();
      yoke.position.y = 0.16; head.position.y = 0.22;
      head.add(A.mesh('mh_head'), A.mesh('mh_lens', i % 2 ? lensB : lensA));
      yoke.add(A.mesh('mh_yoke'), head);
      g.add(A.mesh('mh_base'), yoke);
      this.add(g);
      return { s, yoke, head };
    });
    this.updaters.push((t, L, clock) => {
      lensA.color.copy(L.colors[0]).multiplyScalar(2 + L.beamLevel * 6);
      lensB.color.copy(L.colors[1]).multiplyScalar(2 + L.beamLevel * 6);
      for (let i = 0; i < fx.length; i++) {
        const f = fx[i];
        aim(L.chase, i, fx.length, clock.beat, L, out2);
        const az = f.s.az + out2[0] * (f.s.flip ? -1 : 1), el = Math.max(0.05, Math.min(1.5, f.s.el + out2[1]));
        f.yoke.rotation.y = az + Math.PI;
        f.head.rotation.x = el;
        dirFrom(az, el, tmpDir);
        tmpO.set(f.s.x, f.s.y + 0.38, f.s.z).addScaledVector(tmpDir, 0.2);
        let k = L.beamLevel;
        if (L.chase === 'chase') k *= (i + Math.floor(clock.beat)) % 2 ? 1 : 0.25;
        rig.set(i, tmpO, tmpDir, i % 2 ? L.colors[1] : L.colors[0], k * 0.55, length, radius);
      }
      rig.commit(t);
    });
    return rig;
  }

  // laser emitters: each throws k thin beams
  lasers(emitters, { length = 120 } = {}) {
    const total = emitters.reduce((s, e) => s + e.k, 0);
    const rig = new BeamRig(total, { kind: 'laser', length });
    this.add(rig.mesh);
    const col = new THREE.Color();
    this.updaters.push((t, L, clock) => {
      let n = 0;
      const B = clock.beat * L.beamSpeed;
      const pat = L.laserChase;
      for (let e = 0; e < emitters.length; e++) {
        const em = emitters[e];
        for (let j = 0; j < em.k; j++) {
          const x = em.k > 1 ? j / (em.k - 1) - 0.5 : 0;
          let az = em.az, el = em.el;
          if (pat === 'tunnel') { const a = (j / em.k) * Math.PI * 2 + t * 1.2; const r = 0.22 + 0.1 * Math.sin(B * Math.PI * 0.5); az += Math.cos(a) * r; el += Math.sin(a) * r * 0.7; }
          else if (pat === 'scan') { az += Math.sin(t * 2.5 + j * 0.15) * 0.9; el += x * 0.05; }
          else if (pat === 'crisscross') { az += x * 0.9 * Math.sin(B * Math.PI * 0.5) * (em.flip ? -1 : 1); el += 0.06 * Math.sin(B * Math.PI); }
          else { az += x * em.spread * (0.55 + 0.45 * Math.sin((B / 4) * Math.PI * 2)); el += 0.14 * Math.sin((B / 4) * Math.PI * 2 + e); }
          dirFrom(az, el, tmpDir);
          col.copy(Math.floor(clock.bar / 2) % 2 && em.alt ? L.colors[1] : L.colors[0]);
          let k = pat === 'sheet' ? 0 : L.laserLevel;
          if (L.section === 'drop' && pat === 'fan') k *= clock.phase < 0.55 ? 1 : 0.15;
          rig.set(n++, em.p, tmpDir, col, k * 2.2, length);
        }
      }
      rig.commit(t);
    });
    return rig;
  }

  blinders(positions, rotY = 0) {
    const A = this.ctx.assets;
    const cells = this.glow(0xffb070);
    for (const p of positions) {
      const b = A.mesh('blinder'); b.position.copy(p); b.rotation.y = rotY; this.add(b);
      const c = A.mesh('blinder_cells', cells); c.position.copy(p); c.rotation.y = rotY; this.add(c);
    }
    this.updaters.push((t, L) => {
      const k = 0.15 + L.blinder * 9 + L.strobe * 4;
      cells.color.setRGB(1, 0.62, 0.32).multiplyScalar(k);
    });
  }

  lineArray(x, yTop, z, n, rotY = 0) {
    const A = this.ctx.assets;
    const ms = [], gs = [];
    for (let i = 0; i < n; i++) {
      const m = trsMatrix(x, yTop - i * 0.34, z, -i * 0.035, rotY, 0);
      ms.push(m); gs.push(m);
    }
    this.add(instanced(A.geo('speaker'), A.mats.dark, ms));
    this.add(instanced(A.geo('speaker_grille'), A.mats.grille, gs));
  }

  trussColumn(x, y0, z, segs) {
    const ms = [];
    for (let i = 0; i < segs; i++) ms.push(trsMatrix(x, y0 + i * 2, z));
    this.add(instanced(this.ctx.assets.geo('truss_seg'), this.ctx.assets.mats.steel, ms));
  }

  trussBeam(a, b) {
    const d = new THREE.Vector3().subVectors(b, a), len = d.length(), n = Math.max(1, Math.round(len / 2));
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
    const ms = [];
    for (let i = 0; i < n; i++) {
      const p = a.clone().addScaledVector(d, i / n);
      ms.push(new THREE.Matrix4().compose(p, q, V(1, len / n / 2, 1)));
    }
    this.add(instanced(this.ctx.assets.geo('truss_seg'), this.ctx.assets.mats.steel, ms));
  }

  booth(x, y, z) {
    const A = this.ctx.assets;
    const g = new THREE.Group();
    g.position.set(x, y, z);
    this.slats = this.glow();
    g.add(A.mesh('booth'), A.mesh('booth_slats', this.slats), A.mesh('booth_gear', A.mats.steel));
    this.add(g);
    // the DJ: one figure using the crowd shader, arms driven separately
    this.dj = new Crowd(A.geo('crowd_person'), 1);
    this.dj.layout([{ x, z: z - 0.75, y, yaw: 0, s: 1.02 }]);
    this.dj.mat.uniforms.uSway.value = 0.5;
    this.add(this.dj.mesh);
    this.updaters.push((t, L, clock) => {
      this.slats.color.copy(L.colors[0]).multiplyScalar(0.6 + L.intensity * 2.5 * (0.7 + 0.3 * Math.sin(clock.phase * Math.PI * 2)));
      const u = this.dj.mat.uniforms;
      u.uTime.value = t; u.uBeat.value = clock.phase;
      u.uJump.value = L.section === 'drop' ? 0.35 : 0.08;
      u.uArms.value += ((L.dropAge < 3 || L.build > 0.85 ? 1 : 0.18) - u.uArms.value) * 0.08;
      u.uRimA.value.copy(L.colors[0]).multiplyScalar(1.5); u.uRimB.value.copy(L.colors[0]).multiplyScalar(1.5);
    });
  }

  led(w, h, dots, x, y, z, rotY = 0) {
    const m = makeLED(w, h, dots, this.ctx.spectrum, this.ctx.titleTex);
    m.position.set(x, y, z); m.rotation.y = rotY;
    this.leds.push(m);
    return this.add(m);
  }

  sheet(y, origin, size = 90) {
    const s = makeLaserSheet(size);
    s.position.set(origin.x, y, origin.y + 10);
    s.material.uniforms.uOrigin.value.copy(origin);
    this.add(s);
    this.updaters.push((t, L) => {
      s.material.uniforms.uTime.value = t;
      s.material.uniforms.uCol.value.copy(L.colors[0]);
      s.material.uniforms.uI.value += (L.sheet - s.material.uniforms.uI.value) * 0.05;
      s.visible = s.material.uniforms.uI.value > 0.01;
    });
  }

  update(dt, t, L, clock, a) {
    for (const u of this.updaters) u(t, L, clock, a, dt);
    for (const m of this.leds) updateLED(m, t, L, a);
  }

  dispose() {
    this.group.traverse((o) => { if (o.geometry && !o.userData.shared) o.geometry.dispose?.(); });
  }
}

// ================================================================ 1. canyon (Wadi at dusk, ring gate)
export class Canyon extends World {
  constructor(ctx) {
    super(ctx, 'canyon');
    this.palette = 'canyon';
    this.fog = { color: new THREE.Color(0x141a30), density: 0.0035 };
    this.exposure = 1.05;
    this.anchors = { stage: V(0, 7.5, -21), dj: V(0, 2.9, -20.2), portal: V(0, 9.2, -23), crowd: { zNear: -12, zFar: 34, xHalf: 21 }, ceiling: 60 };
    const A = ctx.assets;
    this.sky = this.add(makeSky(0, ctx.spectrum));
    this.sky.material.uniforms.uSunDir.value.set(0.25, 0.05, -1);
    this.add(new THREE.HemisphereLight(0x4a5c9a, 0x2a1408, 0.8));
    const sun = new THREE.DirectionalLight(0xffb27a, 2.6);
    sun.position.set(-70, 45, 30); sun.target.position.set(40, 0, -20);
    this.add(sun); this.add(sun.target);
    this.spill = new THREE.PointLight(0xff7a1a, 300, 120, 1.6);
    this.spill.position.set(0, 9, -17);
    this.add(this.spill);

    // ground + cliffs (faceted sandstone with strata, displaced in JS)
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700, 1, 1), this.mat(0x2a1309, { roughness: 1, metalness: 0 }));
    ground.rotation.x = -Math.PI / 2;
    this.add(ground);
    this.add(this.cliff(-62, -60, 0.78, 1, 220, 44));
    this.add(this.cliff(66, -34, -1.0, 2, 220, 56));
    this.add(this.cliff(-20, -230, 0.05, 3, 340, 30));

    // stage deck
    const deck = new THREE.Mesh(new THREE.BoxGeometry(36, 1.2, 11), A.mats.dark);
    deck.position.set(0, 0.6, -21.5);
    this.add(deck);
    // the gate: 24 Blender panels around a glowing ring, an LED portal inside
    this.gate = new THREE.Group();
    this.gate.position.set(0, 9.2, -23.2);
    this.panels = [];
    for (let i = 0; i < 24; i++) {
      const name = `gate_panel_${String(i).padStart(2, '0')}`;
      const m = A.mesh(name);
      const c = A.center(name);
      const r = new THREE.Vector3(c.x, c.y, 0).normalize();
      this.panels.push({ m, r, spin: (Math.random() - 0.5) * 0.6, out: 2.5 + Math.random() * 2.5 });
      this.gate.add(m);
    }
    this.ring = this.glow();
    this.gate.add(new THREE.Mesh(new THREE.TorusGeometry(5.86, 0.075, 8, 160), this.ring));
    this.gate.add(new THREE.Mesh(new THREE.TorusGeometry(6.16, 0.16, 8, 96), A.mats.dark));
    const portal = makeLED(11.6, 11.6, 64, ctx.spectrum, ctx.titleTex);
    portal.geometry = new THREE.CircleGeometry(5.8, 72);
    portal.position.z = -0.3;
    this.leds.push(portal);
    this.gate.add(portal);
    this.add(this.gate);
    // towers with blinders and line arrays
    for (const s of [-1, 1]) {
      this.trussColumn(s * 13, 1.2, -21, 6);
      this.blinders([V(s * 13, 4, -20.6), V(s * 13, 6.8, -20.6), V(s * 13, 9.6, -20.6)]);
      this.lineArray(s * 10.6, 13.5, -19.8, 10, s * -0.12);
    }
    this.booth(0, 1.2, -19);
    const heads = [];
    for (let i = 0; i < 8; i++) { const x = -14 + i * 4; heads.push({ x, y: 1.2, z: -16.6, az: x * -0.02, el: 1.05, flip: x < 0 }); }
    heads.push({ x: -13, y: 13.2, z: -21, az: 0.4, el: 0.35 }, { x: 13, y: 13.2, z: -21, az: -0.4, el: 0.35, flip: true });
    this.movingHeads(heads, { length: 46, radius: 2.4 });
    this.lasers([
      { p: V(0, 1.9, -20.4), k: 12, az: 0, el: 0.2, spread: 1.6, alt: true },
      { p: V(-13, 13.4, -21), k: 6, az: 0.35, el: 0.02, spread: 0.7, flip: false },
      { p: V(13, 13.4, -21), k: 6, az: -0.35, el: 0.02, spread: 0.7, flip: true },
    ]);
    this.sheet(4.6, new THREE.Vector2(0, -20));
    for (const x of [-16, -11, -6, 6, 11, 16]) this.emit.flames.push(V(x, 1.2, -16.2));
    for (const x of [-8.5, -3, 3, 8.5]) this.emit.co2.push(V(x, 1.2, -16.4));
    this.emit.fireworks.push(V(-24, 38, -50), V(0, 46, -60), V(24, 38, -50), V(-12, 52, -70), V(14, 50, -72));
    this.hazeArea = { min: [-20, 0.5, -26], max: [20, 6, -4], size: [6, 12] };
    this.updaters.push((t, L, clock, a) => {
      this.ring.color.copy(L.colors[0]).multiplyScalar(3 + L.intensity * 6 + (a ? a.punch.kick * 6 : 0));
      for (const p of this.panels) {
        const e = L.explode;
        p.m.position.set(p.r.x * e * p.out, p.r.y * e * p.out, e * p.out * 0.8);
        p.m.rotation.set(e * p.spin, e * p.spin * 0.5, e * p.spin);
      }
      this.spill.intensity = 80 + L.intensity * 260 + L.flash * 900 + L.blinder * 400;
      this.spill.color.copy(L.colors[0]);
      const sky = this.sky.material.uniforms;
      sky.uTime.value = t;
    });
  }

  cliff(x, z, rotY, seed, width = 200, H = 80) {
    const sx = 150, sy = 70;
    const g = new THREE.PlaneGeometry(width, H, sx, sy);
    const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
    const c0 = new THREE.Color(0x3a1c10), c1 = new THREE.Color(0x8a4a2a), c2 = new THREE.Color(0x5e3420), tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i), py = pos.getY(i);
      const n = fbm(px * 0.03 + seed * 10, py * 0.03) * 14 + fbm(px * 0.12, py * 0.12 + seed) * 3.5;
      const lean = (py + H / 2) / H;
      pos.setZ(i, n + lean * lean * 8);
      const band = (Math.sin(py * 0.55 + fbm(px * 0.05, py * 0.02) * 6) + 1) * 0.5;
      tmp.copy(c0).lerp(c1, band).lerp(c2, fbm(px * 0.2, py * 0.2 + 5) * 0.6);
      col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true }));
    m.position.set(x, H / 2 - 6, z);
    m.rotation.y = rotY;
    return m;
  }
}

// ================================================================ 2. warehouse (industrial hall, neon portals)
export class Warehouse extends World {
  constructor(ctx) {
    super(ctx, 'warehouse');
    this.palette = 'laser';
    this.fog = { color: new THREE.Color(0x0a1119), density: 0.011 };
    this.exposure = 1.1;
    this.anchors = { stage: V(0, 5.5, -22), dj: V(0, 2.9, -22), portal: V(0, 5.5, -27), crowd: { zNear: -14, zFar: 38, xHalf: 20 }, ceiling: 20 };
    const A = ctx.assets;
    this.add(new THREE.HemisphereLight(0x2a3e52, 0x14100c, 1.4));
    const W = 24, Z0 = -46, Z1 = 50, H = 24;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, Z1 - Z0), this.mat(0x101114, { roughness: 0.7, metalness: 0.3 }));
    floor.rotation.x = -Math.PI / 2; floor.position.z = (Z0 + Z1) / 2;
    this.add(floor);
    const wallTex = this.concrete();
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95, metalness: 0, color: 0x9a8f86 });
    const left = new THREE.Mesh(new THREE.PlaneGeometry(Z1 - Z0, H), wallMat);
    left.rotation.y = Math.PI / 2; left.position.set(-W, H / 2, (Z0 + Z1) / 2); this.add(left);
    const right = new THREE.Mesh(new THREE.PlaneGeometry(Z1 - Z0, H), new THREE.MeshStandardMaterial({ map: wallTex, color: 0x3a3f46, roughness: 0.95 }));
    right.rotation.y = -Math.PI / 2; right.position.set(W, H / 2, (Z0 + Z1) / 2); this.add(right);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, H), new THREE.MeshStandardMaterial({ color: 0x08090b, roughness: 1 }));
    back.position.set(0, H / 2, Z0); this.add(back);
    // columns, roof trusses, skylights
    const colMs = [];
    for (let z = Z0 + 4; z < Z1; z += 9) { colMs.push(trsMatrix(-W + 0.6, H / 2, z, 0, 0, 0, 1.1, H, 0.7)); colMs.push(trsMatrix(W - 0.6, H / 2, z, 0, 0, 0, 1.1, H, 0.7)); }
    this.add(instanced(new THREE.BoxGeometry(1, 1, 1), this.mat(0x1d2126, { metalness: 0.8, roughness: 0.5 }), colMs));
    for (let z = Z0 + 4; z < Z1; z += 9) this.trussBeam(V(-W + 1, H - 1, z), V(W - 1, H - 1, z));
    for (let x = -W + 4; x < W; x += 8) this.trussBeam(V(x, H - 1.6, Z0), V(x, H - 1.6, Z1));
    const sky = this.glow(0x0c1a2a);
    for (let x = -18; x <= 18; x += 12) { const s = new THREE.Mesh(new THREE.PlaneGeometry(5, Z1 - Z0 - 10), sky); s.rotation.x = Math.PI / 2; s.position.set(x, H - 0.05, (Z0 + Z1) / 2); this.add(s); }
    // catwalk + handrail on the right
    const cw = new THREE.Mesh(new THREE.BoxGeometry(5, 0.3, Z1 - Z0 - 20), this.mat(0x15181c, { metalness: 0.8 }));
    cw.position.set(W - 2.5, 9, (Z0 + Z1) / 2 + 6); this.add(cw);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, Z1 - Z0 - 20), new THREE.MeshStandardMaterial({ color: 0xb88a12, roughness: 0.5, metalness: 0.4 }));
    rail.position.set(W - 5, 10.1, cw.position.z); this.add(rail);
    // sodium cage lamps on the left wall (two real lights; the rest glow)
    this.bulbs = this.glow(0xffa050);
    for (let z = Z0 + 10, i = 0; z < Z1; z += 9, i++) {
      const c = A.mesh('lamp_cage'); c.position.set(-W + 1.4, 8.5, z); this.add(c);
      const b = A.mesh('lamp_bulb', this.bulbs); b.position.copy(c.position); this.add(b);
      if (i === 2 || i === 6) { const l = new THREE.PointLight(0xff9040, 60, 26, 1.6); l.position.set(-W + 2, 8, z); this.add(l); }
    }
    // stage: nested neon portal frames converging on the DJ
    const deck = new THREE.Mesh(new THREE.BoxGeometry(30, 1.2, 12), A.mats.dark);
    deck.position.set(0, 0.6, -23); this.add(deck);
    this.frames = [];
    for (let i = 0; i < 10; i++) {
      const s = Math.pow(0.8, i), w = 26 * s, h = 18 * s, z = -18.5 - i * 2.2, y0 = 1.2 + i * 0.32;
      const m = this.glow();
      const r = 0.09 * s + 0.03;
      const f = new THREE.Group();
      f.add(tube(V(-w / 2, y0, z), V(w / 2, y0, z), r, m), tube(V(-w / 2, y0 + h, z), V(w / 2, y0 + h, z), r, m),
        tube(V(-w / 2, y0, z), V(-w / 2, y0 + h, z), r, m), tube(V(w / 2, y0, z), V(w / 2, y0 + h, z), r, m));
      this.add(f);
      this.frames.push(m);
    }
    this.trussBeam(V(-13.4, 19.5, -18.2), V(13.4, 19.5, -18.2));
    this.trussColumn(-13.4, 1.2, -18.2, 9); this.trussColumn(13.4, 1.2, -18.2, 9);
    this.lineArray(-11.2, 18.6, -17.4, 11, 0.15);
    this.lineArray(11.2, 18.6, -17.4, 11, -0.15);
    this.led(7, 4.2, 40, 0, 4.8, -42.5);
    this.booth(0, 1.2 + 6 * 0.32 * 0.25, -21.5);
    const heads = [];
    for (let i = 0; i < 10; i++) { const x = -12.6 + i * 2.8; heads.push({ x, y: 1.2, z: -17.4, az: x * -0.025, el: 1.0, flip: x < 0 }); }
    for (let i = 0; i < 5; i++) heads.push({ x: W - 3, y: 9.15, z: -8 + i * 9, az: -1.15, el: 0.15 });
    this.movingHeads(heads, { length: 40, radius: 2 });
    this.lasers([
      { p: V(0, 3.2, -26), k: 14, az: 0, el: 0.12, spread: 1.5, alt: true },
      { p: V(-12.6, 1.6, -17.6), k: 6, az: 0.45, el: 0.18, spread: 0.6, flip: false },
      { p: V(12.6, 1.6, -17.6), k: 6, az: -0.45, el: 0.18, spread: 0.6, flip: true },
    ]);
    this.sheet(5.2, new THREE.Vector2(0, -24), 80);
    for (const x of [-13, -8.5, 8.5, 13]) this.emit.flames.push(V(x, 1.2, -17.2));
    for (const x of [-5, -1.5, 1.5, 5]) this.emit.co2.push(V(x, 1.2, -17.3));
    this.hazeArea = { min: [-22, 0.5, -40], max: [22, 18, 30], size: [9, 20] };
    this.updaters.push((t, L, clock, a) => {
      // a pulse travels down the tunnel of frames every beat
      for (let i = 0; i < this.frames.length; i++) {
        const ph = ((clock.beat * (L.section === 'drop' ? 1 : 0.5) - i * 0.11) % 1 + 1) % 1;
        const pulse = Math.pow(1 - ph, 5);
        this.frames[i].color.copy(L.colors[0]).multiplyScalar(0.6 + L.intensity * 1.6 + pulse * 5 * L.intensity + L.flash * 4);
      }
      this.bulbs.color.setRGB(1, 0.55, 0.22).multiplyScalar(2.2 + (a ? a.v.bass * 0.8 : 0));
    });
  }

  concrete() {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = '#6d655d'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2600; i++) { const v = 70 + Math.random() * 60; g.fillStyle = `rgba(${v},${v - 6},${v - 12},${Math.random() * 0.25})`; g.fillRect(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 30, 2 + Math.random() * 30); }
    for (let i = 0; i < 40; i++) { const x = Math.random() * 512; const gr = g.createLinearGradient(x, 0, x, 512); gr.addColorStop(0, 'rgba(30,20,10,0.35)'); gr.addColorStop(1, 'rgba(30,20,10,0)'); g.fillStyle = gr; g.fillRect(x, 0, 6 + Math.random() * 20, 512); }
    for (let y = 0; y < 512; y += 64) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, y, 512, 2); }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 2); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
}

// ================================================================ 3. eclipse (desert night, truss pyramid)
export class Eclipse extends World {
  constructor(ctx) {
    super(ctx, 'eclipse');
    this.palette = 'eclipse';
    this.fog = { color: new THREE.Color(0x05060c), density: 0.0035 };
    this.exposure = 1.05;
    const apex = V(0, 19, -24);
    this.anchors = { stage: V(0, 8, -23), dj: V(0, 2.9, -21.5), portal: V(0, 7, -24), crowd: { zNear: -12, zFar: 38, xHalf: 24 }, ceiling: 60 };
    const A = ctx.assets;
    this.sky = this.add(makeSky(1, ctx.spectrum));
    this.sky.material.uniforms.uSunDir.value.set(0, 0.36, -1).normalize();
    this.add(new THREE.HemisphereLight(0x223055, 0x0a0604, 0.55));
    const moon = new THREE.DirectionalLight(0x8090c0, 0.7); moon.position.set(30, 60, -80); this.add(moon);
    this.spill = new THREE.PointLight(0xffa040, 300, 90, 1.5); this.spill.position.set(0, 6, -16); this.add(this.spill);
    // dunes
    const g = new THREE.PlaneGeometry(900, 900, 160, 160);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), d = Math.hypot(x, y + 10);
      pos.setZ(i, d < 60 ? 0 : (fbm(x * 0.008, y * 0.008, 4) - 0.35) * Math.min(1, (d - 60) / 80) * 30);
    }
    g.computeVertexNormals();
    const dunes = new THREE.Mesh(g, this.mat(0x2b1d12, { roughness: 1, metalness: 0 }));
    dunes.rotation.x = -Math.PI / 2; this.add(dunes);
    // three distant pyramids on the horizon
    const pyrMat = this.mat(0x120c08, { roughness: 1, metalness: 0 });
    for (const [x, z, s] of [[-150, -330, 70], [-40, -380, 95], [110, -350, 60]]) {
      const p = new THREE.Mesh(new THREE.ConeGeometry(s, s * 0.9, 4), pyrMat);
      p.position.set(x, s * 0.45 - 4, z); p.rotation.y = Math.PI / 4; this.add(p);
    }
    // stage: deck + truss pyramid with LED edges chasing to the apex
    const deck = new THREE.Mesh(new THREE.BoxGeometry(30, 1.2, 16), A.mats.dark);
    deck.position.set(0, 0.6, -24); this.add(deck);
    const base = [V(-12, 1.2, -16.5), V(12, 1.2, -16.5), V(12, 1.2, -31.5), V(-12, 1.2, -31.5)];
    this.edges = [];
    for (let i = 0; i < 4; i++) {
      this.trussBeam(base[i], apex);
      this.trussBeam(base[i], base[(i + 1) % 4]);
      const seg = 12;
      for (let k = 0; k < seg; k++) {
        const a = base[i].clone().lerp(apex, k / seg), b = base[i].clone().lerp(apex, (k + 0.9) / seg);
        const mm = this.glow();
        this.add(tube(a.add(V(0, 0.25, 0)), b.add(V(0, 0.25, 0)), 0.07, mm));
        this.edges.push({ m: mm, k: k / seg });
      }
    }
    // triangular LED on the back face
    const tri = makeLED(20, 17, 48, ctx.spectrum, ctx.titleTex);
    const shape = new THREE.Shape([new THREE.Vector2(-10, 0), new THREE.Vector2(10, 0), new THREE.Vector2(0, 17)]);
    const sg = new THREE.ShapeGeometry(shape);
    const uv = sg.attributes.uv, p2 = sg.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (p2.getX(i) + 10) / 20, p2.getY(i) / 17);
    tri.geometry = sg;
    tri.position.set(0, 1.3, -31); this.leds.push(tri); this.add(tri);
    this.booth(0, 1.2, -21);
    const heads = [];
    for (let i = 0; i < 10; i++) { const x = -13.5 + i * 3; heads.push({ x, y: 1.2, z: -16, az: x * -0.02, el: 1.15, flip: x < 0 }); }
    this.movingHeads(heads, { length: 50, radius: 2.6 });
    this.lasers([
      { p: apex.clone().add(V(0, 0.4, 0)), k: 18, az: 0, el: -0.32, spread: 2.4, alt: true },
      { p: V(-12, 1.6, -16.5), k: 5, az: 0.5, el: 0.15, spread: 0.6 },
      { p: V(12, 1.6, -16.5), k: 5, az: -0.5, el: 0.15, spread: 0.6, flip: true },
    ], { length: 140 });
    // a sky beacon from the apex on drops
    this.beacon = new BeamRig(1, { kind: 'laser', length: 400 });
    this.beacon.radius = 0.25;
    this.add(this.beacon.mesh);
    this.sheet(4.4, new THREE.Vector2(0, -22), 100);
    for (const x of [-14, -9, 9, 14]) this.emit.flames.push(V(x, 1.2, -16.3));
    for (const x of [-5, 5]) this.emit.co2.push(V(x, 1.2, -16.3));
    this.emit.fireworks.push(V(-40, 45, -90), V(40, 50, -90), V(0, 62, -120), V(-70, 40, -60), V(70, 40, -60));
    this.hazeArea = { min: [-22, 0.5, -30], max: [22, 12, 4], size: [8, 18] };
    const up = V(0, 1, 0);
    this.updaters.push((t, L, clock, a) => {
      for (const e of this.edges) {
        const ph = ((clock.beat * 0.5 - e.k) % 1 + 1) % 1;
        e.m.color.copy(L.colors[0]).multiplyScalar(0.5 + L.intensity * 1.5 + Math.pow(1 - ph, 6) * 6 * L.intensity + L.flash * 3);
      }
      const on = (L.section === 'drop' ? 1 : L.build * L.build) * L.laserLevel;
      this.beacon.set(0, apex, up, L.colors[2], on * 4, 400, 0.25);
      this.beacon.commit(t);
      const s = this.sky.material.uniforms;
      s.uTime.value = t; s.uC0.value.copy(L.colors[0]); s.uC1.value.copy(L.colors[1]);
      s.uBass.value = a ? a.v.bass : 0; s.uKick.value = a ? a.punch.kick : 0; s.uCorona.value = L.dropAge < 4 ? 1 - L.dropAge / 4 : 0;
      this.spill.intensity = 100 + L.intensity * 380 + L.flash * 1200; this.spill.color.copy(L.colors[0]);
    });
  }
}

// ================================================================ 4. cosmic (floating temple in a nebula)
export class Cosmic extends World {
  constructor(ctx) {
    super(ctx, 'cosmic');
    this.palette = 'cosmic';
    this.fog = { color: new THREE.Color(0x04020a), density: 0.004 };
    this.exposure = 0.85;
    this.anchors = { stage: V(0, 6, -20), dj: V(0, 2.9, -18.6), portal: V(0, 9, -20), crowd: { zNear: -9, zFar: 30, xHalf: 22 }, ceiling: 80 };
    const A = ctx.assets;
    this.sky = this.add(makeSky(2, ctx.spectrum));
    this.add(new THREE.HemisphereLight(0x402060, 0x050210, 0.6));
    this.spill = new THREE.PointLight(0xc04bff, 300, 80, 1.4); this.spill.position.set(0, 9, -20); this.add(this.spill);
    // hex platform with glowing grid
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(48, 44, 3, 6), this.mat(0x07060c, { metalness: 0.9, roughness: 0.25 }));
    plat.position.set(0, -1.5, 0); this.add(plat);
    this.gridMat = new THREE.LineBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.6 });
    const grid = new THREE.GridHelper(84, 42); grid.material = this.gridMat; grid.position.y = 0.02; this.add(grid);
    const centre = new THREE.Mesh(new THREE.CylinderGeometry(9, 9.5, 1.2, 48), A.mats.dark);
    centre.position.set(0, 0.6, -20); this.add(centre);
    // the core: wire icosphere + inner glow + orbit rings
    this.core = new THREE.Group(); this.core.position.set(0, 10, -20); this.add(this.core);
    this.coreWire = this.glow(); this.coreWire.wireframe = true;
    this.coreMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(3.4, 2), this.coreWire); this.core.add(this.coreMesh);
    this.coreIn = this.glow(); this.core.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 3), this.coreIn));
    this.orbits = [];
    for (let i = 0; i < 3; i++) {
      const m = this.glow();
      const r = new THREE.Mesh(new THREE.TorusGeometry(5.5 + i * 1.6, 0.05, 6, 140), m);
      r.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      this.core.add(r); this.orbits.push({ r, m, s: 0.2 + i * 0.13 });
    }
    // monoliths in a ring, floating
    this.monos = [];
    this.monoLines = this.glow();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const g = new THREE.Group();
      g.position.set(Math.sin(a) * 30, 0, -20 + Math.cos(a) * 30);
      g.rotation.y = a + Math.PI;
      g.add(A.mesh('monolith'), A.mesh('monolith_lines', this.monoLines));
      g.scale.setScalar(1.4);
      if (Math.cos(a) > 0.55) continue; // keep the crowd side open
      this.add(g); this.monos.push({ g, ph: Math.random() * 6 });
    }
    // hyperspace rings that rush toward the crowd in builds and drops
    this.rings = [];
    this.ringMat = this.glow();
    for (let i = 0; i < 18; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(26, 0.12, 6, 120), this.ringMat);
      r.position.set(0, 8, -160 + i * 11);
      this.add(r); this.rings.push(r);
    }
    this.booth(0, 1.2, -18);
    const heads = [];
    for (let i = 0; i < 10; i++) { const a = -1.3 + (i / 9) * 2.6; heads.push({ x: Math.sin(a) * 8.6, y: 1.2, z: -20 + Math.cos(a) * 8.6, az: a * 0.8, el: 1.05, flip: a < 0 }); }
    this.movingHeads(heads, { length: 46, radius: 2.4 });
    const em = [];
    for (let i = 0; i < 4; i++) em.push({ p: V(0, 10, -20), k: 6, az: -1.2 + i * 0.8, el: -0.15 + (i % 2) * 0.3, spread: 0.9, alt: i % 2 === 1 });
    this.lasers(em, { length: 120 });
    this.sheet(4.2, new THREE.Vector2(0, -20), 90);
    for (const a of [-1, -0.5, 0.5, 1]) this.emit.flames.push(V(Math.sin(a) * 9.2, 1.2, -20 + Math.cos(a) * 9.2));
    for (const a of [-0.25, 0.25]) this.emit.co2.push(V(Math.sin(a) * 9.2, 1.2, -20 + Math.cos(a) * 9.2));
    this.emit.fireworks.push(V(-30, 40, -60), V(30, 44, -60), V(0, 55, -80));
    this.hazeArea = { min: [-22, 0.5, -30], max: [22, 12, 6], size: [8, 16] };
    this.ringSpeed = 4;
    this.updaters.push((t, L, clock, a, dt) => {
      const bass = a ? a.v.bass : 0, kick = a ? a.punch.kick : 0;
      this.core.rotation.y += dt * (0.2 + L.intensity * 0.6);
      this.core.rotation.x = Math.sin(t * 0.3) * 0.3;
      this.coreMesh.scale.setScalar(1 + bass * 0.25 + kick * 0.15 + L.explode * 0.6);
      this.coreWire.color.copy(L.colors[0]).multiplyScalar(0.9 + L.intensity * 1.8);
      this.coreIn.color.copy(L.colors[1]).multiplyScalar(1 + kick * 3 + L.flash * 3);
      for (const o of this.orbits) { o.r.rotation.x += dt * o.s; o.r.rotation.z += dt * o.s * 0.7; o.m.color.copy(L.colors[2]).multiplyScalar(0.6 + L.intensity * 1.4); }
      for (const m of this.monos) m.g.position.y = 1 + Math.sin(t * 0.6 + m.ph) * 0.8 + L.explode * 3;
      this.monoLines.color.copy(L.colors[0]).multiplyScalar(1 + L.intensity * 3 * (0.6 + 0.4 * Math.sin(clock.beat * Math.PI)));
      this.gridMat.color.copy(L.colors[1]).multiplyScalar(0.25 + L.intensity * 0.6 + kick * 0.5);
      const target = L.section === 'drop' ? 70 : L.section === 'build' ? 10 + L.build * 50 : 4;
      this.ringSpeed += (target - this.ringSpeed) * Math.min(1, dt * 2);
      this.ringMat.color.copy(L.colors[0]).multiplyScalar(0.25 + L.intensity * 1.1);
      for (const r of this.rings) { r.position.z += this.ringSpeed * dt; if (r.position.z > 40) r.position.z -= 198; }
      const s = this.sky.material.uniforms;
      s.uTime.value = t; s.uC0.value.copy(L.colors[0]).multiplyScalar(0.6); s.uC1.value.copy(L.colors[1]).multiplyScalar(0.6);
      this.spill.intensity = 120 + L.intensity * 400 + L.flash * 1200; this.spill.color.copy(L.colors[0]);
    });
  }
}

export const WORLDS = {
  canyon: { cls: Canyon, name: 'وادي الصخر', key: '1' },
  warehouse: { cls: Warehouse, name: 'المخزن', key: '2' },
  eclipse: { cls: Eclipse, name: 'ليلة الكسوف', key: '3' },
  cosmic: { cls: Cosmic, name: 'المعبد الكوني', key: '4' },
};
