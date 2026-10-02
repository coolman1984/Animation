// Multi-layer product cinema: turn one owner-supplied image into prepared plates with a declarative
// plan (no manual retouching per shot). Every output records its provenance: original pixels vs
// synthesized fill. A synthesized clean plate is only for defocused backgrounds; it is never product
// evidence. No hidden product surfaces are invented. Depth maps are accepted only as supplied files
// with a recorded source (e.g. a measured map or a licensed model run), never fabricated here.
//
// plan = { source: 'film/source/hero.jpg', out: 'film/plates/hero', layers: [
//   { name: 'product', matte: { type: 'chroma'|'luma'|'alpha'|'path'|'file', ...opts, grow?, feather? } },
//   { name: 'foreground', matte: {...} },
//   { name: 'clean', type: 'clean', remove: ['product', 'foreground'], grow: 8 },
//   { name: 'shadow', type: 'shadow', from: 'product', squash: 0.12, blur: 18, opacity: 0.6 },
//   { name: 'depth', type: 'depth', path: 'film/source/hero-depth.png', provenance: 'Depth Anything V2 Small (Apache-2.0) run on 2026-10-02' } ] }
// Run: node lib/layers.mjs film/layers.json   → PNG plates + <name>-check.png matte sheets + layers.json manifest.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runLab } from './imagelab.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataUrl = path => `data:${extname(path).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg'};base64,${readFileSync(path).toString('base64')}`;

export function validateLayerPlan(plan) {
  const errors = [], names = new Set();
  if (!plan || typeof plan.source !== 'string' || typeof plan.out !== 'string' || !Array.isArray(plan.layers) || !plan.layers.length) return ['layer plan needs source, out and layers'];
  for (const L of plan.layers) {
    if (!L?.name || names.has(L.name) || !/^[a-z0-9_-]+$/i.test(L.name)) errors.push(`layer names must be unique identifiers (${L?.name})`);
    names.add(L?.name);
    const type = L.type || 'cutout';
    if (type === 'cutout' && !['chroma', 'luma', 'alpha', 'path', 'file'].includes(L.matte?.type)) errors.push(`${L.name}: matte.type must be chroma, luma, alpha, path or file`);
    if (type === 'clean' && (!Array.isArray(L.remove) || L.remove.some(r => !names.has(r)))) errors.push(`${L.name}: remove must list earlier cut-out layers`);
    if (type === 'shadow' && !names.has(L.from)) errors.push(`${L.name}: from must name an earlier cut-out layer`);
    if (type === 'depth' && (typeof L.path !== 'string' || typeof L.provenance !== 'string' || !L.provenance.trim())) errors.push(`${L.name}: a depth layer needs a supplied file path and a provenance record`);
    if (!['cutout', 'clean', 'shadow', 'depth'].includes(type)) errors.push(`${L.name}: unknown layer type ${type}`);
  }
  return errors;
}

// Runs inside imagelab-page.html (Chromium canvas). Kept as a string-able function.
const JOB = async function ({ source, layers, files }) {
  const src = await lab.load(source), W = src.width, H = src.height, out = {}, mattes = {};
  const manifest = { size: { w: W, h: H }, layers: [] };
  const matteOf = async (m) => {
    let k;
    if (m.type === 'chroma') k = lab.chromaMatte(src, m);
    else if (m.type === 'luma') k = lab.lumaMatte(src, m);
    else if (m.type === 'alpha') k = lab.alphaMatte(src);
    else if (m.type === 'path') k = lab.pathMask(W, H, m.cmds, m.feather ?? 1);
    else if (m.type === 'file') k = lab.grayMatte(await lab.load(files[m.path]));
    if (m.grow) k = lab.morph(k, m.grow);
    if (m.feather && m.type !== 'path') k = lab.blur(k, m.feather);
    return k;
  };
  for (const L of layers) {
    const type = L.type || 'cutout';
    if (type === 'cutout') {
      const k = await matteOf(L.matte); mattes[L.name] = k;
      const cut = lab.applyMask(src, k), check = lab.matteSheet(cut);
      out[L.name] = lab.url(cut); out[`${L.name}-check`] = lab.url(check.sheet);
      manifest.layers.push({ name: L.name, type, file: `${L.name}.png`, bounds: lab.bounds(k), alpha: check.alpha, provenance: 'original pixels (matted)' });
    } else if (type === 'clean') {
      let hole = lab.union(...L.remove.map(r => mattes[r]));
      if (L.grow) hole = lab.morph(hole, L.grow);
      const filled = lab.fillHoles(lab.subtract(src, hole));
      out[L.name] = lab.url(filled); out[`${L.name}-fillmask`] = lab.url(hole);
      const synth = lab.bounds(hole)?.coverage ?? 0;
      manifest.layers.push({ name: L.name, type, file: `${L.name}.png`, synthesizedFraction: synth, fillMask: `${L.name}-fillmask.png`,
        provenance: `original pixels + synthesized fill over ${(synth * 100).toFixed(1)}% (removed: ${L.remove.join(', ')}); use defocused or covered, never as product evidence` });
    } else if (type === 'shadow') {
      const sh = lab.shadowFrom(mattes[L.from], L);
      out[L.name] = lab.url(sh);
      manifest.layers.push({ name: L.name, type, file: `${L.name}.png`, from: L.from, provenance: 'graphic shadow derived from the subject matte (not a photographed shadow)' });
    } else if (type === 'depth') {
      const d = await lab.load(files[L.path]);
      const c = lab.canvas(W, H); c.getContext('2d').drawImage(d, 0, 0, W, H);
      out[L.name] = lab.url(c);
      manifest.layers.push({ name: L.name, type, file: `${L.name}.png`, provenance: L.provenance, note: 'supplied depth map (white = near); motion from it must stay small: edges stretch, nothing hidden is revealed' });
    }
  }
  out.layers = manifest;
  return out;
};

export async function buildLayers(planOrPath, { root = ROOT } = {}) {
  const plan = typeof planOrPath === 'string' ? JSON.parse(readFileSync(resolve(root, planOrPath), 'utf8')) : planOrPath;
  const errors = validateLayerPlan(plan);
  if (errors.length) throw new Error('invalid layer plan: ' + errors.join('; '));
  const sourcePath = resolve(root, plan.source);
  if (!existsSync(sourcePath)) throw new Error(`layer source missing: ${plan.source}`);
  const files = {};
  for (const L of plan.layers) {
    const p = L.matte?.type === 'file' ? L.matte.path : L.type === 'depth' ? L.path : null;
    if (p) { const abs = resolve(root, p); if (!existsSync(abs)) throw new Error(`${L.name}: missing ${p}`); files[p] = dataUrl(abs); }
  }
  const outDir = resolve(root, plan.out); mkdirSync(outDir, { recursive: true });
  const jobFile = join(outDir, '.layers-job.js');
  writeFileSync(jobFile, JOB.toString());
  try {
    const written = await runLab({ job: jobFile, outDir, args: { source: dataUrl(sourcePath), layers: plan.layers, files } });
    const manifest = JSON.parse(readFileSync(join(outDir, 'layers.json'), 'utf8'));
    manifest.source = plan.source; manifest.at = new Date().toISOString();
    writeFileSync(join(outDir, 'layers.json'), JSON.stringify(manifest, null, 2));
    return { outDir, written, manifest };
  } finally { (await import('node:fs')).rmSync(jobFile, { force: true }); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [planPath] = process.argv.slice(2);
  if (!planPath) { console.error('usage: node lib/layers.mjs <layer-plan.json>'); process.exit(2); }
  const r = await buildLayers(resolve(planPath), { root: process.cwd() });
  for (const l of r.manifest.layers) console.log(`${l.name.padEnd(12)} ${l.provenance}`);
  console.log(`→ ${r.outDir}`);
}
