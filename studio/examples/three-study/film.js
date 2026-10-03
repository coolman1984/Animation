// THREE STUDY — browser 3D through the vendored Three.js (node studio.mjs setup gpu), rendered by software WebGL
// (config gpu: true / render CLI --gpu=1). Proves the contract a 3D layer must keep in this studio:
// every frame is a pure function of t (object pose + camera orbit computed from t, no clock, no animation loop),
// one WebGL canvas composited under DOM copy that stays readable (.line/.word for the text checks).
// Subject: a metallic product bottle turning under studio light while the camera orbits, then settles for the copy.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { textLine, playLine, ease, ramp, lerp } from '../../lib/motion.js';

let renderer, scene, camera, bottle, cap, shadow, title;
export default {
  duration: 5, fps: 30,
  init(stage, { W, H }) {
    stage.style.background = '#0D1117';
    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, { position: 'absolute', left: '0', top: '0', width: W + 'px', height: H + 'px' });
    stage.appendChild(canvas);
    // preserveDrawingBuffer keeps the last frame for the screenshot; pixel ratio 1 = authored size.
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: true });
    renderer.setPixelRatio(1); renderer.setSize(W, H, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
    scene = new THREE.Scene();
    scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
    camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 100);
    // Bottle silhouette as a lathe profile (radius, height).
    const profile = [[0, 0], [0.62, 0], [0.7, 0.08], [0.72, 1.5], [0.66, 1.75], [0.3, 2.0], [0.26, 2.35], [0, 2.35]].map(([x, y]) => new THREE.Vector2(x, y));
    bottle = new THREE.Mesh(new THREE.LatheGeometry(profile, 96), new THREE.MeshStandardMaterial({ color: '#C9A46A', metalness: 0.95, roughness: 0.22 }));
    cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.42, 64), new THREE.MeshStandardMaterial({ color: '#1B1E24', metalness: 0.4, roughness: 0.35 }));
    cap.position.y = 2.55; bottle.add(cap); bottle.position.y = -1.3; scene.add(bottle);
    // Soft contact shadow: a radial gradient on a floor plane (no shadow maps: cheap and stable on software GL).
    const g = document.createElement('canvas'); g.width = g.height = 256; const x = g.getContext('2d');
    const grad = x.createRadialGradient(128, 128, 0, 128, 128, 128); grad.addColorStop(0, 'rgba(0,0,0,0.55)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = grad; x.fillRect(0, 0, 256, 256);
    shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(g), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.3; scene.add(shadow);
    const key = new THREE.DirectionalLight('#FFF1DC', 2.2); key.position.set(3, 4, 2); scene.add(key);
    title = textLine(stage, 'لمعة تدوم', { left: '0', top: `${H * 0.8}px`, width: `${W}px`, justifyContent: 'center', fontFamily: "'Alexandria'", fontSize: `${Math.round(H * 0.07)}px`, fontWeight: '600', color: '#F4EFE6', zIndex: '5' });
  },
  render(t) {
    // Camera orbits 70° and settles (ease-out) by 3.6 s; the bottle turns slowly and stops when the copy arrives.
    const orbit = lerp(-0.6, 0.62, ease.outCubic(ramp(t, 0, 3.6)));
    camera.position.set(Math.sin(orbit) * 9.5, 0.9 - 0.5 * ramp(t, 0, 3.6), Math.cos(orbit) * 9.5);
    camera.lookAt(0, -0.9, 0);
    bottle.rotation.y = 1.2 * ease.inOutCubic(ramp(t, 0, 3.4));
    renderer.render(scene, camera);
    playLine(title, t, 3.2, 99);
  },
};
