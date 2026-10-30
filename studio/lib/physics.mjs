// Deterministic rigid-body bake. Films render frames out of order, so a live world.step()
// inside render(t) is forbidden: the world runs once at a fixed 1/120 or 1/240 step,
// transforms are recorded per body, and sample(t) answers any frame time.
// Engine: @dimforge/rapier3d-compat (Apache-2.0). The fixed step, the blend between the
// previous state and the new one, auto colliders and sleeping follow pmndrs/react-three-rapier
// (MIT) — not a port of that React wrapper.
// When Rapier is not installed, bake() returns a labelled preview (semi-implicit Euler,
// ground bounce only). That preview is for tests and for the study badge, not for a delivery.

export const STEP_120 = 1 / 120;
export const STEP_240 = 1 / 240;
export const PREVIEW_LABEL = 'preview · semi-implicit Euler (not Rapier)';

const VENDOR = new URL('../vendor/node_modules/@dimforge/rapier3d-compat/dist/rapier.mjs', import.meta.url);

let rapierLoad;
export function loadRapier() {
  if (!rapierLoad) {
    rapierLoad = (async () => {
      let mod;
      try { mod = await import('@dimforge/rapier3d-compat'); }
      catch { mod = await import(VENDOR.href); }
      const R = mod.default?.World ? mod.default : mod;
      await (R.init ? R.init() : mod.init());
      return R.World ? R : mod;
    })();
    rapierLoad.catch(() => { rapierLoad = null; });
  }
  return rapierLoad;
}

export function fixedStep(step) {
  if (Math.abs(step - STEP_120) < 1e-12) return STEP_120;
  if (Math.abs(step - STEP_240) < 1e-12) return STEP_240;
  throw new Error('physics step must be 1/120 or 1/240');
}

// react-three-rapier autoColliderMap: cuboid, ball, hull → convexHull, trimesh.
// `size` is the full mesh size; Rapier cuboids take half-extents.
export function autoCollider(mesh) {
  const kind = mesh?.kind || mesh?.shape;
  if (kind === 'box' || kind === 'cuboid') {
    const [x, y, z] = mesh.size;
    return { shape: 'cuboid', args: [x / 2, y / 2, z / 2] };
  }
  if (kind === 'sphere' || kind === 'ball') return { shape: 'ball', args: [mesh.radius ?? mesh.size[0] / 2] };
  if (kind === 'hull' || kind === 'convexHull') return { shape: 'convexHull', args: mesh.points };
  if (kind === 'trimesh') return { shape: 'trimesh', args: { vertices: mesh.vertices, indices: mesh.indices } };
  throw new Error(`auto collider: unsupported mesh kind ${kind}`);
}

function shapeOf(body) {
  if (body.shape) return { shape: body.shape, args: body.args };
  if (body.mesh) return autoCollider(body.mesh);
  throw new Error(`body ${body.id || '?'} needs a shape or a mesh`);
}

function groundTop(spec) {
  const g = spec.ground || {};
  return (g.y ?? 0) + (g.hy ?? 0);
}

function clearance(body) {
  const s = shapeOf(body);
  if (s.shape === 'ball') return s.args[0];
  if (s.shape === 'cuboid') return s.args[1];
  return 0.2;
}

function normQ(q) {
  const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
}

function slerp(a, b, t) {
  let ax = a[0], ay = a[1], az = a[2], aw = a[3];
  let bx = b[0], by = b[1], bz = b[2], bw = b[3];
  let dot = ax * bx + ay * by + az * bz + aw * bw;
  if (dot < 0) { bx = -bx; by = -by; bz = -bz; bw = -bw; dot = -dot; }
  if (dot > 0.9995) return normQ([ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t, aw + (bw - aw) * t]);
  const theta = Math.acos(Math.min(1, dot)), s = Math.sin(theta);
  const w1 = Math.sin((1 - t) * theta) / s, w2 = Math.sin(t * theta) / s;
  return [ax * w1 + bx * w2, ay * w1 + by * w2, az * w1 + bz * w2, aw * w1 + bw * w2];
}

// q += dt * 0.5 * ω * q. Preview spin only; contact does not use the true swept box.
function integrateQuat(q, w, dt) {
  const [x, y, z, ww] = q, hx = w[0] * dt * 0.5, hy = w[1] * dt * 0.5, hz = w[2] * dt * 0.5;
  return normQ([
    x + ww * hx + y * hz - z * hy,
    y + ww * hy + z * hx - x * hz,
    z + ww * hz + x * hy - y * hx,
    ww - x * hx - y * hy - z * hz,
  ]);
}

function prepare(spec) {
  if (!spec?.bodies?.length) throw new Error('physics bake needs at least one body');
  const step = fixedStep(spec.step ?? STEP_120);
  const duration = Number(spec.duration);
  if (!(duration > 0) || duration > 30) throw new Error('physics duration must be within (0, 30] seconds');
  const ids = [];
  for (const b of spec.bodies) {
    if (!b.id || ids.includes(b.id)) throw new Error(`physics body id missing or duplicated (${b.id})`);
    ids.push(b.id);
    shapeOf(b);
  }
  const n = Math.round(duration / step);
  if (n < 1) throw new Error('physics duration is shorter than one step');
  return { step, n, ids, gravity: spec.gravity || [0, -9.81, 0] };
}

function num(n) {
  if (!Number.isFinite(n)) return 'nan';
  return Object.is(n, -0) ? '0' : String(n);
}

export function hashBake(clip) {
  let s = `${clip.engine}|${num(clip.step)}|${clip.frames.length}`;
  for (const frame of clip.frames) {
    for (const id of clip.ids) {
      const b = frame.bodies[id];
      s += `|${id}|${b.p.map(num).join(',')}|${b.q.map(num).join(',')}|${b.sleep ? 1 : 0}`;
    }
  }
  // FNV-1a 64. Same bytes in, same hex out, in the browser and in Node.
  let h = 0xcbf29ce484222325n, p = 0x100000001b3n;
  for (let i = 0; i < s.length; i++) { h ^= BigInt(s.charCodeAt(i)); h = (h * p) & 0xffffffffffffffffn; }
  return h.toString(16).padStart(16, '0');
}

function finish(engine, label, meta, frames) {
  const clip = { engine, label, step: meta.step, duration: meta.n * meta.step, ids: meta.ids, frames };
  clip.hash = hashBake(clip);
  return clip;
}

function snapshot(bodies, ids) {
  const out = {};
  for (const id of ids) {
    const b = bodies.get(id);
    out[id] = { p: b.p.slice(), q: b.q.slice(), sleep: !!b.sleep };
  }
  return { bodies: out };
}

// Semi-implicit Euler. Dynamic bodies bounce on the ground plane and can sleep.
// They do not collide with each other — a stack will not topple. That is why the label says preview.
export function bakeFallback(spec) {
  const meta = prepare(spec);
  const floor = groundTop(spec);
  const g = meta.gravity;
  const state = new Map();
  for (const b of spec.bodies) {
    state.set(b.id, {
      p: (b.position || [0, 0, 0]).slice(),
      v: (b.linvel || [0, 0, 0]).slice(),
      q: normQ(b.rotation || [0, 0, 0, 1]),
      w: (b.angvel || [0, 0, 0]).slice(),
      radius: clearance(b),
      restitution: b.restitution ?? 0.3,
      friction: b.friction ?? 0.4,
      fixed: b.type === 'fixed' || b.type === 'kinematic',
      canSleep: b.canSleep !== false,
      sleep: false,
      still: 0,
    });
  }
  const frames = [snapshot(state, meta.ids)];
  const dt = meta.step;
  for (let s = 0; s < meta.n; s++) {
    for (const b of state.values()) {
      if (b.fixed || b.sleep) continue;
      b.v[0] += g[0] * dt; b.v[1] += g[1] * dt; b.v[2] += g[2] * dt;
      b.p[0] += b.v[0] * dt; b.p[1] += b.v[1] * dt; b.p[2] += b.v[2] * dt;
      b.q = integrateQuat(b.q, b.w, dt);
      const y = floor + b.radius;
      if (b.p[1] <= y) {
        b.p[1] = y;
        if (b.v[1] < 0) b.v[1] = -b.restitution * b.v[1];
        const damp = Math.max(0, 1 - b.friction * dt * 10);
        b.v[0] *= damp; b.v[2] *= damp;
        b.w[0] *= damp; b.w[1] *= damp; b.w[2] *= damp;
      }
      const speed = Math.hypot(b.v[0], b.v[1], b.v[2], b.w[0], b.w[1], b.w[2]);
      if (b.canSleep && b.p[1] <= y + 1e-4 && speed < 0.08) {
        if (++b.still > 6) { b.sleep = true; b.v = [0, 0, 0]; b.w = [0, 0, 0]; }
      } else b.still = 0;
    }
    frames.push(snapshot(state, meta.ids));
  }
  return finish('fallback', PREVIEW_LABEL, meta, frames);
}

function vec(R, x, y, z) { return { x, y, z }; }

function rapierCollider(R, body) {
  const s = shapeOf(body);
  let desc;
  if (s.shape === 'cuboid') desc = R.ColliderDesc.cuboid(s.args[0], s.args[1], s.args[2]);
  else if (s.shape === 'ball') desc = R.ColliderDesc.ball(s.args[0]);
  else if (s.shape === 'convexHull') {
    const flat = Array.isArray(s.args[0]) ? s.args.flat() : s.args;
    desc = R.ColliderDesc.convexHull(new Float32Array(flat));
    if (!desc) throw new Error(`convexHull failed for ${body.id}`);
  } else if (s.shape === 'trimesh') desc = R.ColliderDesc.trimesh(new Float32Array(s.args.vertices), new Uint32Array(s.args.indices));
  else throw new Error(`shape ${s.shape} is not a Rapier collider`);
  return desc.setFriction(body.friction ?? 0.5).setRestitution(body.restitution ?? 0.2).setDensity(body.density ?? 1);
}

export async function bakeRapier(spec, R) {
  const api = R || await loadRapier();
  const meta = prepare(spec);
  const g = meta.gravity;
  const world = new api.World({ x: g[0], y: g[1], z: g[2] });
  try {
    world.timestep = meta.step;
    const ground = spec.ground || { hx: 8, hy: 0.2, hz: 8, y: -0.2 };
    const gBody = world.createRigidBody(api.RigidBodyDesc.fixed().setTranslation(0, ground.y ?? 0, 0).setCanSleep(true));
    world.createCollider(
      api.ColliderDesc.cuboid(ground.hx ?? 8, ground.hy ?? 0.2, ground.hz ?? 8)
        .setFriction(ground.friction ?? 0.8).setRestitution(ground.restitution ?? 0.1),
      gBody);
    const handles = [];
    for (const b of spec.bodies) {
      const [px, py, pz] = b.position || [0, 0, 0];
      const q = b.rotation || [0, 0, 0, 1];
      const kind = b.type === 'fixed' ? 'fixed' : b.type === 'kinematic' ? 'kinematicPositionBased' : 'dynamic';
      let desc = api.RigidBodyDesc[kind]()
        .setTranslation(px, py, pz)
        .setRotation({ x: q[0], y: q[1], z: q[2], w: q[3] })
        .setCanSleep(b.canSleep !== false)
        .setLinearDamping(b.linearDamping ?? 0.02)
        .setAngularDamping(b.angularDamping ?? 0.05);
      if (b.linvel) desc = desc.setLinvel(b.linvel[0], b.linvel[1], b.linvel[2]);
      if (b.angvel) desc = desc.setAngvel(vec(api, b.angvel[0], b.angvel[1], b.angvel[2]));
      const body = world.createRigidBody(desc);
      world.createCollider(rapierCollider(api, b), body);
      handles.push(body);
    }
    const frames = [];
    const snap = () => {
      const bodies = {};
      handles.forEach((body, i) => {
        const t = body.translation(), r = body.rotation();
        bodies[meta.ids[i]] = {
          p: [t.x, t.y, t.z],
          q: normQ([r.x, r.y, r.z, r.w]),
          sleep: body.isSleeping(),
        };
      });
      frames.push({ bodies });
    };
    snap();
    for (let s = 0; s < meta.n; s++) { world.timestep = meta.step; world.step(); snap(); }
    return finish('rapier', 'rapier', meta, frames);
  } finally { world.free(); }
}

export async function bake(spec, { engine } = {}) {
  if (engine === 'fallback') return bakeFallback(spec);
  try { return await bakeRapier(spec); }
  catch (error) {
    if (engine === 'rapier') throw error;
    const clip = bakeFallback(spec);
    clip.reason = String(error?.message || error);
    return clip;
  }
}

// alpha matches react-three-rapier's accumulator/timeStep blend. A sleeping interval
// keeps the settled pose (that wrapper skips mesh writes while the body sleeps).
export function sample(clip, t) {
  const { step, frames, ids } = clip;
  const last = frames.length - 1;
  const maxT = last * step;
  const u = Number.isFinite(t) ? t : 0;
  if (u <= 0) return { t: 0, alpha: 0, bodies: copyBodies(frames[0].bodies, ids) };
  if (u >= maxT) return { t: maxT, alpha: 1, bodies: copyBodies(frames[last].bodies, ids) };
  const f = u / step;
  const i = Math.floor(f);
  const alpha = f - i;
  const A = frames[i].bodies, B = frames[Math.min(last, i + 1)].bodies;
  const bodies = {};
  for (const id of ids) {
    const sleep = A[id].sleep && B[id].sleep;
    bodies[id] = {
      p: sleep ? B[id].p.slice() : A[id].p.map((v, k) => v + (B[id].p[k] - v) * alpha),
      q: sleep ? B[id].q.slice() : slerp(A[id].q, B[id].q, alpha),
      sleep,
    };
  }
  return { t: u, alpha, bodies };
}

function copyBodies(src, ids) {
  const bodies = {};
  for (const id of ids) bodies[id] = { p: src[id].p.slice(), q: src[id].q.slice(), sleep: src[id].sleep };
  return bodies;
}
