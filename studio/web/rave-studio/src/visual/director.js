// Camera director: eight shot types built from each world's anchors, an automatic director that cuts on
// bar lines following the song's structure, camera shake and lens punch, and a free orbit camera.
import * as THREE from 'three';

export const SHOTS = {
  front: 'الصف الأول', dj: 'خلف الدي جي', aerial: 'درون عالي', crane: 'كرين صاعد', dolly: 'تراك جانبي',
  orbit: 'مدار حول المسرح', fpv: 'درون غطس', wide: 'لقطة واسعة',
};

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const n1 = (t, s) => Math.sin(t * 1.3 + s) * 0.6 + Math.sin(t * 2.7 + s * 2) * 0.3 + Math.sin(t * 5.1 + s * 3) * 0.1;

export class Director {
  constructor(camera, post) {
    this.cam = camera;
    this.post = post;
    this.mode = 'auto'; // auto | shot | free
    this.shot = 'wide';
    this.shotStart = 0; // beat
    this.shotLen = 32; // beats
    this.seed = 1;
    this.pos = V(0, 6, 40);
    this.look = V(0, 6, -20);
    this.fovBase = 55;
    this.fovKick = 0;
    this.free = { az: 0, el: 0.18, r: 38, target: V(0, 5, -12) };
    this.keys = {};
    this.settings = { shake: 0.5, punch: 0.6, transition: 'auto', speed: 1, cutEvery: 'auto' };
    this.listeners = [];
  }

  onChange(fn) { this.listeners.push(fn); }
  notify() { for (const f of this.listeners) f(this.mode, this.shot); }

  setWorld(w) { this.world = w; this.A = w.anchors; }

  setMode(mode) { this.mode = mode; this.notify(); }

  // choose a transition for a cut (or the operator's fixed choice)
  pickTransition(reason) {
    const s = this.settings.transition;
    if (s !== 'auto') return s;
    if (reason === 'drop') return 'flash';
    if (reason === 'break') return 'dissolve';
    if (reason === 'build') return 'zoom';
    if (reason === 'world') return 'iris';
    return Math.random() < 0.18 ? 'whip' : 'cut';
  }

  cut(shot, clock, { beats = 32, reason = 'cut', trans, seconds } = {}) {
    const type = trans || this.pickTransition(reason);
    const secs = seconds || { dissolve: 1.6, flash: 0.6, whip: 0.35, iris: 0.9, zoom: 0.7, glitch: 0.45, slices: 0.6, luma: 1.2, pixel: 0.6, cut: 0.05 }[type] || 0.6;
    this.post.transition(type, secs, () => {
      this.shot = shot;
      this.shotStart = clock.beat;
      this.shotLen = beats;
      this.seed = Math.random() * 100;
      this.side = Math.random() < 0.5 ? -1 : 1;
      this.notify();
    });
  }

  // called by the app on section changes and bars
  onSection(sec, clock) {
    if (this.mode !== 'auto') return;
    if (sec === 'drop') this.cut('fpv', clock, { beats: 16, reason: 'drop' });
    else if (sec === 'break') this.cut(Math.random() < 0.5 ? 'wide' : 'crane', clock, { beats: 32, reason: 'break' });
    else if (sec === 'build') this.cut('front', clock, { beats: 32, reason: 'build' });
  }

  onBar(bar, clock, section) {
    if (this.mode !== 'auto') return;
    const into = clock.beat - this.shotStart;
    if (into < this.shotLen - 0.5) return;
    let pool, len;
    if (section === 'drop') { pool = ['front', 'dj', 'orbit', 'aerial', 'dolly', 'front', 'dj']; len = 8; }
    else if (section === 'break') { pool = ['wide', 'crane', 'aerial', 'orbit']; len = 32; }
    else if (section === 'build') { pool = ['dj', 'front']; len = 16; }
    else if (section === 'idle') { pool = ['wide', 'aerial', 'orbit', 'dolly']; len = 24; }
    else { pool = ['front', 'orbit', 'dolly', 'aerial', 'dj', 'wide']; len = 16; }
    if (this.settings.cutEvery !== 'auto') len = Number(this.settings.cutEvery) * 4;
    let next = pool[Math.floor(Math.random() * pool.length)];
    if (next === this.shot) next = pool[(pool.indexOf(next) + 1) % pool.length];
    this.cut(next, clock, { beats: len });
  }

  // drag / pinch / wheel → free camera (starting from the current view)
  grab() {
    if (this.mode !== 'free') {
      const d = new THREE.Vector3().subVectors(this.pos, this.look);
      this.free.r = d.length();
      this.free.az = Math.atan2(d.x, d.z);
      this.free.el = Math.asin(Math.max(-0.99, Math.min(0.99, d.y / this.free.r)));
      this.free.target.copy(this.look);
      this.setMode('free');
    }
  }
  orbitBy(dx, dy) { this.grab(); this.free.az -= dx * 0.005; this.free.el = Math.max(-0.05, Math.min(1.45, this.free.el + dy * 0.004)); }
  zoomBy(f) { this.grab(); this.free.r = Math.max(4, Math.min(140, this.free.r * f)); }

  update(dt, t, clock, look, a) {
    const A = this.A;
    if (!A) return;
    const p0 = Math.max(0, Math.min(1, (clock.beat - this.shotStart) / this.shotLen));
    const p = this.mode === 'shot' ? (Math.sin(((clock.beat - this.shotStart) / 32) * Math.PI - Math.PI / 2) + 1) / 2 : p0;
    const pos = V(0, 0, 0), tgt = V(0, 0, 0);
    let fov = 50, roll = 0;
    const S = this.side || 1, sd = this.seed;
    const st = A.stage, dj = A.dj, cr = A.crowd;
    switch (this.mode === 'free' ? 'free' : this.shot) {
      case 'front': {
        const push = look.section === 'build' ? ease(p) * 10 : p * 2;
        pos.set(S * (1 + (sd % 3)), 2.5, cr.zNear + 7 - push);
        tgt.set(dj.x, dj.y + 1.8, dj.z);
        fov = look.section === 'build' ? 58 - look.build * 16 : 56;
        break;
      }
      case 'dj':
        pos.set(dj.x + S * 1.4 + Math.sin(t * 0.3) * 0.3, dj.y + 1.1, dj.z - 2.6);
        tgt.set(S * -2, 2.2, cr.zNear + 18);
        fov = 62; break;
      case 'aerial': {
        const a0 = sd + p * 0.9 * S;
        pos.set(Math.sin(a0) * 34, Math.min(A.ceiling - 1, 26), (cr.zNear + cr.zFar) * 0.5 + Math.cos(a0) * 26);
        tgt.set(0, 2, st.z + 6);
        fov = 50; break;
      }
      case 'crane': {
        const e = ease(p);
        pos.set(S * 6 * (1 - e), 2 + e * Math.min(A.ceiling - 4, 15), cr.zNear + 24 - e * 10);
        tgt.set(0, st.y - 1 + e * 2, st.z);
        fov = 52; break;
      }
      case 'dolly': {
        const x = S * (-18 + p * 36);
        pos.set(x, 3.6, cr.zNear + 9);
        tgt.set(x * 0.35, st.y - 1.5, st.z);
        fov = 48; break;
      }
      case 'orbit': {
        const a0 = S * (0.9 - p * 1.8);
        pos.set(Math.sin(a0) * 17, 5.5 + Math.sin(p * Math.PI) * 2, st.z + Math.cos(a0) * 17);
        tgt.set(0, st.y - 1, st.z);
        fov = 54; break;
      }
      case 'fpv': {
        // dive from high behind the crowd, skim the heads, punch through the portal
        const e = Math.min(1, p * 1.15);
        const P = A.portal;
        const pts = [V(S * 6, Math.min(A.ceiling - 1, 24), cr.zFar), V(S * 2, 6, cr.zNear + 14), V(0, 3.4, cr.zNear + 2), V(P.x, P.y, P.z + 4), V(P.x, P.y + 0.5, P.z - 14)];
        const curve = this.fpvCurve || (this.fpvCurve = new THREE.CatmullRomCurve3(pts));
        curve.points = pts;
        curve.getPoint(Math.min(0.999, ease(e)), pos);
        curve.getPoint(Math.min(1, ease(e) + 0.04), tgt);
        roll = Math.sin(e * Math.PI * 2) * 0.12 * S;
        fov = 72; break;
      }
      case 'wide':
        pos.set(S * 4 * p, 7 + p * 1.5, cr.zFar + 12);
        tgt.set(0, st.y, st.z);
        fov = 44 - p * 4; break;
      case 'free': {
        const f = this.free;
        const mv = V((this.keys.d ? 1 : 0) - (this.keys.a ? 1 : 0), (this.keys.e ? 1 : 0) - (this.keys.q ? 1 : 0), (this.keys.s ? 1 : 0) - (this.keys.w ? 1 : 0));
        if (mv.lengthSq()) { mv.applyAxisAngle(V(0, 1, 0), f.az).multiplyScalar(dt * 14); f.target.add(mv); }
        pos.set(f.target.x + Math.sin(f.az) * Math.cos(f.el) * f.r, f.target.y + Math.sin(f.el) * f.r, f.target.z + Math.cos(f.az) * Math.cos(f.el) * f.r);
        tgt.copy(f.target);
        fov = 55; break;
      }
    }
    // handheld life + kick shake + lens punch on the drop
    const sh = this.settings.shake;
    const kick = a ? a.punch.kick : 0;
    if (this.mode !== 'free') {
      const hand = this.shot === 'front' || this.shot === 'dj' ? 0.08 : 0.03;
      pos.x += n1(t, 1) * hand * sh * 2; pos.y += n1(t, 5) * hand * sh * 2;
      tgt.x += n1(t * 0.8, 9) * hand * sh * 4;
    }
    const shake = kick * kick * sh * 0.12 * (look.section === 'drop' ? 1.5 : 0.6);
    pos.x += (Math.random() - 0.5) * shake; pos.y += (Math.random() - 0.5) * shake;
    if (look.dropAge < 0.1) this.fovKick = 14 * this.settings.punch;
    this.fovKick *= Math.pow(0.04, dt);
    const beatZoom = this.settings.punch * kick * 2.2 * (look.section === 'drop' ? 1 : 0.3);
    this.cam.position.copy(pos);
    this.cam.up.set(Math.sin(roll), Math.cos(roll), 0);
    this.cam.lookAt(tgt);
    this.cam.fov = fov + this.fovKick - beatZoom;
    this.cam.updateProjectionMatrix();
    this.pos.copy(pos); this.look.copy(tgt);
  }
}
