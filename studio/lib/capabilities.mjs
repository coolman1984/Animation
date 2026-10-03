// Capability registry (capabilities.json): what the studio can use, whether it is installed, and which engine a layer needs.
// Detection launches at most ONE python process (every launch costs ~1 s on the owner's Windows machine).
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { PYTHON, onPath, WINDOWS } from './platform.mjs';

export const STUDIO = join(dirname(fileURLToPath(import.meta.url)), '..');
export const VENDOR = join(STUDIO, 'vendor', 'node_modules');
export const MATURITY = ['CORE', 'PRODUCTION', 'PROVEN', 'EXPERIMENTAL', 'PLANNED', 'LEARN'];

export function loadRegistry(file = join(STUDIO, 'capabilities.json')) {
  const reg = JSON.parse(readFileSync(file, 'utf8'));
  const errors = [], ids = new Set();
  for (const c of reg.capabilities) {
    if (!c.id || ids.has(c.id)) errors.push(`duplicate or missing id: ${c.id}`); ids.add(c.id);
    if (!MATURITY.includes(c.maturity)) errors.push(`${c.id}: maturity must be one of ${MATURITY.join(', ')}`);
    if (c.profile && !reg.profiles[c.profile]) errors.push(`${c.id}: unknown profile ${c.profile}`);
    for (const t of c.serves || []) if (!reg.layerTypes.includes(t)) errors.push(`${c.id}: unknown layer type ${t}`);
    if (['CORE', 'PRODUCTION', 'PROVEN', 'EXPERIMENTAL'].includes(c.maturity) && c.kind !== 'native' && c.kind !== 'executable' && c.kind !== 'python' && !c.study)
      errors.push(`${c.id}: ${c.maturity} needs a study (a feature graduates only after a passing study)`);
    if (c.study && !existsSync(join(STUDIO, c.study))) errors.push(`${c.id}: study ${c.study} not found`);
  }
  if (errors.length) throw new Error('capabilities.json: ' + errors.join('; '));
  return reg;
}

// Blender is often installed without being on PATH.
function findBlender() {
  const p = onPath('blender'); if (p) return p;
  if (!WINDOWS) return null;
  for (const v of ['5.2', '5.1', '5.0', '4.5']) {
    const f = join(process.env.ProgramFiles || 'C:\\Program Files', 'Blender Foundation', `Blender ${v}`, 'blender.exe');
    if (existsSync(f)) return f;
  }
  return null;
}

// status: ready | missing | reference (LEARN entries have nothing to install).
export function detect(reg) {
  const modules = [...new Set(reg.capabilities.flatMap(c => c.check?.python || []))];
  let importable = new Set();
  if (modules.length) {
    const code = `import importlib\nfor m in ${JSON.stringify(modules)}:\n  try: importlib.import_module(m); print(m)\n  except Exception: pass`;
    const r = spawnSync(PYTHON, ['-c', code], { encoding: 'utf8' });
    importable = new Set((r.stdout || '').split(/\r?\n/).filter(Boolean));
  }
  return reg.capabilities.map(c => {
    const k = c.check || {};
    let ok = true, where = null;
    if (c.maturity === 'LEARN') return { ...c, status: 'reference' };
    if (!Object.keys(k).length) return { ...c, status: c.maturity === 'PLANNED' ? 'planned' : 'reference' }; // nothing installable to detect
    if (k.file) { ok = existsSync(join(STUDIO, k.file)); where = k.file; }
    if (k.vendor) { ok = existsSync(join(VENDOR, k.vendor)); where = `vendor/node_modules/${k.vendor}`; }
    if (k.exe) { where = k.exe === 'blender' ? findBlender() : onPath(k.exe); ok = !!where; }
    if (k.python) { const miss = k.python.filter(m => !importable.has(m)); ok = !miss.length; where = miss.length ? `missing python: ${miss.join(', ')}` : 'python ok'; }
    return { ...c, status: ok ? 'ready' : 'missing', where };
  });
}

// needs: layer descriptors like "text", "particles:4000", "3d". Picks the most mature READY capability that serves the
// type within its limits; reports the better engine that is missing (with its setup profile) instead of hiding it.
export function route(needs, caps) {
  const rank = c => MATURITY.indexOf(c.maturity);
  return needs.map(need => {
    const [type, amount] = String(need).split(':'), n = amount === undefined ? null : Number(amount);
    const fits = caps.filter(c => (c.serves || []).includes(type) && !(n !== null && c.limits?.[type] !== undefined && n > c.limits[type]) && c.maturity !== 'LEARN' && c.maturity !== 'PLANNED')
      .sort((a, b) => rank(a) - rank(b));
    const ready = fits.filter(c => c.status === 'ready');
    const pick = ready[0] || null;
    const missing = fits.filter(c => c.status !== 'ready' && (!pick || rank(c) <= rank(pick)));
    const planned = caps.filter(c => (c.serves || []).includes(type) && c.maturity === 'PLANNED');
    return { need, engine: pick?.id || null, maturity: pick?.maturity || null,
      why: pick ? pick.bestFor : `nothing ready serves ${need}`,
      install: missing.map(c => `${c.id} (node studio.mjs setup ${c.profile})`),
      planned: planned.map(c => c.id),
      alternatives: ready.slice(1).map(c => c.id) };
  });
}
