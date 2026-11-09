// Small delivery policies shared by the command and its process-free regression checks.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export function holdSpans(tl) {
  return tl.scenes.filter((s) => s.hold).map((s) => [+(s.b - Math.min(1.4, s.b - s.a)).toFixed(2), +s.b.toFixed(2)]);
}
export function gateFailures({ frames = [], text = [], sync = { missed: [] }, motion = [] } = {}) {
  return [...frames, ...text.map((x) => `${x.t} s ${x.kind}: ${x.text}`), ...sync.missed, ...motion];
}
export function listTakes(dir) {
  return existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory() && /^take\d+$/.test(e.name)).map((e) => e.name).sort((a, b) => Number(a.slice(4)) - Number(b.slice(4))) : [];
}
export function newTake(dir, before) {
  const names = listTakes(dir).filter((name) => !before.includes(name));
  if (!names.length) throw new Error('build produced no new take; an earlier take cannot be delivered');
  return join(dir, names.at(-1));
}
export function deliveryVideo(take, format) {
  const measure = JSON.parse(readFileSync(join(take, 'measure.json'), 'utf8'));
  const d = measure.deliveries?.[format];
  if (measure.final !== true || measure.profile !== 'final' || !d?.gates?.length || d.gates.some((g) => g.ok !== true)) throw new Error('delivery lacks a final measurement with passing gates');
  const videos = readdirSync(take).filter((name) => /-share-.*\.mp4$/i.test(name));
  if (videos.length !== 1) throw new Error('delivery requires exactly one share MP4');
  const path = join(take, videos[0]);
  if (!statSync(path).isFile() || statSync(path).size === 0) throw new Error('share MP4 is empty or missing');
  return path;
}
// Take lookup shared by `studio.mjs review` and `taste` (audit B3, R13n). A bare film name means out/<film>, never the source folder.
export function resolveTake(target, outRoot) {
  if (!target) return null;
  const isTake = (d) => existsSync(d) && statSync(d).isDirectory() && (/^take\d+$/.test(d.split(/[\\/]/).filter(Boolean).at(-1)) || readdirSync(d).some((n) => n.startsWith('review-')));
  if (isTake(target)) return target;
  const base = join(outRoot, target), takes = listTakes(base);
  return takes.length ? join(base, takes.at(-1)) : null;
}
// The export to judge: the share or master of the newest FINAL take; else the newest non-draft export, flagged.
export function judgedVideo(film, outRoot) {
  const base = join(outRoot, film), takes = listTakes(base).reverse();
  const mp4s = (d) => readdirSync(d).filter((f) => f.endsWith('.mp4'));
  for (const t of takes) {
    const d = join(base, t); let final = false;
    try { final = JSON.parse(readFileSync(join(d, 'measure.json'), 'utf8')).profile === 'final'; } catch {}
    if (!final) continue;
    const v = mp4s(d), pick = v.find((f) => /-share-/.test(f)) || v.find((f) => !/-(DRAFT|REVIEW)/.test(f));
    if (pick) return { file: join(d, pick), note: `final take ${t}` };
  }
  for (const t of takes) { const d = join(base, t), v = mp4s(d).filter((f) => !/-DRAFT/.test(f)); if (v.length) return { file: join(d, v[0]), note: `no final take: judging the review export of ${t}` }; }
  return null;
}
