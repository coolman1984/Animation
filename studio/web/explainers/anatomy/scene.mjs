// Procedural coffee grinder. Meshes are code, not a downloaded model.
// Parts (labels, notes, explode offsets, colours) come from parts.json so another object
// can reuse the page: keep the schema, replace REST and meshFor.
// Three.js only (MIT), loaded by the page import map from the local gpu vendor.
import * as THREE from 'three';
import { poseAt, validateParts } from './anatomy.mjs';

const REST = {
  base: [0, 0.12, 0],
  body: [0, 0.68, 0],
  hopper: [0, 1.38, 0],
  lid: [0, 1.72, 0],
  drawer: [0, 0.22, 0.46],
  crank: [0.78, 0.86, 0],
  knob: [1.12, 0.86, 0],
  switch: [-0.52, 0.58, 0.22],
};

function meshFor(part) {
  const material = new THREE.MeshStandardMaterial({ color: part.colour, roughness: 0.58, metalness: 0.06 });
  let geo;
  switch (part.id) {
    case 'base': geo = new THREE.CylinderGeometry(0.78, 0.84, 0.24, 48); break;
    case 'body': geo = new THREE.CylinderGeometry(0.56, 0.66, 0.92, 48); break;
    case 'hopper': geo = new THREE.CylinderGeometry(0.46, 0.28, 0.52, 40); break;
    case 'lid': geo = new THREE.CylinderGeometry(0.48, 0.48, 0.08, 40); break;
    case 'drawer': geo = new THREE.BoxGeometry(0.52, 0.16, 0.42); break;
    case 'crank': geo = new THREE.BoxGeometry(0.7, 0.06, 0.06); break;
    case 'knob': geo = new THREE.SphereGeometry(0.1, 24, 16); break;
    case 'switch': geo = new THREE.BoxGeometry(0.08, 0.18, 0.06); break;
    default: geo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
  }
  const mesh = new THREE.Mesh(geo, material);
  mesh.userData.id = part.id;
  return mesh;
}

const tmp = new THREE.Vector3();

export function mount({ canvas, overlay, note, list, explode, data }) {
  const parts = validateParts(data).parts;
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state = { azimuth: 0.55, polar: 0.32, explode: Number(explode?.value || 0), selected: parts[0].id, hover: null, reduced };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#241c16');
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 40);
  scene.add(new THREE.HemisphereLight('#f4e6d6', '#3a2c24', 1.15));
  const key = new THREE.DirectionalLight('#fff6ec', 1.35);
  key.position.set(2.4, 3.6, 2.2);
  scene.add(key);
  const table = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.06, 48), new THREE.MeshStandardMaterial({ color: '#2a211c', roughness: 0.95 }));
  table.position.y = -0.03;
  scene.add(table);

  const meshes = {};
  for (const part of parts) {
    const mesh = meshFor(part);
    meshes[part.id] = mesh;
    scene.add(mesh);
  }

  overlay.replaceChildren();
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'leaders');
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('stroke', '#f6f0e6');
  line.setAttribute('stroke-width', '1.5');
  svg.appendChild(line);
  const label = document.createElement('div');
  label.className = 'leader';
  label.dir = 'rtl';
  overlay.append(svg, label);

  const hotspots = {};
  for (const part of parts) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hotspot';
    btn.setAttribute('aria-label', part.label);
    btn.style.color = part.colour;
    btn.addEventListener('pointerenter', () => { state.hover = part.id; draw(); });
    btn.addEventListener('pointerleave', () => { if (state.hover === part.id) state.hover = null; draw(); });
    btn.addEventListener('click', (event) => { event.stopPropagation(); select(part.id); });
    overlay.appendChild(btn);
    hotspots[part.id] = btn;
  }

  list.replaceChildren();
  const rowButtons = {};
  for (const part of parts) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'part';
    btn.textContent = part.label;
    btn.addEventListener('click', () => select(part.id, true));
    list.appendChild(btn);
    rowButtons[part.id] = btn;
  }

  function placeCamera() {
    const dist = 4.8, az = state.azimuth, pol = state.polar;
    camera.position.set(Math.sin(az) * Math.cos(pol) * dist, 0.9 + Math.sin(pol) * dist, Math.cos(az) * Math.cos(pol) * dist);
    camera.lookAt(0, 0.85, 0);
  }

  function applyPose() {
    for (const part of parts) {
      const rest = REST[part.id] || [0, 0.5, 0];
      const e = state.explode;
      meshes[part.id].position.set(rest[0] + part.offset[0] * e, rest[1] + part.offset[1] * e, rest[2] + part.offset[2] * e);
    }
  }

  function draw() {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height || !renderer.getContext()) return;
    if (camera.aspect !== width / height) { camera.aspect = width / height; camera.updateProjectionMatrix(); }
    renderer.setSize(width, height, false);
    placeCamera();
    applyPose();
    renderer.render(scene, camera);
    const active = state.hover || state.selected;
    for (const part of parts) {
      const v = meshes[part.id].getWorldPosition(tmp).project(camera);
      const x = (v.x * 0.5 + 0.5) * width;
      const y = (-v.y * 0.5 + 0.5) * height;
      const btn = hotspots[part.id];
      const onScreen = v.z < 1 && x > -20 && x < width + 20 && y > -20 && y < height + 20;
      btn.hidden = !onScreen;
      btn.classList.toggle('is-on', part.id === state.selected);
      btn.style.left = `${Math.min(width - 22, Math.max(22, x))}px`;
      btn.style.top = `${Math.min(height - 22, Math.max(22, y))}px`;
      rowButtons[part.id].setAttribute('aria-pressed', part.id === state.selected ? 'true' : 'false');
    }
    const part = parts.find((p) => p.id === active);
    if (!part) { label.hidden = true; line.setAttribute('x2', '0'); return; }
    note.textContent = part.note;
    const btn = hotspots[part.id];
    if (btn.hidden) { label.hidden = true; return; }
    const x = parseFloat(btn.style.left), y = parseFloat(btn.style.top);
    label.hidden = false;
    label.textContent = part.label;
    const labelW = 148;
    let lx = x + 28;
    if (lx + labelW > width - 8) lx = Math.max(8, x - labelW - 28);
    const ly = Math.min(height - 36, Math.max(8, y - 18));
    label.style.left = `${lx}px`;
    label.style.top = `${ly}px`;
    line.setAttribute('x1', String(x));
    line.setAttribute('y1', String(y));
    line.setAttribute('x2', String(lx + (lx > x ? 0 : labelW)));
    line.setAttribute('y2', String(ly + 16));
  }

  function select(id, separate) {
    if (!parts.some((p) => p.id === id)) return;
    state.selected = id;
    state.hover = null;
    if (separate) state.explode = Math.max(state.explode, 0.45);
    if (explode) explode.value = String(state.explode);
    draw();
  }

  function tour() {
    const i = Math.max(0, parts.findIndex((p) => p.id === state.selected));
    const next = parts[(i + 1) % parts.length];
    state.selected = next.id;
    state.explode = Math.max(state.explode, 0.72);
    if (explode) explode.value = String(state.explode);
    draw();
  }

  function render(t) {
    const pose = poseAt(t, parts.length);
    state.azimuth = pose.orbit;
    state.polar = pose.polar;
    state.explode = pose.explode;
    state.selected = pose.selected >= 0 ? parts[pose.selected].id : parts[0].id;
    state.hover = null;
    if (explode) explode.value = String(state.explode);
    draw();
  }

  function onKey(event) {
    if (event.target && event.target.closest && event.target.closest('input, textarea, select')) return;
    const step = 0.1;
    if (event.key === 'ArrowLeft') state.azimuth -= step;
    else if (event.key === 'ArrowRight') state.azimuth += step;
    else if (event.key === 'ArrowUp') state.polar = Math.min(1.05, state.polar + step);
    else if (event.key === 'ArrowDown') state.polar = Math.max(-0.15, state.polar - step);
    else if (event.key === '+' || event.key === '=') state.explode = Math.min(1, state.explode + 0.08);
    else if (event.key === '-' || event.key === '_') state.explode = Math.max(0, state.explode - 0.08);
    else return;
    event.preventDefault();
    if (explode) explode.value = String(state.explode);
    draw();
  }

  let drag = null;
  function onDown(event) {
    drag = { x: event.clientX, y: event.clientY, id: event.pointerId };
    canvas.setPointerCapture(event.pointerId);
  }
  function onMove(event) {
    if (!drag || drag.id !== event.pointerId) return;
    state.azimuth += (event.clientX - drag.x) * 0.008;
    state.polar = Math.min(1.05, Math.max(-0.15, state.polar + (event.clientY - drag.y) * 0.005));
    drag.x = event.clientX; drag.y = event.clientY;
    draw();
  }
  function onUp(event) { if (drag && drag.id === event.pointerId) drag = null; }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  window.addEventListener('keydown', onKey);
  if (explode) explode.addEventListener('input', () => { state.explode = Number(explode.value); draw(); });
  const resize = () => draw();
  window.addEventListener('resize', resize);
  if (typeof ResizeObserver === 'function') new ResizeObserver(resize).observe(canvas);
  // One layout pass after the canvas has a size. Not a running loop, so reduced-motion stays still.
  requestAnimationFrame(draw);
  select(parts[0].id);

  return {
    render, select, tour, reduced,
    destroy() {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', resize);
      renderer.dispose();
    },
  };
}
