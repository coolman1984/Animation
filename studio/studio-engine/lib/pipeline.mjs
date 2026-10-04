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
