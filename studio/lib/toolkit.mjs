// Toolkit: third-party agent tools vendored whole from pinned commits (toolkit/README.md, toolkit/toolkit.json).
//   packages()            → manifest rows
//   checkToolkit()        → { ok, items: [{ ok, what, detail }] }   (files present, licence beside them, wrapper skill routed)
//   updatePackage(name, clone) → copy the package again from a local clone (read the clone first: it is third-party code)
//   designSystem(brief, opt)   → UI UX Pro Max's design-system generator (Python standard library), as text
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync, copyFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { STUDIO } from './capabilities.mjs';
import { PYTHON } from './platform.mjs';

export const TOOLKIT = join(STUDIO, 'toolkit');
const ROOT = join(STUDIO, '..');
export const manifest = () => JSON.parse(readFileSync(join(TOOLKIT, 'toolkit.json'), 'utf8'));
export const packages = () => manifest().packages;
export const destOf = (p) => join(STUDIO, p.dest || join('toolkit', p.name));
export function pkg(name) {
  const p = packages().find((x) => x.name === name);
  if (!p) throw new Error(`unknown toolkit package "${name}" (node studio/studio.mjs toolkit lists them)`);
  return p;
}

const files = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]);
// "a/b" keeps that file or everything under that folder; "*" matches one path segment ("*/STYLE.md").
const pattern = (p) => new RegExp(`^${p.split('/').map((s) => s.split('*').map((x) => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]+')).join('/')}(/|$)`);
export function selected(p, rels) {
  const inc = (p.include || []).map(pattern), exc = (p.exclude || []).map(pattern);
  // Never copied: caches, and upstream .gitignore files (they would silently hide vendored files from our own git).
  const junk = /(^|\/)(__pycache__|\.DS_Store|\.gitignore)(\/|$)/;
  return rels.filter((r) => !junk.test(r) && (!inc.length || inc.some((re) => re.test(r))) && !exc.some((re) => re.test(r)));
}

export function checkToolkit() {
  const items = [], add = (ok, what, detail = '') => items.push({ ok: !!ok, what, detail });
  const index = existsSync(join(STUDIO, 'SKILLS.md')) ? readFileSync(join(STUDIO, 'SKILLS.md'), 'utf8') : '';
  for (const p of packages()) {
    const dir = destOf(p), here = existsSync(dir);
    const n = here ? files(dir).length : 0;
    add(here && n > 0, `${p.name}: ${n} file(s) at ${relative(STUDIO, dir).replace(/\\/g, '/')}`, here ? '' : `missing (node studio/studio.mjs toolkit update ${p.name} --from=<clone>)`);
    const lic = here && readdirSync(dir).some((f) => /^LICEN[SC]E/i.test(f));
    add(lic, `${p.name}: ${p.licence} licence beside the files`, lic ? '' : 'no LICENSE file');
    if (p.skill) {
      const s = join(ROOT, '.claude', 'skills', p.skill, 'SKILL.md');
      add(existsSync(s) && readFileSync(s, 'utf8').includes(relative(ROOT, dir).replace(/\\/g, '/')), `${p.name}: wrapper skill ${p.skill} points at the vendored copy`);
      add(index.includes(p.skill), `${p.name}: skill ${p.skill} routed in SKILLS.md`);
    }
  }
  return { ok: items.every((i) => i.ok), items };
}

export function updatePackage(name, clone) {
  const p = pkg(name), src = join(clone, p.from);
  if (!existsSync(src)) throw new Error(`${src} not found: is ${clone} a clone of ${p.repo}?`);
  const dir = destOf(p), keep = selected(p, files(src).map((f) => relative(src, f).replace(/\\/g, '/')));
  if (!keep.length) throw new Error(`${p.name}: nothing selected in ${src}`);
  rmSync(dir, { recursive: true, force: true });
  for (const r of keep) { mkdirSync(join(dir, r, '..'), { recursive: true }); copyFileSync(join(src, r), join(dir, r)); }
  for (const n of p.notices || []) copyFileSync(join(clone, n), join(dir, n));
  const head = spawnSync('git', ['-C', clone, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).stdout?.trim();
  if (head && head !== p.commit) {
    const m = manifest(); m.packages.find((x) => x.name === name).commit = head; m.updated = new Date().toISOString().slice(0, 10);
    writeFileSync(join(TOOLKIT, 'toolkit.json'), JSON.stringify(m, null, 2) + '\n');
  }
  return { name, files: keep.length + (p.notices || []).length, commit: head || p.commit, bytes: files(dir).reduce((a, f) => a + statSync(f).size, 0) };
}

// UI UX Pro Max (web stage B): "<product, industry, mood>" → pattern, style, colour tokens, type pair, effects, anti-patterns, checklist.
export function designSystem(brief, { name, format = 'markdown', stack } = {}) {
  if (!String(brief || '').trim()) throw new Error('describe the product, e.g. "specialty coffee roastery warm premium"');
  const script = join(destOf(pkg('ui-ux-pro-max')), 'scripts', 'search.py');
  const args = [script, brief, '--design-system', '-f', format, ...(name ? ['-p', name] : []), ...(stack ? ['--stack', stack] : [])];
  const r = spawnSync(PYTHON, args, { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' }, windowsHide: true });
  if (r.error) throw new Error(`Python is needed for UI UX Pro Max (${PYTHON}): ${r.error.message}`);
  if (r.status) throw new Error((r.stderr || r.stdout || `exit ${r.status}`).trim());
  return r.stdout;
}
