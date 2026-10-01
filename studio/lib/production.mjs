// Cheap content checks before Chromium starts. Findings are evidence, not an aesthetic score.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const filled = value => typeof value === 'string' && value.trim().length > 0;

export function copyIssues(text, duration, { minDwell = 1.8, maxCps = 17, maxWords = 7 } = {}) {
  const issues = [];
  if (typeof text !== 'string' || !text.trim()) return ['empty copy'];
  const clean = text.trim().normalize('NFC');
  const chars = [...clean.replace(/[\u064B-\u065F\u0670\u0640]/gu, '')].length;
  if (!Number.isFinite(duration) || duration < minDwell) issues.push(`readable hold must be at least ${minDwell}s`);
  if (duration > 0 && chars / duration > maxCps) issues.push(`reading speed ${(chars / duration).toFixed(1)} > ${maxCps} characters/s`);
  if (clean.split(/\s+/u).length > maxWords) issues.push(`more than ${maxWords} words; shorten or split the line`);
  if (/\s+[،؟؛]/u.test(clean)) issues.push('space before Arabic punctuation');
  if (/[٠-٩]/u.test(clean) && /[0-9]/u.test(clean)) issues.push('mixed Arabic-Indic and Latin digits');
  return issues;
}

export function validateProduction(plan, { root, final = false } = {}) {
  const errors = [], warnings = [];
  const add = (message, blocking = true) => (blocking ? errors : warnings).push(message);
  if (!plan || typeof plan !== 'object') return { errors: ['production plan must be an object'], warnings };
  if (plan.version !== 1) add('production.version must be 1');
  for (const field of ['audience', 'promise', 'cta', 'direction'])
    if (typeof plan[field] !== 'string' || !plan[field].trim()) add(`production.${field} is required`);
  if (!(Number.isFinite(plan.duration) && plan.duration > 0)) add('production.duration must be positive');
  if (!(Number.isInteger(plan.fps) && plan.fps > 0 && plan.fps <= 120)) add('production.fps must be 1..120');
  const assets = new Map();
  if (!Array.isArray(plan.assets)) add('production.assets must be an array');
  for (const asset of Array.isArray(plan.assets) ? plan.assets : []) {
    if (!asset?.id || assets.has(asset.id)) { add('asset IDs must be unique and nonempty'); continue; }
    assets.set(asset.id, asset);
    if (!['product', 'reference', 'background', 'logo', 'music', 'sfx'].includes(asset.role)) add(`${asset.id}: invalid asset role`);
    if (!filled(asset.rights)) add(`${asset.id}: record owner/permission/license`, final);
    if (typeof asset.path !== 'string' || !asset.path.trim()) add(`${asset.id}: local path required`);
    else if (root && !existsSync(resolve(root, asset.path))) add(`${asset.id}: missing asset ${asset.path}`);
  }
  if (!Array.isArray(plan.shots) || !plan.shots.length) add('production.shots must be a nonempty array');
  let covered = 0, lastStart = -1;
  const ids = new Set(), epsilon = 1 / (plan.fps || 30) + 1e-6;
  for (const shot of Array.isArray(plan.shots) ? plan.shots : []) {
    if (!shot || typeof shot !== 'object') { add('shot must be an object'); continue; }
    const id = shot.id || '(unnamed shot)';
    if (!shot.id || ids.has(shot.id)) add(`${id}: shot IDs must be unique`);
    ids.add(shot.id);
    if (!Number.isFinite(shot.start) || !Number.isFinite(shot.end) || shot.start < 0 || shot.end <= shot.start || shot.end > plan.duration + epsilon) {
      add(`${id}: invalid shot interval`); continue;
    }
    if (shot.start < lastStart) add(`${id}: shots must be ordered by start`);
    if (shot.start > covered + epsilon) add(`${id}: uncovered timeline before ${shot.start}s`);
    covered = Math.max(covered, shot.end); lastStart = shot.start;
    if (!filled(shot.purpose)) add(`${id}: state why this shot exists`);
    if (!Array.isArray(shot.assetIds)) add(`${id}: assetIds must be an array`);
    for (const aid of Array.isArray(shot.assetIds) ? shot.assetIds : []) {
      if (!assets.has(aid)) add(`${id}: unknown asset ${aid}`);
      else if (assets.get(aid).role === 'reference') add(`${id}: mood reference ${aid} cannot stand in for product evidence`);
    }
    if (shot.claim && !filled(shot.evidence)) add(`${id}: factual claim needs evidence`);
    if (shot.copy) {
      const { text, start, end } = shot.copy;
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < shot.start || end > shot.end || end <= start)
        add(`${id}: readable copy interval must lie inside the shot`);
      for (const issue of copyIssues(text, end - start)) add(`${id}: ${issue}`, false);
    }
  }
  if (Math.abs(covered - plan.duration) > epsilon) add('shots must cover the complete duration');
  const sound = plan.sound;
  if (!sound || !['licensed', 'original'].includes(sound.mode)) add('sound.mode must be licensed or original');
  if (sound?.mode === 'licensed' && (!assets.has(sound.assetId) || assets.get(sound.assetId).role !== 'music')) add('licensed soundtrack must reference a music asset');
  if (sound?.mode === 'licensed' && !filled(sound.licenseScope)) add('record music license scope including paid social use', final);
  if (sound?.bpm !== undefined && !(Number.isFinite(sound.bpm) && sound.bpm > 0)) add('sound.bpm must be positive');
  return { errors, warnings };
}

export function loadProduction(root, cfg, { final = false } = {}) {
  if (!cfg.production) return { plan: null, errors: [], warnings: ['Legacy film: no production.json; content preflight unavailable. Add it when revising the film.'] };
  if (!filled(cfg.production)) return { plan: null, errors: ['config.production must be a local JSON path'], warnings: [] };
  const path = resolve(root, cfg.production);
  let plan;
  try { plan = JSON.parse(readFileSync(path, 'utf8')); }
  catch (error) { return { plan: null, errors: [`Cannot read production plan: ${error.message}`], warnings: [] }; }
  const result = validateProduction(plan, { root, final });
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) return { plan: null, ...result };
  if (plan.fps !== cfg.fps) result.errors.push('production fps differs from config fps');
  for (const d of cfg.deliveries || []) {
    if (!d.segments && Math.abs(d.duration - plan.duration) > 1 / cfg.fps) result.errors.push(`${d.name}: duration differs from production plan`);
  }
  return { plan, ...result };
}

// Frames on both sides of every boundary, plus reading/hero holds. Selection is not certification.
export function reviewTimes(plan, { range = [0, plan.duration] } = {}) {
  const fps = plan.fps, [start, end] = range;
  if (!(fps > 0 && start >= 0 && end > start && end <= plan.duration)) throw new Error('invalid review range');
  const first = Math.ceil(start * fps), last = Math.ceil(end * fps) - 1;
  if (last < first) throw new Error('review range contains no frame');
  const frames = new Set([first, last]);
  const add = t => { const frame = Math.round(t * fps); if (frame >= first && frame <= last) frames.add(frame); };
  for (const shot of plan.shots) {
    for (const t of [shot.start - 1 / fps, shot.start, shot.start + 1 / fps, (shot.start + shot.end) / 2, shot.end - 1 / fps]) add(t);
    if (shot.copy) { add(shot.copy.start); add((shot.copy.start + shot.copy.end) / 2); }
  }
  return [...frames].sort((a, b) => a - b).map(f => f / fps);
}
