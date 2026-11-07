// Text-first evidence for local, authorized video. No visual semantics are inferred here.
import { resolve } from 'node:path';
import { statSync } from 'node:fs';
import { work } from './common.mjs';

function localFile(source) {
  if (!source || !statSync(resolve(source), { throwIfNoEntry: false })?.isFile()) {
    throw new Error('Supply a local file you are authorized to analyze.');
  }
  return resolve(source);
}

export async function frameIndex(source) {
  const input = localFile(source);
  const { stdout } = await work('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0', '-show_frames',
    '-show_entries', 'frame=best_effort_timestamp_time,duration_time,pkt_duration_time,key_frame,pict_type',
    '-of', 'json', input,
  ], { timeout: 120000, maxBytes: 32 << 20 });
  const frames = JSON.parse(stdout).frames;
  if (!frames?.length) throw new Error('No decoded video frames found.');
  return {
    timebase: 'source presentation time, seconds; null when unavailable',
    keyframeMeaning: 'codec keyframe, independent of artistic cuts',
    count: frames.length,
    columns: ['index', 'time', 'duration', 'keyframe', 'pictureType'],
    frames: frames.map((frame, index) => [
      index,
      frame.best_effort_timestamp_time ?? null,
      frame.duration_time ?? frame.pkt_duration_time ?? null,
      frame.key_frame ?? null,
      frame.pict_type ?? null,
    ]),
  };
}

export async function frameText(source, lang = 'eng') {
  const input = localFile(source);
  if (typeof lang !== 'string' || !/^[a-z0-9_]+(?:\+[a-z0-9_]+)*$/.test(lang)) {
    throw new Error('Use a Tesseract language such as eng or ara+eng.');
  }
  const { stdout } = await work('tesseract', [input, 'stdout', '-l', lang], {
    timeout: 30000,
    maxBytes: 1 << 20,
  });
  return { method: 'Tesseract OCR; verify against the frame', language: lang, text: stdout.toString('utf8').trim() };
}
