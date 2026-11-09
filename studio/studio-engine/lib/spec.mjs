// Format overrides merge nested settings while retaining independent film specs.
import { readFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { assetId } from './assets.mjs';
const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const merge = (a, b) => {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = object(v) && object(out[k]) ? merge(out[k], v) : v;
  return out;
};
export function forFormat(spec, format) {
  const visit = (v) => {
    if (Array.isArray(v)) return v.map(visit);
    if (!object(v)) return v;
    const base = Object.fromEntries(Object.entries(v).filter(([k]) => !['reel', 'youtube', 'square', 'post'].includes(k)));
    return Object.fromEntries(Object.entries(v[format] ? merge(base, v[format]) : base).map(([k, x]) => [k, visit(x)]));
  };
  const out = visit(spec);
  if (Array.isArray(out?.scenes)) for (const s of out.scenes) if (Array.isArray(s?.elements)) s.elements = s.elements.filter((e) => !e?.only || e.only === format);
  return out;
}
export function mediaAssets(spec, ready) {
  const assets = (spec.assets || []).map((a) => { const id = a.name || a.id || assetId(a.kind, a.prompt, a.refs); return { id, path: ready[id], role: a.role || 'background', rights: a.rights || '' }; });
  if (spec.audio?.music) assets.push({ id: 'supplied-music', path: spec.audio.music, role: 'music', rights: spec.audio.musicRights || '' });
  if (spec.audio?.voice) assets.push({ id: 'supplied-voice', path: spec.audio.voice, role: 'sfx', rights: spec.audio.voiceRights || '' });
  // recorded sounds carry their licence: the spec's own `rights`, else the CREDITS.json line that `studio.mjs sfx --download` wrote (audit L3)
  (spec.audio?.sounds || []).forEach((x, i) => assets.push({ id: `sound-${i + 1}`, path: x.file, role: x.role === 'ambience' ? 'music' : 'sfx', rights: x.rights || creditOf(x.file) }));
  return assets;
}
export function creditOf(file) {
  try { const c = JSON.parse(readFileSync(join(dirname(file), 'CREDITS.json'), 'utf8')).find((r) => r.file === basename(file)); return c ? `${c.license} · ${c.attribution || `"${c.title}" by ${c.creator}`} · ${c.source || 'Openverse'}` : ''; } catch { return ''; }
}
export function musicDecodeOptions(offset = 0) {
  if (!Number.isFinite(offset)) throw new Error('audio.musicOffset must be a finite number of seconds');
  return offset > 0 ? { af: `atrim=start=${offset},asetpts=PTS-STARTPTS` } : offset < 0 ? { af: `adelay=${-offset * 1000}:all=1` } : {};
}
