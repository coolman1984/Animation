// Final-mix QA beyond loudness (lib/measure.mjs has LUFS / true peak / LRA): clipping, mono compatibility, phone-speaker
// survival, stereo phase. ONE ffmpeg launch with parallel branches. Numbers are advisory evidence: listen to the export.
import { run } from './render.mjs';

export async function mixCheck(file) {
  const { err } = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-filter_complex',
    '[0:a]aformat=channel_layouts=stereo,asplit=5[a][b][c][d][e];' +
    '[a]astats=measure_overall=Peak_level+Flat_factor+Peak_count:measure_perchannel=none[o1];' +
    '[b]ebur128@stereo=framelog=quiet[o2];' +
    '[c]pan=mono|c0=0.5*c0+0.5*c1,ebur128@mono=framelog=quiet[o3];' +
    '[d]highpass=f=300,lowpass=f=3400,ebur128@phone=framelog=quiet[o4];' +
    '[e]aphasemeter=video=0,ametadata=print:key=lavfi.aphasemeter.phase[o5]',
    ...[1, 2, 3, 4, 5].flatMap(i => ['-map', `[o${i}]`, '-f', 'null', '-'])]);
  const lufs = (name) => { const i = err.lastIndexOf(`[ebur128@${name}`), s = i < 0 ? '' : err.slice(i); const m = s.slice(s.indexOf('Summary:')).match(/I:\s+(-?[\d.]+) LUFS/); return m ? +m[1] : null; };
  const num = (re) => { const m = err.match(re); return m ? +m[1] : null; };
  const phases = [...err.matchAll(/aphasemeter\.phase=(-?[\d.]+)/g)].map(m => +m[1]);
  const r = {
    peakDb: num(/Peak level dB:\s+(-?[\d.inf]+)/), flatFactor: num(/Flat factor:\s+([\d.]+)/), peakCount: num(/Peak count:\s+([\d.]+)/),
    stereoLufs: lufs('stereo'), monoLufs: lufs('mono'), phoneLufs: lufs('phone'),
    phaseMean: phases.length ? +(phases.reduce((a, b) => a + b, 0) / phases.length).toFixed(3) : null,
    phaseMin: phases.length ? Math.min(...phases) : null,
  };
  const notes = [];
  if (r.peakDb !== null && r.peakDb > -0.1) notes.push(`peaks reach ${r.peakDb} dBFS: possible clipping (flat factor ${r.flatFactor}); keep true peak ≤ -1 dBTP`);
  // Identical L/R already measures 3 LU lower when folded to one channel (measured on a mono voice): warn beyond 4.5 LU.
  if (r.stereoLufs !== null && r.monoLufs !== null && r.stereoLufs - r.monoLufs > 4.5) notes.push(`mono fold-down loses ${(r.stereoLufs - r.monoLufs).toFixed(1)} LU: phase cancellation (wide synths/reverb); phones often play mono`);
  if (r.phaseMean !== null && r.phaseMean < 0.2) notes.push(`stereo phase mean ${r.phaseMean} (1 = mono-safe, < 0 = out of phase)`);
  if (r.stereoLufs !== null && r.phoneLufs !== null && r.stereoLufs - r.phoneLufs > 9) notes.push(`a phone speaker (300 Hz–3.4 kHz) keeps only ${(r.phoneLufs - r.stereoLufs).toFixed(1)} LU of the mix: bass-led; lift mids/voice so it survives small speakers`);
  return { ...r, notes };
}
