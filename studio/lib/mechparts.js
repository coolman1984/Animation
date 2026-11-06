// MECHPARTS — exact parametric machine parts as Three.js geometry, written for the studio (2026-11-06).
// Why our own: build123d / CadQuery (Apache-2.0) give true CAD but need a ~100 MB OpenCascade wheel and Python on the owner's PC.
// Films and sites need correct *visible* geometry: real involute gear teeth that mesh, bolt circles on a pitch diameter,
// a pump pocket that fits its gears. Ideas taken from build123d's design (LEARN, no code copied): parts are pure functions of
// named engineering parameters (module, teeth, pressure angle, pitch circle), assemblies are joints between parts, and every
// dimension is in one unit (here: scene units = millimetres / 10 by convention). When a client gives a STEP file, convert it
// in Blender/build123d to glTF instead; this file is for parts we design ourselves.
//
//   gearShape / gear({ teeth, module, width, bore, pressure })  involute spur gear (ExtrudeGeometry, centred on z)
//   meshPhase(teethB) + meshRatio(a, b)                           place gear B on gear A's pitch circle so teeth interlock
//   flange({ outer, inner, thickness, holes, holeRadius, pcd })   plate with a bore and a bolt circle
//   hexBolt({ d, length, head })                                  hex head + shank (merged geometry)
//   tube({ outer, inner, length })                                pipe / bushing (lathe)
//   pumpPocket({ distance, radius }) / pumpBody({...})            figure-eight gear-pump pocket inside a stadium block
//   explodeAt(parts, k)                                           staggered exploded view: k = 0 assembled … 1 fully exploded
// Pure functions: geometry depends only on the arguments, so render(t) stays deterministic.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const { PI, cos, sin, tan, acos, sqrt, atan2, max } = Math;
const inv = (a) => tan(a) - a;   // involute function

/** Involute spur-gear outline. module m = pitch diameter / teeth. Standard proportions: addendum m, dedendum 1.25 m. */
export function gearShape({ teeth: z = 18, module: m = 0.1, pressure = 20, bore = 0, flankSteps = 7 } = {}) {
  if (z < 6) throw new Error('gear: at least 6 teeth');
  const a = (pressure * PI) / 180, r = (m * z) / 2, rb = r * cos(a), ra = r + m, rf = max(r - 1.25 * m, 0.1 * r);
  const psiB = PI / (2 * z) + inv(a);                       // half the tooth's angular width at the base circle
  const r0 = max(rb, rf);
  const flank = [];                                         // [radius, angle offset from tooth centre] from root to tip
  for (let i = 0; i <= flankSteps; i++) { const rr = r0 + ((ra - r0) * i) / flankSteps; flank.push([rr, psiB - inv(acos(Math.min(1, rb / rr)))]); }
  const shape = new THREE.Shape(), P = (rr, ang) => [rr * cos(ang), rr * sin(ang)];
  for (let k = 0; k < z; k++) {
    const c = (2 * PI * k) / z;
    const right = flank.map(([rr, o]) => P(rr, c - o)), left = flank.map(([rr, o]) => P(rr, c + o)).reverse();
    const start = P(rf, c - psiB);
    if (k === 0) shape.moveTo(...start); else shape.lineTo(...start);
    for (const p of right) shape.lineTo(...p);
    const tipA = c - flank.at(-1)[1], tipB = c + flank.at(-1)[1];
    for (let i = 1; i < 4; i++) shape.lineTo(...P(ra, tipA + ((tipB - tipA) * i) / 4));
    for (const p of left) shape.lineTo(...p);
    shape.lineTo(...P(rf, c + psiB));
    const next = (2 * PI * (k + 1)) / z - psiB;             // root arc to the next tooth
    for (let i = 1; i < 4; i++) shape.lineTo(...P(rf, c + psiB + ((next - c - psiB) * i) / 4));
  }
  shape.closePath();
  if (bore > 0) { const h = new THREE.Path(); h.absarc(0, 0, bore, 0, 2 * PI, true); shape.holes.push(h); }
  return { shape, pitchRadius: r, tipRadius: ra, rootRadius: rf, baseRadius: rb };
}

export function gear({ width = 0.3, ...o } = {}) {
  const g = gearShape(o);
  const geo = new THREE.ExtrudeGeometry(g.shape, { depth: width, bevelEnabled: false, curveSegments: 24 });
  geo.translate(0, 0, -width / 2); geo.computeVertexNormals();
  return Object.assign(geo, { userData: { pitchRadius: g.pitchRadius, tipRadius: g.tipRadius, rootRadius: g.rootRadius, teeth: o.teeth ?? 18, module: o.module ?? 0.1 } });
}

/** Gear B sits at +x on gear A's pitch circle (centre distance = rA + rB). Its rotation for A's rotation θ: -θ·zA/zB + meshPhase(zB). */
export const meshPhase = (teethB) => (teethB % 2 === 0 ? PI / teethB : 0);
export const meshRatio = (teethA, teethB) => -teethA / teethB;
export const centreDistance = (m, zA, zB) => (m * (zA + zB)) / 2;

/** Plate with a bore and n bolt holes on a pitch circle. */
export function flange({ outer = 1, inner = 0.3, thickness = 0.12, holes = 6, holeRadius = 0.05, pcd = 0.75 } = {}) {
  const s = new THREE.Shape(); s.absarc(0, 0, outer, 0, 2 * PI, false);
  const hole = (x, y, r) => { const h = new THREE.Path(); h.absarc(x, y, r, 0, 2 * PI, true); s.holes.push(h); };
  if (inner > 0) hole(0, 0, inner);
  for (let i = 0; i < holes; i++) hole(pcd * cos((2 * PI * i) / holes), pcd * sin((2 * PI * i) / holes), holeRadius);
  const geo = new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: false, curveSegments: 48 });
  geo.translate(0, 0, -thickness / 2); geo.computeVertexNormals(); return geo;
}

/** ISO-style hex bolt along +z: head (across flats ≈ 1.6 d) at z = 0 … head, shank to z = head + length. */
export function hexBolt({ d = 0.08, length = 0.4, head = 0.6 * 0.08 } = {}) {
  const across = 1.6 * d, R = across / (2 * cos(PI / 6));
  const h = new THREE.CylinderGeometry(R, R, head, 6); h.rotateX(PI / 2); h.translate(0, 0, head / 2);
  const s = new THREE.CylinderGeometry(d / 2, d / 2, length, 16); s.rotateX(PI / 2); s.translate(0, 0, head + length / 2);
  const geo = mergeGeometries([h.toNonIndexed(), s.toNonIndexed()]); geo.computeVertexNormals(); return geo;
}

/** Pipe / bushing along z, centred. */
export function tube({ outer = 0.2, inner = 0.15, length = 1, segments = 48 } = {}) {
  const pts = [[inner, -length / 2], [outer, -length / 2], [outer, length / 2], [inner, length / 2], [inner, -length / 2]].map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.LatheGeometry(pts, segments); geo.rotateX(PI / 2); geo.computeVertexNormals(); return geo;
}

/** Figure-eight pocket: two overlapping circles (radius R) whose centres are `distance` apart on x. */
export function pumpPocket({ distance = 1, radius = 0.6 } = {}) {
  const d2 = distance / 2; if (radius <= d2) throw new Error('pumpPocket: circles must overlap (radius > distance / 2)');
  const b = atan2(sqrt(radius * radius - d2 * d2), d2), p = new THREE.Path();
  p.absarc(-d2, 0, radius, b, 2 * PI - b, false);          // left lobe: top → left → bottom
  p.absarc(d2, 0, radius, PI + b, 3 * PI - b, false);      // right lobe: bottom → right → top
  return p;
}

const stadium = (halfW, halfH) => { const s = new THREE.Shape(), r = halfH; s.moveTo(-halfW + r, -r); s.lineTo(halfW - r, -r); s.absarc(halfW - r, 0, r, -PI / 2, PI / 2, false); s.lineTo(-halfW + r, r); s.absarc(-halfW + r, 0, r, PI / 2, 1.5 * PI, false); return s; };

/** Gear-pump block: stadium outline, optional figure-eight pocket, optional bolt holes on the outline offset inwards. */
export function pumpBody({ distance = 1, pocketRadius = 0.6, wall = 0.28, depth = 0.3, pocket = true, bolts = 0, boltRadius = 0.05 } = {}) {
  const halfH = pocketRadius + wall, halfW = distance / 2 + pocketRadius + wall, s = stadium(halfW, halfH);
  if (pocket) { const p = pumpPocket({ distance, radius: pocketRadius }); s.holes.push(p); }   // Path winding: three triangulates holes by containment
  for (const [x, y] of boltCircle({ distance, pocketRadius, wall, n: bolts })) { const h = new THREE.Path(); h.absarc(x, y, boltRadius, 0, 2 * PI, true); s.holes.push(h); }
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 40 });
  geo.translate(0, 0, -depth / 2); geo.computeVertexNormals(); return geo;
}

/** Bolt positions halfway through the wall of a pumpBody: n points around the stadium (n even). */
export function boltCircle({ distance = 1, pocketRadius = 0.6, wall = 0.28, n = 8 } = {}) {
  if (!n) return [];
  const r = pocketRadius + wall / 2, d2 = distance / 2, out = [];
  const per = n / 2;                                        // half the bolts on each lobe, over its outer 180°
  for (const side of [-1, 1]) for (let i = 0; i < per; i++) { const a = (side < 0 ? PI / 2 : -PI / 2) + (PI * (i + 0.5)) / per; out.push([side * d2 + r * cos(a), r * sin(a)]); }
  return out;
}

/** Exploded view. parts: [{ object, dir: [x,y,z] (unit), dist, order }] — order 0 leaves first. k: 0 assembled … 1 exploded.
 *  Each part travels during its own window; windows overlap so the motion reads as one gesture (stagger), easing out. */
export function explodeAt(parts, k, { overlap = 0.55 } = {}) {
  const n = max(1, ...parts.map((p) => (p.order ?? 0) + 1)), span = 1 / (n - (n - 1) * overlap);
  for (const p of parts) {
    const o = p.order ?? 0, a = o * span * (1 - overlap), local = Math.min(1, max(0, (k - a) / span)), e = 1 - (1 - local) ** 3;
    if (!p.home) p.home = p.object.position.clone();
    p.object.position.set(p.home.x + p.dir[0] * p.dist * e, p.home.y + p.dir[1] * p.dist * e, p.home.z + p.dir[2] * p.dist * e);
  }
}
