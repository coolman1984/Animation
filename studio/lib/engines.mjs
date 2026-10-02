// Specialist engine adapter. The native composer (lib/composer.html + film.js) is the primary engine.
// An external engine (HyperFrames, Remotion, a Blender/ffmpeg script...) may render the SILENT picture
// when it clearly outperforms the native engine for a job; the studio still owns audio, mastering,
// measurement, gates and review. Contract: config.engine = { type: 'external', name, command: [...],
// cwd?, inputs?: [paths hashed for the cache] }. Command args may use {out} {w} {h} {fps} {t0} {t1}
// {duration} {profile} {root} {variant}; the command must write an H.264/any video at exactly that size/fps/length.
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { run } from './render.mjs';
import { probe } from './measure.mjs';

export const ENGINE_NOTES = Object.freeze({
  native: 'Default. Deterministic DOM/Canvas/WebGL composer, seekable, parallel, text read-back, camera diagnostics.',
  hyperframes: 'Apache-2.0 HTML video framework (HeyGen). Consider for existing HyperFrames projects or its catalog blocks; its own checks complement ours. No text read-back through this adapter.',
  remotion: 'React video framework. Consider for existing Remotion projects or hundreds of data-driven variants. Company licence required for organisations of 4+ people; check before use.',
});

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
