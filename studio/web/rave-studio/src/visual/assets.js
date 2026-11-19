// Stage assets modelled in Blender (blender/stage_assets.py) arrive as one embedded GLB.
// Each node becomes a reusable geometry by name. If the GLB is missing, simple stand-ins keep the app working.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { fallbackPerson } from './fixtures.js';

export class Assets {
  constructor(geos, fromBlender) {
    this.geos = geos;
    this.fromBlender = fromBlender;
    this.mats = {
      dark: new THREE.MeshStandardMaterial({ color: 0x0b0c0f, metalness: 0.6, roughness: 0.55 }),
      steel: new THREE.MeshStandardMaterial({ color: 0x55595f, metalness: 0.9, roughness: 0.38 }),
      grille: new THREE.MeshStandardMaterial({ color: 0x050506, metalness: 0.2, roughness: 0.9 }),
      panel: new THREE.MeshStandardMaterial({ color: 0x5a3c26, metalness: 0.8, roughness: 0.45 }),
      stone: new THREE.MeshStandardMaterial({ color: 0x0d0e12, metalness: 0.3, roughness: 0.32 }),
    };
  }

  geo(name) { return this.geos[name] || this.geos.__box; }

  mesh(name, mat) {
    const def = name.startsWith('gate_panel') ? 'panel' : name === 'truss_seg' ? 'steel' : name === 'speaker_grille' ? 'grille' : name === 'monolith' ? 'stone' : 'dark';
    return new THREE.Mesh(this.geo(name), mat || this.mats[def]);
  }

  // centre of a geometry's bounding box (used for the radial explode of the gate panels)
  center(name) {
    const g = this.geo(name);
    if (!g.boundingBox) g.computeBoundingBox();
    return g.boundingBox.getCenter(new THREE.Vector3());
  }
}

export async function loadAssets(b64) {
  if (b64 && b64.length > 100) {
    try {
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
      const gltf = await new GLTFLoader().parseAsync(bin, '');
      const geos = {};
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse((o) => {
        if (o.isMesh) { const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); geos[o.name] = g; }
      });
      geos.__box = new THREE.BoxGeometry(1, 1, 1);
      return new Assets(geos, true);
    } catch (e) { console.warn('GLB failed, using stand-ins', e); }
  }
  return new Assets(standIns(), false);
}

function standIns() {
  const g = { __box: new THREE.BoxGeometry(1, 1, 1) };
  const box = (w, h, d, x = 0, y = 0, z = 0) => { const b = new THREE.BoxGeometry(w, h, d); b.translate(x, y, z); return b; };
  for (let i = 0; i < 24; i++) {
    const a = ((i + 0.45) / 24) * Math.PI * 2, r = 6.95;
    const b = new THREE.BoxGeometry(1.4, 1.75, 1.6);
    b.rotateZ(a); b.translate(Math.cos(a) * r, Math.sin(a) * r, 0);
    g[`gate_panel_${String(i).padStart(2, '0')}`] = b;
  }
  g.truss_seg = box(0.3, 2, 0.3, 0, 1, 0);
  g.speaker = box(1.1, 0.32, 0.55);
  g.speaker_grille = box(1.0, 0.26, 0.02, 0, 0, 0.28);
  g.booth = box(3.8, 1.05, 1.1, 0, 0.525, 0);
  g.booth_slats = box(3.5, 0.85, 0.03, 0, 0.5, 0.57);
  g.booth_gear = box(2.8, 0.1, 0.48, 0, 1.16, -0.05);
  g.crowd_person = fallbackPerson();
  g.mh_base = box(0.42, 0.16, 0.32, 0, 0.08, 0);
  g.mh_yoke = box(0.44, 0.36, 0.12, 0, 0.18, 0);
  g.mh_head = new THREE.CylinderGeometry(0.15, 0.15, 0.36, 12).rotateX(Math.PI / 2);
  g.mh_lens = new THREE.CylinderGeometry(0.12, 0.12, 0.02, 12).rotateX(Math.PI / 2).translate(0, 0, -0.2);
  g.lamp_cage = new THREE.ConeGeometry(0.22, 0.2, 12, 1, true);
  g.lamp_bulb = new THREE.SphereGeometry(0.1, 10, 8).translate(0, -0.17, 0);
  g.blinder = box(0.95, 0.64, 0.18);
  g.blinder_cells = box(0.85, 0.5, 0.02, 0, 0, 0.1);
  g.monolith = box(1.3, 7, 0.7, 0, 3.5, 0);
  g.monolith_lines = box(0.05, 5.4, 0.02, 0, 3.6, 0.36);
  return g;
}
