// Preview profiles preserve the authored layout; only capture/encode quality changes.
export const PROFILES = Object.freeze({
  draft: { scale: 0.5, fps: 15, format: 'jpeg', quality: 85, crf: 26, preset: 'ultrafast' },
  review: { scale: 1, format: 'jpeg', quality: 95, crf: 20, preset: 'veryfast' },
  final: { scale: 1, format: 'png', crf: 14, preset: 'slow' },
});
export function frameRange(t0, t1, duration, fps) {
  // An end up to half a frame past the duration is float rounding (e.g. a 3-decimal config duration), not a longer request: clamp it.
  if (![t0, t1, duration, fps].every(Number.isFinite) || fps <= 0 || t0 < 0 || t1 <= t0 || t1 > duration + 0.5 / fps)
    throw new Error(`invalid range ${t0}-${t1}; duration ${duration}, fps ${fps}`);
  const first = Math.round(t0 * fps), last = Math.min(Math.round(t1 * fps), Math.round(duration * fps));
  if (last <= first) throw new Error('range contains no frames');
  return { first, last, frames: last - first };
}
// config.mjs shape in plain words (audit R6): a missing field used to surface as a raw TypeError deep in make.mjs.
export function validateConfig(cfg, { profile = 'draft' } = {}) {
  const e = [], pos = (v) => Number.isFinite(v) && v > 0;
  if (!cfg || typeof cfg !== 'object') return ['config.mjs must export default an object'];
  if (!(Number.isInteger(cfg.w) && cfg.w > 0 && Number.isInteger(cfg.h) && cfg.h > 0)) e.push('config w and h must be positive whole pixels');
  if (!(Number.isInteger(cfg.fps) && cfg.fps > 0 && cfg.fps <= 120)) e.push('config fps must be a whole number 1..120');
  if (cfg.engine?.type !== 'external' && (typeof cfg.film !== 'string' || !cfg.film)) e.push('config film must be the path of film.js');
  if (profile !== 'draft' && (typeof cfg.score !== 'string' || !cfg.score)) e.push('config score must be the path of score.mjs (review and final builds mix sound)');
  if (!Array.isArray(cfg.deliveries) || !cfg.deliveries.length) e.push('config deliveries must list at least one delivery');
  else cfg.deliveries.forEach((d, i) => { if (typeof d?.name !== 'string' || !d.name) e.push(`deliveries[${i}] needs a name`); if (!pos(d?.duration)) e.push(`deliveries[${i}] (${d?.name}) needs a positive duration`); if (d?.safe !== undefined && !(Array.isArray(d.safe) && d.safe.length === 4 && d.safe.every(Number.isFinite))) e.push(`deliveries[${i}] (${d.name}) safe must be [x0, y0, x1, y1]`); });
  if (profile === 'final') for (const k of ['lufs', 'tp']) if (cfg[k] !== undefined && !Number.isFinite(cfg[k])) e.push(`config ${k} must be a number`);
  return e;
}
export function buildOptions(cfg, flags) {
  const opt = {};
  for (const flag of flags) {
    const match = flag.match(/^--([a-z]+)(?:=(.*))?$/);
    if (!match || !['profile', 'only', 'range', 'workers'].includes(match[1]) || opt[match[1]] !== undefined)
      throw new Error(`unknown or duplicate option: ${flag}`);
    opt[match[1]] = match[2] ?? '';
  }
  const profile = opt.profile ?? 'draft';
  if (!PROFILES[profile]) throw new Error('profile must be draft, review or final');
  const request=cfg.ownerRequest;
  if(request && (typeof request.delivery!=='string'||!request.delivery||!['w','h','duration','fps'].every(k=>Number.isFinite(request[k])&&request[k]>0)||!Number.isInteger(request.w)||!Number.isInteger(request.h)))throw new Error('ownerRequest needs one delivery, positive width/height/duration/fps');
  const names = opt.only?.split(',') ?? (request ? [request.delivery] : null) ?? (profile === 'final' ? cfg.deliveries.map(d => d.name) : [cfg.preview?.delivery ?? cfg.deliveries[0].name]);
  if (!names.length || new Set(names).size !== names.length || names.some(n => !cfg.deliveries.some(d => d.name === n)))
    throw new Error(`unknown/duplicate delivery: ${opt.only}`);
  if (profile !== 'final' && names.length !== 1) throw new Error('preview one delivery at a time');
  if (profile === 'final' && opt.range !== undefined) throw new Error('final must cover the whole delivery; use review for a range');
  const selected = cfg.deliveries.filter(d => names.includes(d.name));
  if(request){
    const d=selected[0];
    if(selected.length!==1||d.name!==request.delivery)throw new Error('ownerRequest allows exactly the requested single delivery');
    if((d.w??cfg.w)!==request.w||(d.h??cfg.h)!==request.h||d.duration!==request.duration||cfg.fps!==request.fps)throw new Error('delivery dimensions/duration/fps must match ownerRequest');
  }
  const duration = selected[0].duration;
  let range;
  if (profile !== 'final') {
    range = opt.range === undefined ? (profile === 'draft' ? (selected[0].name === cfg.preview?.delivery ? (cfg.preview.range ?? [0, Math.min(12, duration)]) : [0, Math.min(12, duration)]) : [0, duration]) : opt.range.split(':').map(x => x.trim() === '' ? NaN : Number(x));
    if (range.length !== 2) throw new Error('range must be start:end in delivery seconds');
    frameRange(range[0], range[1], duration, PROFILES[profile].fps ?? cfg.fps);
  }
  const workers = opt.workers === undefined ? undefined : Number(opt.workers);
  if (workers !== undefined && (!Number.isInteger(workers) || workers < 1 || workers > 16)) throw new Error('workers must be an integer from 1 to 16');
  return { profile, selected, range, workers, settings: { ...PROFILES[profile], fps: PROFILES[profile].fps ?? cfg.fps } };
}
