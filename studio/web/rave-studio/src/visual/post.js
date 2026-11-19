// Post pipeline: scene (MSAA) → bloom → trails → tone map → final composite (layers, transitions, grade).
// Transitions freeze the outgoing picture in a render target and blend it with the live new one.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { CopyShader } from 'three/addons/shaders/CopyShader.js';
import { Pass } from 'three/addons/postprocessing/Pass.js';
import { finalFrag, fullVert } from './shaders.js';

// Copies the tone-mapped frame into a target when armed (the outgoing picture of a transition).
class SnapPass extends Pass {
  constructor(target) { super(); this.needsSwap = false; this.target = target; this.armed = false; this.copy = new ShaderPass(CopyShader); }
  render(renderer, writeBuffer, readBuffer) { if (this.armed) { this.copy.render(renderer, this.target, readBuffer); this.armed = false; } }
}

export const TRANSITIONS = { cut: 0, dissolve: 1, flash: 2, whip: 3, glitch: 4, iris: 5, zoom: 6, slices: 7, luma: 8, pixel: 9 };

export class Post {
  constructor(renderer, scene, camera, spectrumTex, overlayTex, wordTex) {
    this.renderer = renderer;
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    this.samples = 4;
    this.rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: this.samples });
    this.composer = new EffectComposer(renderer, this.rt);
    this.renderPass = new RenderPass(scene, camera);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.9, 0.55, 0.62);
    this.trails = new AfterimagePass(0.0);
    this.trails.enabled = false;
    this.output = new OutputPass();
    this.prevRT = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType });
    this.final = new ShaderPass(new THREE.ShaderMaterial({
      vertexShader: fullVert,
      fragmentShader: finalFrag,
      uniforms: {
        tDiffuse: { value: null }, tPrev: { value: this.prevRT.texture }, tOverlay: { value: overlayTex }, tWord: { value: wordTex },
        uSpectrum: { value: spectrumTex },
        uTime: { value: 0 }, uRes: { value: new THREE.Vector2(size.x, size.y) }, uAspect: { value: size.x / size.y },
        uTrans: { value: 1 }, uTransType: { value: 1 },
        uBeat: { value: 0 }, uKick: { value: 0 }, uBass: { value: 0 }, uHigh: { value: 0 },
        uChroma: { value: 0.3 }, uGrain: { value: 0.25 }, uVignette: { value: 0.55 }, uGlitch: { value: 0 },
        uExposure: { value: 1 }, uContrast: { value: 1.05 }, uSat: { value: 1.1 }, uHue: { value: 0 },
        uFlash: { value: 0 }, uBlack: { value: 0 }, uLetterbox: { value: 0 }, uMirror: { value: 0 }, uZoom: { value: 0 },
        uVJ: { value: 1 }, uVJOpacity: { value: 0 }, uVJBlend: { value: 1 },
        uOverlay: { value: 1 }, uWord: { value: 0 }, uWordScale: { value: 1 }, uWordY: { value: 0.5 },
        uC0: { value: new THREE.Color() }, uC1: { value: new THREE.Color() }, uC2: { value: new THREE.Color() },
      },
    }));
    this.final.material.toneMapped = false;
    this.u = this.final.material.uniforms;
    this.snap = new SnapPass(this.prevRT);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.trails);
    this.composer.addPass(this.output);
    this.composer.addPass(this.snap);
    this.composer.addPass(this.final);
    this.trans = null;
    this.pending = [];
  }

  setCamera(cam) { this.renderPass.camera = cam; }

  setSize(w, h, pixelRatio) {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(w, h);
    const W = Math.round(w * pixelRatio), H = Math.round(h * pixelRatio);
    this.prevRT.setSize(W, H);
    this.bloom.resolution.set(W / 2, H / 2);
    this.u.uRes.value.set(W, H);
    this.u.uAspect.value = W / H;
  }

  setSamples(n) {
    if (n === this.samples) return;
    this.samples = n;
    this.composer.renderTarget1.samples = n;
    this.composer.renderTarget2.samples = n;
    this.composer.renderTarget1.dispose();
    this.composer.renderTarget2.dispose();
  }

  // Run `fn` (switch camera/world) right after the next frame, and blend from that frame.
  transition(type, seconds, fn) {
    const t = TRANSITIONS[type] ?? 1;
    this.pending.push({ type: t, seconds: Math.max(0.05, seconds), fn });
  }

  render(dt) {
    if (this.trans) {
      this.trans.p += dt / this.trans.seconds;
      if (this.trans.p >= 1) { this.trans = null; this.u.uTrans.value = 1; } else this.u.uTrans.value = this.trans.p;
    }
    const jobs = this.pending.length ? this.pending.splice(0) : null;
    if (jobs) this.snap.armed = true; // freeze the picture shown this frame
    this.composer.render(dt);
    if (jobs) {
      const last = jobs[jobs.length - 1];
      for (const j of jobs) j.fn && j.fn();
      if (last.type === 0) { this.trans = null; this.u.uTrans.value = 1; }
      else { this.trans = { p: 0, seconds: last.seconds }; this.u.uTransType.value = last.type; this.u.uTrans.value = 0; }
    }
  }
}
