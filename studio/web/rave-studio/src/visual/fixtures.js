// Stage fixtures shared by every world: beam and laser rigs, the crowd, particles (pyro, sparks, CO2,
// fireworks), confetti, haze, LED screens, skies and the laser sheet ("liquid sky").
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  beamFrag, beamVert, crowdFrag, crowdVert, ledFrag, NOISE, pointsFrag, pointsVert, simpleVert, skyFrag, smokeFrag, smokeVert,
} from './shaders.js';

const UP = new THREE.Vector3(0, 1, 0);
const GREY = new THREE.Color(0.55, 0.58, 0.62);
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpD = new THREE.Vector3(), tmpE = new THREE.Euler();

// ---------------------------------------------------------------- beams & lasers
export class BeamRig {
  constructor(count, { kind = 'beam', length = 45, radius = 2.2, haze = 1 } = {}) {
    const geo = kind === 'laser'
      ? new THREE.CylinderGeometry(1, 1, 1, 5, 1, true)
      : new THREE.CylinderGeometry(1, 0.05, 1, 18, 1, true);
    geo.translate(0, 0.5, 0);
    this.colors = new Float32Array(count * 3);
    this.int = new Float32Array(count);
    this.colorAttr = new THREE.InstancedBufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage);
    this.intAttr = new THREE.InstancedBufferAttribute(this.int, 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aColor', this.colorAttr);
    geo.setAttribute('aIntensity', this.intAttr);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: beamVert, fragmentShader: beamFrag,
      uniforms: { uTime: { value: 0 }, uHaze: { value: haze }, uCore: { value: kind === 'laser' ? 1 : 0 }, uFadePow: { value: kind === 'laser' ? 0.5 : 1.3 } },
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.InstancedMesh(geo, this.mat, count);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
    this.count = count;
    this.length = length;
    this.radius = kind === 'laser' ? 0.03 : radius;
  }

  set(i, origin, dir, color, intensity, length = this.length, radius = this.radius) {
    tmpD.copy(dir).normalize();
    tmpQ.setFromUnitVectors(UP, tmpD);
    tmpS.set(radius, length, radius);
    tmpM.compose(origin, tmpQ, tmpS);
    this.mesh.setMatrixAt(i, tmpM);
    this.colors[i * 3] = color.r; this.colors[i * 3 + 1] = color.g; this.colors[i * 3 + 2] = color.b;
    this.int[i] = intensity;
  }

  commit(time) {
    this.mesh.instanceMatrix.needsUpdate = true;
    this.colorAttr.needsUpdate = true;
    this.intAttr.needsUpdate = true;
    this.mat.uniforms.uTime.value = time;
  }
}

// ---------------------------------------------------------------- crowd
export function fallbackPerson() {
  const parts = [];
  const add = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); parts.push(g); };
  add(0.13, 0.86, 0.15, -0.095, 0.43, 0); add(0.13, 0.86, 0.15, 0.095, 0.43, 0);
  add(0.32, 0.3, 0.2, 0, 1.0, 0); add(0.4, 0.32, 0.22, 0, 1.3, 0);
  const head = new THREE.IcosahedronGeometry(0.115, 1); head.translate(0, 1.62, 0); parts.push(head.toNonIndexed ? head : head);
  add(0.085, 0.64, 0.09, -0.255, 1.1, 0); add(0.085, 0.64, 0.09, 0.255, 1.1, 0);
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
}

export class Crowd {
  constructor(personGeo, max) {
    const g = personGeo.clone();
    const pos = g.attributes.position;
    const arm = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      arm[i] = Math.abs(x) > 0.215 && y < 1.47 && y > 0.7 ? Math.sign(x) : 0;
    }
    g.setAttribute('aArm', new THREE.BufferAttribute(arm, 1));
    const rnd = new Float32Array(max * 3);
    for (let i = 0; i < rnd.length; i++) rnd[i] = Math.random();
    g.setAttribute('aRand', new THREE.InstancedBufferAttribute(rnd, 3));
    this.mat = new THREE.ShaderMaterial({
      vertexShader: crowdVert, fragmentShader: crowdFrag,
      uniforms: {
        uTime: { value: 0 }, uBeat: { value: 0 }, uJump: { value: 0 }, uArms: { value: 0 }, uSway: { value: 1 },
        uStage: { value: new THREE.Vector3(0, 6, -20) }, uRimA: { value: new THREE.Color() }, uRimB: { value: new THREE.Color() },
        uRim: { value: 1 }, uFlash: { value: 0 }, uFog: { value: new THREE.Color(0x000000) }, uFogD: { value: 0.01 },
      },
    });
    this.mesh = new THREE.InstancedMesh(g, this.mat, max);
    this.mesh.frustumCulled = false;
    this.max = max;
    this.spots = [];
    // phone screens held up during breakdowns
    this.phoneGeo = new THREE.BufferGeometry();
    this.phonePos = new Float32Array(max * 3);
    this.phoneCol = new Float32Array(max * 4);
    this.phoneSize = new Float32Array(max);
    this.phoneGeo.setAttribute('position', new THREE.BufferAttribute(this.phonePos, 3));
    this.phoneGeo.setAttribute('aCol', new THREE.BufferAttribute(this.phoneCol, 4).setUsage(THREE.DynamicDrawUsage));
    this.phoneGeo.setAttribute('aSize', new THREE.BufferAttribute(this.phoneSize, 1));
    this.phones = new THREE.Points(this.phoneGeo, new THREE.ShaderMaterial({
      vertexShader: pointsVert, fragmentShader: pointsFrag, uniforms: { uScale: { value: 300 }, uSoft: { value: 1 } },
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.phones.frustumCulled = false;
  }

  // spots: [{x, z, yaw, s, y}]
  layout(spots) {
    this.spots = spots;
    const n = Math.min(spots.length, this.max);
    for (let i = 0; i < n; i++) {
      const p = spots[i];
      tmpE.set(0, p.yaw, 0); tmpQ.setFromEuler(tmpE); tmpS.set(p.s, p.s * (0.94 + ((i * 7919) % 13) / 100), p.s);
      tmpM.compose(new THREE.Vector3(p.x, p.y || 0, p.z), tmpQ, tmpS);
      this.mesh.setMatrixAt(i, tmpM);
      this.phonePos[i * 3] = p.x + Math.sin(i) * 0.15; this.phonePos[i * 3 + 1] = (p.y || 0) + 2.05 * p.s; this.phonePos[i * 3 + 2] = p.z;
      this.phoneSize[i] = 0.1;
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.phoneGeo.attributes.position.needsUpdate = true;
    this.phoneGeo.attributes.aSize.needsUpdate = true;
    this.setCount(this.count ?? n);
  }

  setCount(n) {
    this.count = n;
    const c = Math.min(n, this.spots.length, this.max);
    this.mesh.count = c;
    this.phoneGeo.setDrawRange(0, c);
  }

  update(t, look, clock) {
    const u = this.mat.uniforms;
    u.uTime.value = t;
    u.uBeat.value = clock.phase;
    u.uJump.value += (look.crowd.jump - u.uJump.value) * 0.1;
    u.uArms.value += (look.crowd.arms - u.uArms.value) * 0.04;
    u.uRimA.value.copy(look.colors[0]).multiplyScalar(look.crowd.rim);
    u.uRimB.value.copy(look.colors[1]).multiplyScalar(look.crowd.rim);
    u.uFlash.value = look.flash * 0.7 + look.blinder * 0.5;
    const ph = look.crowd.phones;
    if (ph > 0.01 || this.phonesOn) {
      this.phonesOn = ph > 0.01;
      const c = Math.min(this.mesh.count, this.max);
      for (let i = 0; i < c; i++) {
        const on = (i * 2654435761) % 100 < 22 ? 1 : 0;
        const fl = 0.7 + 0.3 * Math.sin(t * 3 + i);
        this.phoneCol[i * 4] = 0.75; this.phoneCol[i * 4 + 1] = 0.85; this.phoneCol[i * 4 + 2] = 1;
        this.phoneCol[i * 4 + 3] = on * ph * fl;
      }
      this.phoneGeo.attributes.aCol.needsUpdate = true;
    }
  }
}

// ---------------------------------------------------------------- particles (CPU simulated, GPU drawn)
const KINDS = {
  fire: { g: 5, drag: 0.94, s0: 1.6, s1: 3.6, life: [0.6, 1.0], cols: [[1, 0.95, 0.8], [1, 0.55, 0.1], [0.5, 0.08, 0.02]] },
  spark: { g: -9.8, drag: 0.995, s0: 0.22, s1: 0.08, life: [0.9, 1.8], cols: [[1, 1, 0.9], [1, 0.7, 0.3], [0.8, 0.3, 0.05]] },
  co2: { g: -0.6, drag: 0.93, s0: 1.2, s1: 6.5, life: [1.1, 1.7], cols: [[0.9, 0.95, 1], [0.7, 0.75, 0.8], [0.4, 0.42, 0.45]], alpha: 0.32 },
  firework: { g: -3.5, drag: 0.975, s0: 0.7, s1: 0.25, life: [1.4, 2.4], cols: null },
  mote: { g: 0.05, drag: 1, s0: 0.12, s1: 0.12, life: [6, 10], cols: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], alpha: 0.25 },
};

export class Particles {
  constructor(max) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 4);
    this.size = new Float32Array(max);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max).fill(1);
    this.kind = new Array(max).fill(null);
    this.tint = new Float32Array(max * 3);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aCol', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.points = new THREE.Points(this.geo, new THREE.ShaderMaterial({
      vertexShader: pointsVert, fragmentShader: pointsFrag, uniforms: { uScale: { value: 400 }, uSoft: { value: 1 } },
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.points.frustumCulled = false;
    this.points.renderOrder = 6;
    this.cursor = 0;
    this.alive = 0;
  }

  setScale(px) { this.points.material.uniforms.uScale.value = px; }

  emit(kind, n, x, y, z, spread, vel, tint) {
    const K = KINDS[kind];
    for (let k = 0; k < n; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.max;
      this.kind[i] = K;
      this.pos[i * 3] = x + (Math.random() - 0.5) * spread[0];
      this.pos[i * 3 + 1] = y + (Math.random() - 0.5) * spread[1];
      this.pos[i * 3 + 2] = z + (Math.random() - 0.5) * spread[2];
      const v = typeof vel === 'function' ? vel(k) : vel;
      this.vel[i * 3] = v[0]; this.vel[i * 3 + 1] = v[1]; this.vel[i * 3 + 2] = v[2];
      this.maxLife[i] = this.life[i] = K.life[0] + Math.random() * (K.life[1] - K.life[0]);
      if (tint) { this.tint[i * 3] = tint.r; this.tint[i * 3 + 1] = tint.g; this.tint[i * 3 + 2] = tint.b; }
    }
  }

  // a fire column (flame thrower) at x,z
  flame(x, y, z, power = 1) {
    this.emit('fire', Math.round(70 * power), x, y, z, [0.5, 0.3, 0.5], () => [(Math.random() - 0.5) * 1.2, 11 + Math.random() * 7 * power, (Math.random() - 0.5) * 1.2]);
    this.emit('spark', Math.round(25 * power), x, y + 1, z, [0.4, 0.4, 0.4], () => [(Math.random() - 0.5) * 6, 8 + Math.random() * 10, (Math.random() - 0.5) * 6]);
  }

  co2(x, y, z, dir = [0, 1, 0]) {
    this.emit('co2', 60, x, y, z, [0.3, 0.3, 0.3], () => {
      const s = 14 + Math.random() * 8;
      return [dir[0] * s + (Math.random() - 0.5) * 3, dir[1] * s, dir[2] * s + (Math.random() - 0.5) * 3];
    });
  }

  firework(x, y, z, color) {
    const n = 140;
    this.emit('firework', n, x, y, z, [0.2, 0.2, 0.2], () => {
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u), s = 9 + Math.random() * 2;
      return [r * Math.cos(th) * s, u * s, r * Math.sin(th) * s];
    }, color);
  }

  motes(count, box) {
    for (let k = 0; k < count; k++) {
      this.emit('mote', 1, box[0] + Math.random() * (box[3] - box[0]), box[1] + Math.random() * (box[4] - box[1]), box[2] + Math.random() * (box[5] - box[2]), [0, 0, 0],
        [(Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.2]);
    }
  }

  update(dt) {
    const P = this.pos, V = this.vel, C = this.col, S = this.size;
    let alive = 0;
    for (let i = 0; i < this.max; i++) {
      const K = this.kind[i];
      if (!K) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.kind[i] = null; C[i * 4 + 3] = 0; S[i] = 0; continue; }
      alive++;
      const a = 1 - this.life[i] / this.maxLife[i];
      const d = Math.pow(K.drag, dt * 60);
      V[i * 3] *= d; V[i * 3 + 1] = V[i * 3 + 1] * d + K.g * dt; V[i * 3 + 2] *= d;
      P[i * 3] += V[i * 3] * dt; P[i * 3 + 1] += V[i * 3 + 1] * dt; P[i * 3 + 2] += V[i * 3 + 2] * dt;
      S[i] = K.s0 + (K.s1 - K.s0) * a;
      let r, g, b;
      if (K.cols) {
        const c0 = a < 0.5 ? K.cols[0] : K.cols[1], c1 = a < 0.5 ? K.cols[1] : K.cols[2], f = a < 0.5 ? a * 2 : a * 2 - 1;
        r = c0[0] + (c1[0] - c0[0]) * f; g = c0[1] + (c1[1] - c0[1]) * f; b = c0[2] + (c1[2] - c0[2]) * f;
      } else {
        const w = Math.max(0, 1 - a * 3);
        r = this.tint[i * 3] + w; g = this.tint[i * 3 + 1] + w; b = this.tint[i * 3 + 2] + w;
      }
      const al = (K.alpha ?? 1) * (a < 0.08 ? a / 0.08 : 1) * (1 - a) * (K === KINDS.mote ? Math.min(1, this.life[i]) : 1);
      C[i * 4] = r; C[i * 4 + 1] = g; C[i * 4 + 2] = b; C[i * 4 + 3] = al * (K === KINDS.firework ? 1.6 : 1);
    }
    this.alive = alive;
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aCol.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- confetti (tumbling paper)
export class Confetti {
  constructor(max) {
    this.max = max;
    const g = new THREE.PlaneGeometry(0.09, 0.05);
    this.mesh = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), max);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.mesh.frustumCulled = false;
    this.p = new Float32Array(max * 3); this.v = new Float32Array(max * 3); this.r = new Float32Array(max * 3); this.w = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.mesh.count = 0;
    this.active = 0;
  }

  burst(x, y, z, colors) {
    const c = new THREE.Color();
    for (let i = 0; i < this.max; i++) {
      this.p[i * 3] = x + (Math.random() - 0.5) * 16; this.p[i * 3 + 1] = y + Math.random() * 2; this.p[i * 3 + 2] = z + (Math.random() - 0.5) * 6;
      this.v[i * 3] = (Math.random() - 0.5) * 6; this.v[i * 3 + 1] = 6 + Math.random() * 10; this.v[i * 3 + 2] = 6 + Math.random() * 12;
      for (let k = 0; k < 3; k++) { this.r[i * 3 + k] = Math.random() * 6; this.w[i * 3 + k] = (Math.random() - 0.5) * 12; }
      this.life[i] = 7 + Math.random() * 3;
      c.copy(colors[i % colors.length]).offsetHSL(0, 0, (Math.random() - 0.5) * 0.2);
      if (i % 5 === 0) c.setRGB(1, 1, 1);
      this.mesh.setColorAt(i, c);
    }
    this.mesh.instanceColor.needsUpdate = true;
    this.mesh.count = this.max;
    this.active = 10;
  }

  update(dt) {
    if (this.active <= 0) { this.mesh.count = 0; return; }
    this.active -= dt;
    for (let i = 0; i < this.max; i++) {
      this.life[i] -= dt;
      const vy = this.v[i * 3 + 1];
      this.v[i * 3] *= 0.985; this.v[i * 3 + 2] *= 0.985;
      this.v[i * 3 + 1] = Math.max(-1.6, vy - 9.8 * dt * (vy > 0 ? 1 : 0.15));
      this.p[i * 3] += (this.v[i * 3] + Math.sin(this.r[i * 3] * 2) * 0.6) * dt;
      this.p[i * 3 + 1] += this.v[i * 3 + 1] * dt;
      this.p[i * 3 + 2] += this.v[i * 3 + 2] * dt;
      for (let k = 0; k < 3; k++) this.r[i * 3 + k] += this.w[i * 3 + k] * dt;
      tmpE.set(this.r[i * 3], this.r[i * 3 + 1], this.r[i * 3 + 2]);
      tmpQ.setFromEuler(tmpE);
      const s = this.p[i * 3 + 1] < 0 || this.life[i] < 0 ? 0 : 1;
      tmpS.set(s, s, s);
      tmpM.compose(tmpD.set(this.p[i * 3], this.p[i * 3 + 1], this.p[i * 3 + 2]), tmpQ, tmpS);
      this.mesh.setMatrixAt(i, tmpM);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- haze
export class Haze {
  constructor(count, area) {
    const g = new THREE.PlaneGeometry(1, 1);
    const data = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      data[i * 4] = area.size[0] + Math.random() * (area.size[1] - area.size[0]);
      data[i * 4 + 1] = (Math.random() - 0.5) * 0.06;
      data[i * 4 + 2] = Math.random();
      data[i * 4 + 3] = 0.5 + Math.random() * 0.5;
    }
    g.setAttribute('aSmoke', new THREE.InstancedBufferAttribute(data, 4));
    this.mat = new THREE.ShaderMaterial({
      vertexShader: smokeVert, fragmentShader: smokeFrag,
      uniforms: { uTime: { value: 0 }, uColA: { value: new THREE.Color() }, uColB: { value: new THREE.Color() }, uDensity: { value: 0.5 } },
      transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    this.mesh = new THREE.InstancedMesh(g, this.mat, count);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 4;
    for (let i = 0; i < count; i++) {
      tmpM.makeTranslation(area.min[0] + Math.random() * (area.max[0] - area.min[0]), area.min[1] + Math.random() * (area.max[1] - area.min[1]), area.min[2] + Math.random() * (area.max[2] - area.min[2]));
      this.mesh.setMatrixAt(i, tmpM);
    }
  }

  update(t, look) {
    const u = this.mat.uniforms;
    u.uTime.value = t;
    u.uDensity.value = look.haze * (0.35 + 0.25 * look.intensity);
    u.uColA.value.copy(look.colors[0]).lerp(GREY, 0.45).multiplyScalar(0.3 + look.beamLevel * 0.5);
    u.uColB.value.copy(look.colors[1]).lerp(GREY, 0.45).multiplyScalar(0.22 + look.flash * 1.5);
  }
}

// ---------------------------------------------------------------- LED screen, sky, laser sheet
export function makeLED(w, h, dots, spectrum, title) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: simpleVert, fragmentShader: ledFrag,
    uniforms: {
      uTime: { value: 0 }, uProg: { value: 1 }, uBeat: { value: 0 }, uKick: { value: 0 }, uBass: { value: 0 }, uHigh: { value: 0 },
      uC0: { value: new THREE.Color() }, uC1: { value: new THREE.Color() }, uC2: { value: new THREE.Color() },
      uAspect: { value: w / h }, uIntensity: { value: 1 }, uDots: { value: dots }, uSpectrum: { value: spectrum },
      uTitle: { value: title }, uTitleOn: { value: 0 },
    },
    toneMapped: false,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.userData.led = true;
  return m;
}

export function updateLED(mesh, t, look, a) {
  const u = mesh.material.uniforms;
  u.uTime.value = t * look.ledSpeed;
  u.uProg.value = look.ledProgram;
  u.uBeat.value = look.beat;
  u.uKick.value = a.punch.kick; u.uBass.value = a.v.bass; u.uHigh.value = a.v.high;
  u.uC0.value.copy(look.colors[0]); u.uC1.value.copy(look.colors[1]); u.uC2.value.copy(look.colors[2]);
  u.uIntensity.value = look.led * (1 + look.flash * 2);
  u.uTitleOn.value = look.ledTitle;
}

export function makeSky(kind, spectrum) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: simpleVert, fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false,
    uniforms: {
      uTime: { value: 0 }, uKind: { value: kind }, uC0: { value: new THREE.Color() }, uC1: { value: new THREE.Color() },
      uBass: { value: 0 }, uKick: { value: 0 }, uCorona: { value: 0 }, uSunDir: { value: new THREE.Vector3(0, 0.3, -1) }, uSpectrum: { value: spectrum },
    },
    toneMapped: false,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(450, 48, 24), mat);
  m.renderOrder = -10;
  m.frustumCulled = false;
  return m;
}

export function makeLaserSheet(size) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: simpleVert,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uCol; uniform float uI; uniform vec2 uOrigin;
      varying vec2 vUv; varying vec3 vW;
      ${NOISE}
      void main(){
        vec2 p = vW.xz - uOrigin;
        float d = length(p);
        float ripple = .5 + .5*sin(d*1.6 - uTime*3. + fbm(vW.xz*.15 + uTime*.2)*6.);
        float edge = smoothstep(${(size / 2).toFixed(1)}, ${(size / 3).toFixed(1)}, d);
        float a = (.18 + .5*pow(ripple, 6.)) * edge * uI * (.6 + .4*fbm(vW.xz*.4 - uTime*.3));
        gl_FragColor = vec4(uCol * a, 1.);
      }`,
    uniforms: { uTime: { value: 0 }, uCol: { value: new THREE.Color() }, uI: { value: 0 }, uOrigin: { value: new THREE.Vector2() } },
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size, 1, 1), mat);
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 6;
  return m;
}

// glowing tube between two points (neon, LED strips)
export function tube(a, b, r, mat) {
  const d = new THREE.Vector3().subVectors(b, a);
  const g = new THREE.CylinderGeometry(r, r, d.length(), 8, 1, true);
  const m = new THREE.Mesh(g, mat);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
  return m;
}

// instance a geometry along a list of matrices
export function instanced(geo, mat, matrices) {
  const m = new THREE.InstancedMesh(geo, mat, matrices.length);
  matrices.forEach((mm, i) => m.setMatrixAt(i, mm));
  m.instanceMatrix.needsUpdate = true;
  return m;
}

export function trsMatrix(x, y, z, rx = 0, ry = 0, rz = 0, s = 1, sy = s, sz = s) {
  tmpE.set(rx, ry, rz);
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(tmpE), new THREE.Vector3(s, sy, sz));
}
