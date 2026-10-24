// Specialist engine adapter. The native composer (lib/composer.html + film.js) is the primary engine.
// An external engine (HyperFrames, Remotion, a Blender/ffmpeg script...) may render the SILENT picture
// when it clearly outperforms the native engine for a job; the studio still owns audio, mastering,
// measurement, gates and review. Contract: config.engine = { type: 'external', name, command: [...],
// cwd?, inputs?: [paths hashed for the cache] }. Command args may use {out} {w} {h} {fps} {t0} {t1}
// {duration} {profile} {root} {variant}; the command must write an H.264/any video at exactly that size/fps/length.
import { resolve, join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { run } from './render.mjs';
import { probe } from './measure.mjs';

const MOTION_CANVAS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'engines', 'motion-canvas');

export const ENGINE_NOTES = Object.freeze({
  native: 'Default. Deterministic DOM/Canvas/WebGL composer, seekable, parallel, text read-back, camera diagnostics.',
  hyperframes: 'Apache-2.0 HTML video framework (HeyGen). Consider for existing HyperFrames projects or its catalog blocks; its own checks complement ours. No text read-back through this adapter.',
  remotion: 'React video framework. Consider for existing Remotion projects or hundreds of data-driven variants. Company licence required for organisations of 4+ people; check before use.',
  'motion-canvas': 'MIT, isolated at studio/engines/motion-canvas (packages 3.17.2). No headless CLI: motionCanvasManual() prints the editor steps. One landscape editor render succeeded (output/landscape.mp4). No text read-back.',
});

// Sizes authored in engines/motion-canvas. A film delivery selects one with variant "landscape" or "reel".
export const MOTION_CANVAS_VARIANTS = Object.freeze({
  landscape: { w: 1920, h: 1080, project: 'src/landscape.js', file: 'landscape.mp4' },
  reel: { w: 1080, h: 1920, project: 'src/reel.js', file: 'reel.mp4' },
});

// The 3.17.2 packages do not ship a headless renderer. render-manual.mjs prints the editor steps.
export const MOTION_CANVAS_HEADLESS = false;

export function motionCanvasManual(variant = 'landscape') {
  const key = Object.prototype.hasOwnProperty.call(MOTION_CANVAS_VARIANTS, variant) ? variant : 'landscape';
  const v = MOTION_CANVAS_VARIANTS[key];
  return [
    'Motion Canvas 3.17.2 has no headless render command. None of the installed packages has a bin. Renderer in @motion-canvas/core runs in the editor. @motion-canvas/ffmpeg is a Vite plugin: it encodes frames the browser sends over a websocket while the editor is open.',
    '1. cd studio/engines/motion-canvas',
    '2. npm install   (once; node_modules stays in this folder and is git-ignored)',
    '3. npm run start   (vite prints a local URL; the default port is 5173)',
    `4. Open that URL, then open /${v.project.replace(/\.js$/, '')} (${key}, ${v.w}×${v.h}). With two projects, / is only a picker.`,
    `5. Open Video Settings. The exporter is already Video (FFmpeg). Confirm resolution ${v.w}×${v.h}, then press Render.`,
    `6. The mp4 is written to studio/engines/motion-canvas/output/${v.file} (git-ignored). Copy it onto the {out} path if a film build is waiting.`,
    'config.engine = motionCanvasEngine() runs render-manual.mjs, which prints these steps and exits 2. The main studio does not import the Motion Canvas packages. A landscape render was produced once (2026-10-24) by pressing Render in the editor: output/landscape.mp4, 1920×1080, 1.47 s, 30 fps. The reel variant was not rendered.',
  ];
}

// Same shape as any other external engine (see HyperFrames): a command array with {out}. It does not render.
export function motionCanvasEngine() {
  return {
    type: 'external',
    name: 'motion-canvas',
    cwd: 'engines/motion-canvas',
    command: [process.execPath, join(MOTION_CANVAS_DIR, 'render-manual.mjs'), '--variant={variant}', '--out={out}', '--w={w}', '--h={h}', '--fps={fps}', '--duration={duration}'],
    inputs: [
      'engines/motion-canvas/src/scenes/title.js',
      'engines/motion-canvas/src/scenes/title-reel.js',
      'engines/motion-canvas/src/landscape.meta',
      'engines/motion-canvas/src/reel.meta',
      'engines/motion-canvas/vite.config.js',
    ],
    headless: MOTION_CANVAS_HEADLESS,
    manual: motionCanvasManual('landscape'),
  };
}

export function validateEngine(engine) {
  if (engine === undefined || engine === 'native') return [];
  const errors = [];
  if (!engine || engine.type !== 'external') errors.push("config.engine must be 'native' or { type: 'external', ... }");
  else {
    if (!Array.isArray(engine.command) || !engine.command.length || engine.command.some(a => typeof a !== 'string')) errors.push('engine.command must be a non-empty array of strings');
    else if (!engine.command.some(a => a.includes('{out}'))) errors.push('engine.command must write to {out}');
    if (engine.inputs !== undefined && !Array.isArray(engine.inputs)) errors.push('engine.inputs must be an array of paths');
  }
  return errors;
}

export async function externalRender(engine, { out, w, h, fps, t0 = 0, t1, scale = 1, root, profile = 'final', variant, segments, fadeOut }) {
  const errors = validateEngine(engine);
  if (errors.length) throw new Error(errors.join('; '));
  // Audio is assembled from the delivery's segments/fade; a contiguous external clip would drift from it.
  if (segments || fadeOut) throw new Error('external engines cannot render cut-down deliveries (segments/fadeOut): render the full delivery or use the native engine');
  const W = Math.ceil(Math.round(w * scale) / 2) * 2, H = Math.ceil(Math.round(h * scale) / 2) * 2;
  const vars = { out, w: W, h: H, fps, t0, t1, duration: +(t1 - t0).toFixed(6), profile, root, variant: variant || '' };
  const args = engine.command.map(a => a.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)));
  const started = Date.now();
  await run(args[0], args.slice(1), { cwd: engine.cwd ? resolve(root, engine.cwd) : root });
  if (!existsSync(out)) throw new Error(`external engine ${engine.name || args[0]} did not write ${out}`);
  const p = await probe(out);
  const expected = Math.round((t1 - t0) * fps);
  if (p.width !== W || p.height !== H) throw new Error(`external engine output ${p.width}x${p.height}, expected ${W}x${H}`);
  if (Math.abs(p.fps - fps) > 0.01) throw new Error(`external engine output ${p.fps} fps, expected ${fps}`);
  if (Math.abs(p.duration - (t1 - t0)) > 1.5 / fps) throw new Error(`external engine output ${p.duration}s, expected ${t1 - t0}s`);
  return { frames: expected, fps, width: W, height: H, range: [t0, t1], seconds: (Date.now() - started) / 1000, engine: engine.name || 'external' };
}
