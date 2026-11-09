// INDUSTRIAL STUDY — the first proof of the industrial vision (VISION_3D_AND_MOTION.md): one gear pump, 6 s.
// Proves, on software WebGL (render CLI --gpu=1, needs `node studio.mjs setup gpu`):
//   • exact parts: involute gears that really mesh, bolt circle, figure-eight pocket (lib/mechparts.js, our build123d-style generator)
//   • cutaway with capped section faces (three-bvh-csg via lib/xray.js cutaway) — the wall reads solid, hatched in section red
//   • ghosted interior: the cover is an X-ray shell, the gears turn behind it (working parts)
//   • exploded → reassembled with a staggered gesture (explodeAt), the driving gear outlined (pmndrs/postprocessing OutlineEffect)
//   • cinematic finish through one EffectComposer (outline + ACES tone mapping + vignette), every frame a pure function of t
// Subject is original (a generic external gear pump), not a client product. Copy: one short line at the end.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer, RenderPass, EffectPass, OutlineEffect, ToneMappingEffect, ToneMappingMode, VignetteEffect } from 'postprocessing';
import { textLine, playLine, ease, ramp, lerp } from '../../lib/motion.js';
import { gear, meshPhase, meshRatio, centreDistance, pumpBody, boltCircle, hexBolt, tube, explodeAt } from '../../lib/mechparts.js';
import { xrayMaterial, cutaway } from '../../lib/xray.js';

const M = 0.1, Z = 12, WIDTH = 0.3;                    // module, teeth (both gears), face width
const D = centreDistance(M, Z, Z), POCKET = (M * Z) / 2 + M + 0.015;
let renderer, composer, scene, camera, drive, idler, parts, title;

export default {
  duration: 6, fps: 30,
  async init(stage, { W, H }) {
    stage.style.background = '#0F1216';
    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, { position: 'absolute', left: '0', top: '0', width: W + 'px', height: H + 'px' });
    stage.appendChild(canvas);
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(1); renderer.setSize(W, H, false);
    renderer.toneMapping = THREE.NoToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;   // tone mapping happens in the composer
    scene = new THREE.Scene(); scene.background = new THREE.Color('#0F1216');
    scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
    camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 60);

    const steel = new THREE.MeshStandardMaterial({ color: '#AEB6BF', metalness: 0.9, roughness: 0.32 });
    const cast = new THREE.MeshStandardMaterial({ color: '#6E8797', metalness: 0.45, roughness: 0.42 });
    const brass = new THREE.MeshStandardMaterial({ color: '#C79A55', metalness: 0.95, roughness: 0.28 });
    const pump = new THREE.Group(); pump.rotation.x = -0.18; pump.position.y = 0.15; scene.add(pump);

    // body with the pocket, cut open on its upper-right quarter (capped, hatched section)
    const bodyGeo = pumpBody({ distance: D, pocketRadius: POCKET, wall: 0.26, depth: WIDTH, bolts: 8 });
    const body = await cutaway(bodyGeo, { box: { min: [0, 0, -1], max: [2, 2, 1] }, material: cast });
    pump.add(body);
    const CUT = { min: [0, 0, -1], max: [2, 2, 1] };
    const back = await cutaway(pumpBody({ distance: D, pocketRadius: POCKET, wall: 0.26, depth: 0.08, pocket: false, bolts: 8 }), { box: CUT, material: cast });
    back.position.z = -WIDTH / 2 - 0.04; pump.add(back);
    const cover = new THREE.Mesh(pumpBody({ distance: D, pocketRadius: POCKET, wall: 0.26, depth: 0.08, pocket: false, bolts: 8 }), xrayMaterial({ color: '#9FD8FF', opacity: 0.025, rim: 0.7, power: 3 }));
    cover.position.z = WIDTH / 2 + 0.04; cover.renderOrder = 2; pump.add(cover);

    drive = new THREE.Mesh(gear({ teeth: Z, module: M, width: WIDTH * 0.96, bore: 0.07 }), brass); drive.position.x = -D / 2;
    idler = new THREE.Mesh(gear({ teeth: Z, module: M, width: WIDTH * 0.96, bore: 0.07 }), steel); idler.position.x = D / 2;
    pump.add(drive, idler);
    const shaftA = new THREE.Mesh(tube({ outer: 0.07, inner: 0, length: 1.1 }), steel); shaftA.position.set(-D / 2, 0, 0.3);
    const shaftB = new THREE.Mesh(tube({ outer: 0.07, inner: 0, length: 0.5 }), steel); shaftB.position.set(D / 2, 0, 0);
    pump.add(shaftA, shaftB);
    const bolts = boltCircle({ distance: D, pocketRadius: POCKET, wall: 0.26, n: 8 }).map(([x, y]) => {
      const b = new THREE.Mesh(hexBolt({ d: 0.06, length: 0.36, head: 0.04 }), steel); b.rotation.y = Math.PI; b.position.set(x, y, WIDTH / 2 + 0.12); pump.add(b); return b; });

    // exploded view along the shaft axis: bolts leave first, then the cover, the gears, and the back plate the other way
    parts = [
      ...bolts.map((b) => ({ object: b, dir: [0, 0, 1], dist: 1.5, order: 0 })),
      { object: cover, dir: [0, 0, 1], dist: 1.05, order: 1 },
      { object: shaftA, dir: [0, 0, 1], dist: 0.9, order: 2 },
      { object: drive, dir: [0, 0, 1], dist: 0.62, order: 2 },
      { object: idler, dir: [0, 0, 1], dist: 0.62, order: 2 },
      { object: shaftB, dir: [0, 0, 1], dist: 0.62, order: 2 },
      { object: back, dir: [0, 0, -1], dist: 0.55, order: 3 },
    ];

    const key = new THREE.DirectionalLight('#FFF3E0', 2.4); key.position.set(3, 4, 5); scene.add(key);
    const rimL = new THREE.DirectionalLight('#9FD8FF', 1.2); rimL.position.set(-4, 1, -3); scene.add(rimL);
    scene.add(new THREE.HemisphereLight('#DCE8F2', '#1A1F26', 0.9));

    composer = new EffectComposer(renderer, { multisampling: Math.min(4, renderer.capabilities.maxSamples || 0) });
    composer.addPass(new RenderPass(scene, camera));
    const outline = new OutlineEffect(scene, camera, { edgeStrength: 2.2, pulseSpeed: 0, visibleEdgeColor: 0xF2C27B, hiddenEdgeColor: 0x6B5530, xRay: true, blur: false });
    outline.selection.add(drive);
    composer.addPass(new EffectPass(camera, outline, new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }), new VignetteEffect({ darkness: 0.42, offset: 0.32 })));

    title = textLine(stage, 'كل ترس في مكانه', { left: '0', top: `${H * 0.82}px`, width: `${W}px`, justifyContent: 'center', fontFamily: "'Alexandria'", fontSize: `${Math.round(H * 0.06)}px`, fontWeight: '600', color: '#F1ECE3', zIndex: '5' });
  },
  render(t) {
    // gears turn the whole time (working parts); 1 turn per 3 s on the drive gear, the idler follows by the mesh ratio
    const a = -(2 * Math.PI * t) / 3;
    drive.rotation.z = a; idler.rotation.z = a * meshRatio(Z, Z) + meshPhase(Z);
    // explode 1.2 → 2.6 s, hold, reassemble 3.6 → 5.0 s
    const k = t < 3.1 ? ease.inOutCubic(ramp(t, 1.2, 2.6)) : 1 - ease.inOutCubic(ramp(t, 3.6, 5.0));
    explodeAt(parts, k);
    // camera: three-quarter view that opens up while the pump explodes, then settles front-on for the line
    const orbit = lerp(0.95, 0.42, ease.inOutCubic(ramp(t, 0, 5.2)));
    const dist = 8.4 + 1.6 * k;
    camera.position.set(Math.sin(orbit) * dist, 1.1 + 0.6 * k, Math.cos(orbit) * dist);
    camera.lookAt(0, -0.12, 0.3 * k);
    composer.render(0);
    playLine(title, t, 4.9, 99);
  },
};
