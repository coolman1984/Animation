// XRAY + CUTAWAY — the two "see inside" looks of the industrial vision (VISION_3D_AND_MOTION.md), 2026-11-06.
//   xrayMaterial({ color, opacity, rim })   ghosted shell: faint body, bright fresnel rim, depthWrite off, so inner parts read through it
//   cutaway(geometry, { box, material, cutMaterial })   solid section cut with capped faces (three-bvh-csg, MIT); returns a Mesh
//   sectionMaterial({ color, stripe })      engineering hatch for the cut faces (diagonal stripes in screen-independent object space)
// Clipping planes alone leave a hollow shell; CSG closes the wall so the cut shows the real thickness. Compute the cut once in
// init() (or cache it per quantised parameter): it is pure, but costs tens of ms on software WebGL.
import * as THREE from 'three';

export function xrayMaterial({ color = '#8FD3FF', opacity = 0.08, rim = 0.85, power = 2.2 } = {}) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.FrontSide, blending: THREE.NormalBlending,
    uniforms: { uColor: { value: new THREE.Color(color) }, uBase: { value: opacity }, uRim: { value: rim }, uPow: { value: power } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uBase; uniform float uRim; uniform float uPow; varying vec3 vN; varying vec3 vV;
      void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPow); gl_FragColor = vec4(uColor, clamp(uBase + uRim * f, 0.0, 1.0)); }`,
  });
}

export function sectionMaterial({ color = '#C8462F', stripe = '#E9876F', scale = 18 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uA: { value: new THREE.Color(color) }, uB: { value: new THREE.Color(stripe) }, uS: { value: scale } },
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 uA; uniform vec3 uB; uniform float uS; varying vec3 vP;
      void main(){ float s = step(0.5, fract((vP.x + vP.y + vP.z) * uS)); gl_FragColor = vec4(mix(uA, uB, s * 0.6), 1.0); }`,
  });
}

/** Subtract an axis-aligned box ({ min: [x,y,z], max: [x,y,z] }) from geometry. Cut faces get cutMaterial. */
export async function cutaway(geometry, { box, material, cutMaterial = sectionMaterial() }) {
  const { Brush, Evaluator, SUBTRACTION } = await import('three-bvh-csg');
  const body = new Brush(geometry, material); body.updateMatrixWorld();
  const size = box.max.map((v, i) => v - box.min[i]), centre = box.max.map((v, i) => (v + box.min[i]) / 2);
  const cutter = new Brush(new THREE.BoxGeometry(...size), cutMaterial); cutter.position.set(...centre); cutter.updateMatrixWorld();
  const ev = new Evaluator(); ev.useGroups = true; ev.attributes = ['position', 'normal'];
  const out = ev.evaluate(body, cutter, SUBTRACTION);
  out.geometry.computeBoundingSphere();
  return out;   // a Brush (Mesh subclass) with material [material, cutMaterial]
}
