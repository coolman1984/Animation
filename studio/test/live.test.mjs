// Live-action toolkit: edit decisions, captions, OTIO, dialogue graphs (+ real ffmpeg ducking), footage compositing in Chromium.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { keepRanges, cutWords, timeline, sourceTime, punchIns, zoomAt, pageCaptions, wordState, cutSfx, toOTIO, FILLERS_AR } from '../lib/edl.mjs';
import { polish, duck, stitch, mixGraph, render } from '../lib/dialogue.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const near = (a, b, e, m) => assert.ok(Math.abs(a - b) <= e, `${m}: ${a} vs ${b}`);

test('keepRanges pads speech, bridges short gaps and drops slivers (auto-editor style margin)', () => {
  const k = keepRanges([[1, 2], [2.2, 3], [5, 5.1], [8, 9]], { pad: 0.1, bridge: 0.35, minKeep: 0.4, duration: 8.95 });
  assert.deepEqual(k, [[0.9, 3.1], [7.9, 8.95]]);
  assert.throws(() => keepRanges(null), /speech/);
});

test('text-based cut: removing filler words becomes keep ranges', () => {
  const words = [{ w: 'أهلا', start: 0, end: 0.4 }, { w: 'اممم', start: 0.5, end: 1.4 }, { w: 'بيكم', start: 1.5, end: 1.9 }];
  const k = cutWords(words, (w) => FILLERS_AR.includes(w.w), { bridge: 0.1 });
  assert.equal(k.length, 2); near(k[0][1], 0.44, 1e-9, 'first keep ends after أهلا'); near(k[1][0], 1.46, 1e-9, 'second starts before بيكم');
});

test('timeline maps film time to source time exactly; J cuts lead the audio', () => {
  const clips = timeline([[1, 3], [5, 6]], { at: 0, jl: -0.3 });
  assert.deepEqual(clips.map((c) => [c.start, c.end]), [[0, 2], [2, 3]]);
  near(sourceTime(clips, 0.5).src, 1.5, 1e-9, 'inside clip 1'); near(sourceTime(clips, 2.0).src, 5, 1e-9, 'boundary belongs to clip 2');
  near(sourceTime(clips, 3).src, 6, 1e-9, 'end'); assert.equal(sourceTime(clips, 3.5), null);
  near(clips[1].audio.start, 1.7, 1e-9, 'J cut audio starts 0.3 s early'); near(clips[1].audio.in, 4.7, 1e-9, 'from 0.3 s earlier in the source');
  const plan = punchIns(clips, { scale: 1.12, push: 0 }); near(zoomAt(clips, plan, 0.5), 1, 1e-9, 'clip 1 wide'); near(zoomAt(clips, plan, 2.5), 1.12, 1e-9, 'clip 2 punched in');
  const sfx = cutSfx(clips, plan); assert.equal(sfx.length, 1); assert.equal(sfx[0].type, 'whoosh');
});

test('caption pages break at pauses and punctuation, respect limits and never overlap', () => {
  const W = (w, s, e) => ({ w, start: s, end: e });
  const pages = pageCaptions([W('أهلا', 0, 0.3), W('بيكم.', 0.3, 0.7), W('إحنا', 0.8, 1.1), W('بنعمل', 1.1, 1.4), W('إعلانات', 1.4, 1.9), W('كل', 3, 3.2)], { maxWords: 3, hold: 0.3 });
  assert.deepEqual(pages.map((p) => p.words.map((w) => w.w).join(' ')), ['أهلا بيكم.', 'إحنا بنعمل إعلانات', 'كل']);
  for (let i = 0; i + 1 < pages.length; i++) assert.ok(pages[i].end <= pages[i + 1].start);
  assert.equal(wordState(pages[1].words[1], 1.2), 'now'); assert.equal(wordState(pages[1].words[2], 1.2), 'next');
});

test('OTIO export is valid otio_json with frame-accurate source ranges', () => {
  const clips = timeline([[1, 3], [5, 6.5]]);
  const doc = JSON.parse(toOTIO(clips, { media: 'file:///footage/a.mp4', rate: 30, mediaDuration: 20 }));
  assert.equal(doc.OTIO_SCHEMA, 'Timeline.1'); assert.equal(doc.tracks.children.length, 2);
  const c = doc.tracks.children[0].children[1]; assert.equal(c.OTIO_SCHEMA, 'Clip.2');
  assert.deepEqual([c.source_range.start_time.value, c.source_range.duration.value], [150, 45]);
  const py = spawnSync('python3', ['-c', 'import sys,opentimelineio as o;t=o.adapters.read_from_string(sys.stdin.read(),"otio_json");print(len(t.video_tracks()[0]), t.duration().to_seconds())'], { input: JSON.stringify(doc), encoding: 'utf8' });
  if (py.status === 0) assert.equal(py.stdout.trim(), '2 3.5'); // parsed by the reference OpenTimelineIO library when installed
});

test('dialogue graphs: polish order, ducking keyed by the voice, click-free stitches', () => {
  const p = polish(); assert.ok(p.indexOf('afftdn') < p.indexOf('acompressor'), 'denoise before compression');
  assert.throws(() => polish({ denoise: 'arnndn' }), /model/);
  assert.match(duck(), /\[vk\]sidechaincompress/); assert.match(stitch([[0, 1], [2, 3]]), /concat=n=2:v=0:a=1\[cut\]/);
  assert.match(mixGraph(), /amix=inputs=2/);
});

test('ducking really lowers the music while the voice speaks (ffmpeg)', async () => {
  const dir = join(ROOT, 'takes', '_test-duck'); mkdirSync(dir, { recursive: true });
  try {
    const voice = join(dir, 'v.wav'), music = join(dir, 'm.wav'), out = join(dir, 'mix.wav');
    // voice: a 300 Hz "speaker" only from 2 to 4 s; music: pink noise all along
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'sine=f=300:d=6:sample_rate=48000', '-af', "volume='between(t,2,4)':eval=frame", voice]);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'anoisesrc=c=pink:d=6:a=0.3:r=48000', music]);
    const graph = `[1:a]volume=0dB[m];${duck({ voice: '0:a', music: 'm', out: 'md', threshold: 0.02, ratio: 10, attack: 10, release: 200, keepVoice: false })};[md]anull[mix]`;
    await render({ inputs: [voice, music], graph, out });
    const level = (a, b) => { const r = spawnSync('ffmpeg', ['-v', 'info', '-ss', String(a), '-t', String(b - a), '-i', out, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }); return +/mean_volume: (-?[\d.]+)/.exec(r.stderr)[1]; };
    const quiet = level(0.5, 1.8), ducked = level(2.6, 3.8);
    assert.ok(quiet - ducked > 4, `music should duck under the voice: ${quiet} dB vs ${ducked} dB`);
    const cut = join(dir, 'cut.wav'); await render({ inputs: [music], graph: stitch([[0, 1], [2, 3.5]]), map: '[cut]', out: cut });
    near(+execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', cut]).toString(), 2.5, 0.01, 'stitched jump-cut audio length');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

const enabled = process.env.STUDIO_RENDER_TEST === '1';
test('footage sandwich in Chromium: person cutout over behind-graphics, exact frames in any order', { skip: !enabled, timeout: 90000 }, async () => {
  const { stills } = await import('../lib/render.mjs');
  const pack = join(ROOT, 'takes', '_test-footage'), out = join(ROOT, 'takes', '_test-footage-out');
  rmSync(pack, { recursive: true, force: true }); mkdirSync(join(pack, 'frames'), { recursive: true }); mkdirSync(join(pack, 'matte'), { recursive: true });
  try {
    // frames: a grey level that rises with the frame number; matte: a white disc in the middle (the "person")
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=black:s=160x90:r=30:d=1', '-vf', "geq=lum='20+N*6':cb=128:cr=128", '-q:v', '2', join(pack, 'frames', 'f%06d.jpg')]);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=black:s=160x90:r=30:d=1', '-vf', "geq=lum='if(lt(hypot(X-80,Y-45),25),255,0)':cb=128:cr=128", '-pix_fmt', 'gray', join(pack, 'matte', 'f%06d.png')]);
    writeFileSync(join(pack, 'pack.json'), JSON.stringify({ fps: 30, frames: 30, w: 160, h: 90 })); writeFileSync(join(pack, 'matte.json'), '{}');
    const film = join(ROOT, 'test', 'fixture', 'footage-film.js');
    await stills({ film, times: [0.5, 0.9, 0.5], outDir: out, w: 160, h: 90 });
    const px = (f, x, y) => execFileSync('ffmpeg', ['-v', 'error', '-i', join(out, f), '-vf', `crop=1:1:${x}:${y},format=rgb24`, '-f', 'rawvideo', '-']);
    const shots = ['t000.50.png', 't000.90.png'];
    const centre = px(shots[0], 80, 45), corner = px(shots[0], 5, 5), later = px(shots[1], 80, 45);
    assert.ok(corner[0] > 200 && corner[1] < 40, `outside the person the behind-graphic shows: ${[...corner]}`);
    assert.ok(Math.abs(centre[0] - centre[1]) < 12 && centre[0] < 200, `inside the person the footage shows: ${[...centre]}`);
    assert.ok(later[0] > centre[0] + 10, `frame at 0.9 s is brighter than at 0.5 s: ${later[0]} vs ${centre[0]}`);
  } finally { rmSync(pack, { recursive: true, force: true }); rmSync(out, { recursive: true, force: true }); }
});

const py = process.env.LIVE_PYTHON_TEST === '1';
test('live.py word timing on speech with known word edges (optional: models + TTS voice)', { skip: !py, timeout: 300000 }, () => {
  const r = spawnSync('python3', [join(ROOT, 'test', 'fixture', 'live_words.py')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr); const m = JSON.parse(r.stdout.trim().split('\n').pop());
  assert.ok(m.median <= 0.08, `median word-edge error ${m.median}s`); assert.ok(m.inside >= m.n - 3, `${m.inside}/${m.n} word centres inside the true word`);
});
