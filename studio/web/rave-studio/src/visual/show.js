// The lighting desk. Every frame it turns the music (clock, section, bands) plus the operator's masters,
// chase choice and held flash buttons into one "look" that every world and fixture reads.
import * as THREE from 'three';

export const PALETTES = {
  canyon: { name: 'غروب الوادي', c: ['#ff7a1a', '#2f6bff', '#ffd2a0'] },
  laser: { name: 'ليزر سماوي', c: ['#33e1ff', '#2747ff', '#e8fbff'] },
  sodium: { name: 'صوديوم', c: ['#ff8a2a', '#ff3b1f', '#ffe0b0'] },
  eclipse: { name: 'كسوف', c: ['#ffb347', '#7357ff', '#fff1d6'] },
  cosmic: { name: 'كوني', c: ['#c04bff', '#22e3ff', '#ff4fa3'] },
  emerald: { name: 'زمرّد', c: ['#25ff8a', '#0098ff', '#eaffef'] },
  crimson: { name: 'قرمزي', c: ['#ff2a4f', '#ff9a3c', '#ffe1e6'] },
  white: { name: 'أبيض نقي', c: ['#ffffff', '#9fb4ff', '#ffffff'] },
};

export const CHASES = {
  auto: 'تلقائي', sweep: 'كنس', fan: 'مروحة', chase: 'مطاردة', wave: 'موجة', tunnel: 'نفق', ballyhoo: 'دوائر', random: 'عشوائي', still: 'ثابت',
};

// section → base look (before masters)
const PROGRAM = {
  idle: { i: 0.35, beam: 0.45, laser: 0.0, led: 0.45, jump: 0.1, arms: 0.05, phones: 0, sheet: 0, chase: 'sweep', laserChase: 'fan', ledProg: 7, haze: 0.6 },
  intro: { i: 0.55, beam: 0.6, laser: 0.25, led: 0.6, jump: 0.35, arms: 0.15, phones: 0, sheet: 0, chase: 'sweep', laserChase: 'fan', ledProg: 1, haze: 0.6 },
  main: { i: 0.8, beam: 0.85, laser: 0.6, led: 0.85, jump: 0.7, arms: 0.35, phones: 0, sheet: 0, chase: 'wave', laserChase: 'fan', ledProg: 2, haze: 0.65 },
  build: { i: 0.6, beam: 0.8, laser: 0.55, led: 0.8, jump: 0.35, arms: 0.3, phones: 0, sheet: 0, chase: 'tunnel', laserChase: 'tunnel', ledProg: 4, haze: 0.8 },
  drop: { i: 1, beam: 1, laser: 1, led: 1, jump: 1, arms: 1, phones: 0, sheet: 0, chase: 'chase', laserChase: 'fan', ledProg: 1, haze: 0.75 },
  break: { i: 0.35, beam: 0.45, laser: 0.0, led: 0.45, jump: 0.05, arms: 0.55, phones: 0.9, sheet: 0.85, chase: 'wave', laserChase: 'sheet', ledProg: 7, haze: 0.9 },
  outro: { i: 0.6, beam: 0.6, laser: 0.35, led: 0.6, jump: 0.5, arms: 0.2, phones: 0, sheet: 0, chase: 'sweep', laserChase: 'fan', ledProg: 6, haze: 0.6 },
};
const DROP_ROTATION = [1, 5, 2, 6, 8, 3];

const lerp = (a, b, k) => a + (b - a) * k;

export class Show {
  constructor(state) {
    this.state = state;
    this.held = {};
    this.listeners = [];
    this.dropAge = 99;
    this.flashDecay = 0;
    this.glitchT = 0;
    this.colors = [new THREE.Color(), new THREE.Color(), new THREE.Color()];
    this.cur = { ...PROGRAM.idle };
    this.look = {
      colors: this.colors, intensity: 0.4, beamLevel: 0.5, laserLevel: 0, chase: 'sweep', laserChase: 'fan', beamSpeed: 1,
      strobe: 0, blinder: 0, flash: 0, black: 0, glitch: 0, led: 0.5, ledProgram: 1, ledSpeed: 1, ledTitle: 0, haze: 0.6,
      crowd: { jump: 0, arms: 0, phones: 0, rim: 1 }, sheet: 0, build: 0, section: 'idle', beat: 0, bar: 0, explode: 0, dropAge: 99, pyro: 0,
    };
    this.lastSection = 'idle';
    this.lastBar = -1;
  }

  on(fn) { this.listeners.push(fn); }
  fire(kind, data) { for (const f of this.listeners) f(kind, data); if (kind === 'drop') { this.dropAge = 0; this.flashDecay = 1; this.glitchT = 0.35; } }
  hold(name, on) { this.held[name] = on; }

  setPalette(key) {
    const p = PALETTES[key] || PALETTES.canyon;
    this.state.colors = [...p.c];
    this.state.palette = key;
  }

  update(dt, t, clock, a) {
    const S = this.state, L = this.look, M = S.master;
    const sec = clock.playing ? clock.section || 'main' : 'idle';
    if (sec !== this.lastSection) {
      if (sec === 'drop' && S.autoDrop && this.dropAge > 4) this.fire('drop', { auto: true });
      if (sec === 'break') this.fire('break');
      if (sec === 'build') this.fire('build');
      this.lastSection = sec;
    }
    // phrase events in a drop: pyro every 8 bars, confetti on the second phrase
    if (clock.bar !== this.lastBar) {
      this.lastBar = clock.bar;
      if (sec === 'drop' && clock.bar % 8 === 0 && this.dropAge > 3 && S.autoPyro) this.fire('pyro');
      if (sec === 'drop' && clock.bar % 4 === 0) this.fire('bar4');
      this.fire('bar', clock.bar);
    }
    const P = PROGRAM[sec] || PROGRAM.main;
    const k = Math.min(1, dt * 2.5);
    for (const key of ['i', 'beam', 'laser', 'led', 'jump', 'arms', 'phones', 'sheet', 'haze']) this.cur[key] = lerp(this.cur[key], P[key], k);
    const build = sec === 'build' ? clock.sectionProgress : 0;
    L.build = build;
    L.section = sec;
    L.beat = clock.phase;
    L.bar = clock.bar;
    this.dropAge += dt;
    L.dropAge = this.dropAge;

    // colours: palette (+ optional slow colour drift every phrase)
    const pc = S.colors;
    for (let i = 0; i < 3; i++) this.colors[i].set(pc[i]);
    if (S.colorDrift && clock.playing) {
      const phrase = Math.floor(clock.bar / 8);
      if (phrase % 2 === 1) { const tmp = this.colors[0].clone(); this.colors[0].copy(this.colors[1]); this.colors[1].copy(tmp); }
    }

    const manual = S.program === 'manual';
    const kick = a ? a.punch.kick : 0;
    const energy = a ? Math.min(1, a.v.kick * 0.6 + a.v.bass * 0.3 + a.v.high * 0.3) : 0.3;
    L.intensity = (manual ? 0.85 : this.cur.i + build * 0.4) * (0.75 + 0.35 * energy);
    L.beamLevel = (manual ? 1 : this.cur.beam) * M.beams * (0.7 + 0.5 * kick);
    L.laserLevel = (manual ? 1 : this.cur.laser + build * 0.4) * M.lasers;
    if (this.held.laser) L.laserLevel = Math.max(L.laserLevel, M.lasers);
    L.chase = S.chase !== 'auto' ? S.chase : P.chase;
    L.laserChase = S.laserChase !== 'auto' ? S.laserChase : this.held.laser ? 'fan' : P.laserChase;
    if (sec === 'drop' && S.chase === 'auto') L.chase = ['chase', 'wave', 'fan', 'ballyhoo'][Math.floor(clock.bar / 4) % 4];
    L.beamSpeed = S.speed;
    L.haze = this.cur.haze * M.haze;
    L.sheet = (L.laserChase === 'sheet' ? Math.max(this.cur.sheet, 0.7) : this.cur.sheet) * M.lasers;
    L.led = (manual ? 1 : this.cur.led) * M.led * (0.8 + 0.4 * kick);
    L.ledProgram = S.ledProgram > 0 ? S.ledProgram : sec === 'drop' ? DROP_ROTATION[Math.floor(clock.bar / 4) % DROP_ROTATION.length] : P.ledProg;
    L.ledSpeed = S.speed;
    L.ledTitle = S.titles.onLed ? (sec === 'break' || sec === 'idle' || sec === 'intro' ? 1 : 0.0) : 0;
    L.crowd.jump = this.cur.jump * M.crowd;
    L.crowd.arms = Math.max(this.cur.arms + build * 0.6, this.held.blinder ? 1 : 0) * M.crowd;
    L.crowd.phones = this.cur.phones * M.crowd;
    L.crowd.rim = 0.4 + L.intensity * 0.9;

    // strobe: held button, or automatic in builds / drop offbeats
    const safe = S.safe;
    let strobeRate = 0, strobeAmt = 0;
    if (this.held.strobe) { strobeRate = safe ? 1 : 4; strobeAmt = 1; }
    else if (!manual && sec === 'build' && build > 0.5) { strobeRate = build > 0.875 ? 4 : build > 0.75 ? 2 : 1; strobeAmt = (build - 0.5) * 2 * 0.7; if (safe) strobeRate = Math.min(strobeRate, 1); }
    else if (!manual && sec === 'drop' && a && a.v.high > 0.85 && this.dropAge > 2) { strobeRate = safe ? 0.5 : 2; strobeAmt = 0.35; }
    let strobe = 0;
    if (strobeRate) {
      const ph = (clock.beat * strobeRate) % 1;
      strobe = ph < 0.22 ? strobeAmt : 0;
    }
    L.strobe = strobe * M.strobe;
    L.blinder = this.held.blinder ? 1 : sec === 'drop' && clock.phase < 0.12 && clock.bar % 2 === 0 ? 0.4 * M.blinders : 0;
    L.blinder *= M.blinders;
    this.flashDecay = Math.max(0, this.flashDecay - dt * 3.2);
    L.flash = Math.min(safe ? 0.3 : 0.85, L.strobe * 0.5 + this.flashDecay * this.flashDecay * 0.6) * (safe ? 0.5 : 1);
    L.black = this.held.blackout ? 0.94 : 0;
    this.glitchT = Math.max(0, this.glitchT - dt);
    L.glitch = Math.max(this.held.glitch ? 0.8 : 0, this.glitchT > 0 ? 0.5 : 0);
    // gate explodes on the drop and reassembles over ~2 bars
    const spb = 60 / (clock.bpm || 138);
    const age = this.dropAge / (spb * 8);
    L.explode = age < 1 ? Math.pow(Math.sin(Math.min(1, age) * Math.PI), 0.7) * (age < 0.15 ? age / 0.15 : 1) : 0;
    L.pyro = M.pyro;
    return L;
  }
}

// Pan/tilt offsets (radians) for fixture i of n, for a chase pattern. Beat-synced.
export function aim(pattern, i, n, beat, look, out) {
  const x = n > 1 ? i / (n - 1) - 0.5 : 0;
  const B = beat * look.beamSpeed;
  let dp = 0, dt = 0;
  switch (pattern) {
    case 'sweep': dp = 0.55 * Math.sin((B / 8) * Math.PI * 2); dt = 0.08 * Math.sin((B / 4) * Math.PI * 2); break;
    case 'fan': dp = x * 1.6 * (0.55 + 0.45 * Math.sin((B / 4) * Math.PI * 2)); dt = 0.12 * Math.sin((B / 2) * Math.PI * 2); break;
    case 'chase': { const s = (i + Math.floor(B)) % 2 ? 1 : -1; const e = Math.min(1, (B % 1) * 4); dp = s * 0.45 * e + x * 0.6; dt = -0.1 * s * e; break; }
    case 'wave': dp = 0.5 * Math.sin((B / 4) * Math.PI * 2 + i * 0.7); dt = 0.22 * Math.sin((B / 2) * Math.PI * 2 + i * 0.7); break;
    case 'tunnel': dp = -x * (1 - look.build) * 1.2; dt = 0.25 * look.build; break;
    case 'ballyhoo': dp = 0.6 * Math.sin((B / 4) * Math.PI * 2 + i); dt = 0.35 * Math.cos((B / 4) * Math.PI * 2 + i); break;
    case 'random': { const b = Math.floor(B); const h = Math.sin(i * 91.7 + b * 13.3) * 43758.5453; const r = h - Math.floor(h); dp = (r - 0.5) * 1.4; dt = (Math.sin(i * 17 + b * 7.1) * 0.5) * 0.5; break; }
    default: dp = x * 0.8;
  }
  out[0] = dp; out[1] = dt;
  return out;
}
