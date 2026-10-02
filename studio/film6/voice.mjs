#!/usr/bin/env node
// Render the film-6 voiceover lines (voice/script.json) to voice/<id>.mp3 with tools/tts_edge.py, then report
// each line's spoken length against its slot. Needs `pip install edge-tts` and network access to the voice host.
// Usage (from studio/): SSL_CERT_FILE=<proxy CA bundle, if any> node film6/voice.mjs [--voice=ar-EG-SalmaNeural]
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const script = JSON.parse(readFileSync(join(HERE, 'voice/script.json'), 'utf8'));
const arg = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')));
const voice = arg.voice || script.voice, rate = arg.rate || script.rate, pitch = arg.pitch || script.pitch;
for (const line of script.lines) {
  const out = join(HERE, 'voice', `${line.id}.mp3`);
  execFileSync('python3', [join(HERE, '../tools/tts_edge.py'), voice, rate, pitch, out, line.text], { stdio: 'inherit' });
  const len = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]).toString());
  const slot = line.end - line.t;
  console.log(`${line.id} ${len.toFixed(2)} s / slot ${slot.toFixed(2)} s ${len > slot ? '  ← TOO LONG: shorten text or raise rate' : ''}`);
}
