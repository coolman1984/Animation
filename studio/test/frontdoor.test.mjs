// Front door, local servers and the any-model door after the 2026-11-11 improvement pass. All fast: no browser, no ffmpeg.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { COMMANDS, HELP, helpCommands, helpText, nearest, main } from '../studio.mjs';
import { serve, parseRange } from '../lib/serve.mjs';
import { reviewServer, sameOrigin } from '../lib/review-server.mjs';
import { argErrors, TOOLS } from '../mcp/server.mjs';
import { handshake } from '../lib/agents.mjs';
import { STUDIO } from '../lib/capabilities.mjs';

const quiet = () => { const lines = []; return { lines, io: { log: (m) => lines.push(String(m)), err: (m) => lines.push(String(m)) } }; };

test('help: every command that runs is listed, and nothing listed is missing', () => {
  assert.deepEqual(helpCommands().sort(), Object.keys(COMMANDS).sort());
  const all = helpText();
  for (const [, rows] of HELP) for (const [usage, about] of rows) { assert.ok(all.includes(usage), usage); assert.ok(about.length > 10, usage); }
  assert.match(helpText('web'), /web audit/); assert.doesNotMatch(helpText('web'), /mixcheck/);
  assert.match(helpText('sound'), /mixcheck/, 'a group title matches too');
  assert.match(helpText('zzzz'), /no command mentions/);
});

test('a mistyped command names the real one and exits 2; no command exits 0 with the help', async () => {
  assert.deepEqual(nearest('buld', Object.keys(COMMANDS)), ['build']);
  assert.deepEqual(nearest('dir', Object.keys(COMMANDS)), ['director']);
  assert.deepEqual(nearest('xqzw', Object.keys(COMMANDS)), []);
  const a = quiet(); assert.equal(await main(['galery'], a.io), 2); assert.match(a.lines.join('\n'), /unknown command "galery" — did you mean: gallery\?/);
  const b = quiet(); assert.equal(await main([], b.io), 0); assert.match(b.lines[0], /Studio front door/);
  const c = quiet(); assert.equal(await main(['web', '--help'], c.io), 0); assert.match(c.lines.join('\n'), /web plan/);
});

test('wrong input is one readable line: usage exits 2, a failure exits 1, and nothing half-made is written', async () => {
  for (const argv of [['new', 'zz-frontdoor', '--duration=abc'], ['new', 'zz-frontdoor', '--duration'], ['new', 'zz-frontdoor', '--fps=0'], ['new', 'zz-frontdoor', '--placement=cinema']]) {
    const q = quiet(); assert.equal(await main(argv, q.io), 2, argv.join(' ')); assert.equal(q.lines.length, 1); assert.match(q.lines[0], /^usage: /);
    assert.equal(existsSync(join(STUDIO, 'zz-frontdoor')), false, 'no film folder for a refused request');
  }
  for (const argv of [['route'], ['mixcheck'], ['director'], ['director', 'review'], ['voice', 'nope'], ['storyboard', 'zz-none'], ['web'], ['moves', 'search'], ['sfx']]) {
    const q = quiet(); assert.equal(await main(argv, q.io), 2, argv.join(' ')); assert.match(q.lines[0], /^usage: /, argv.join(' '));
  }
  for (const [argv, say] of [[['director', 'review', 'zz-none'], /no Studio Engine film "zz-none".*director plan zz-none/], [['build', 'zz-none'], /no film "zz-none"/], [['review', 'zz-none'], /nothing to review for "zz-none"/], [['mixcheck', 'zz-none.wav'], /no such file/], [['styles', 'zz-none'], /unknown style/]]) {
    const q = quiet(); assert.equal(await main(argv, q.io), 1, argv.join(' ')); assert.match(q.lines[0], /^error: /); assert.match(q.lines[0], say);
    assert.ok(!q.lines.join('\n').includes('    at '), 'no stack trace unless --debug');
  }
  // an unknown style is refused before the plan is written
  const q = quiet(); assert.equal(await main(['director', 'plan', 'zz-frontdoor-plan', '--placement=reels', '--duration=15', '--style=zz-none'], q.io), 1);
  assert.equal(existsSync(join(STUDIO, 'studio-engine', 'films', 'zz-frontdoor-plan')), false);
});

test('static server: byte ranges, HEAD, folder index, media types, and a cache the previews can turn off', async () => {
  assert.deepEqual(parseRange('bytes=10-19', 1000), { start: 10, end: 19 });
  assert.deepEqual(parseRange('bytes=990-', 1000), { start: 990, end: 999 });
  assert.deepEqual(parseRange('bytes=-100', 1000), { start: 900, end: 999 });
  assert.deepEqual(parseRange('bytes=-5000', 1000), { start: 0, end: 999 }, 'a suffix longer than the file is the whole file');
  assert.deepEqual(parseRange('bytes=0-99999', 1000), { start: 0, end: 999 });
  assert.equal(parseRange('bytes=1000-', 1000), false); assert.equal(parseRange('bytes=-0', 1000), false);
  for (const h of [undefined, '', 'bytes=', 'bytes=-', 'items=0-5', 'bytes=5-2', 'bytes=0-1,5-6']) assert.equal(parseRange(h, 1000), null, String(h));

  const root = mkdtempSync(join(tmpdir(), 'serve2-')); mkdirSync(join(root, 'site'));
  writeFileSync(join(root, 'site', 'index.html'), '<h1>ok</h1>'); writeFileSync(join(root, 'clip.mp4'), Buffer.alloc(1000, 7)); writeFileSync(join(root, 'UPPER.PNG'), 'x');
  const dev = await serve(root, { cache: 'no-cache' }), base = `http://127.0.0.1:${dev.port}`;
  try {
    const r = await fetch(`${base}/clip.mp4`, { headers: { range: 'bytes=10-19' } });
    assert.equal(r.status, 206); assert.equal(r.headers.get('content-range'), 'bytes 10-19/1000'); assert.equal(r.headers.get('content-type'), 'video/mp4'); assert.equal((await r.arrayBuffer()).byteLength, 10);
    assert.equal((await fetch(`${base}/clip.mp4`, { headers: { range: 'bytes=2000-' } })).status, 416);
    const whole = await fetch(`${base}/clip.mp4`); assert.equal(whole.status, 200); assert.equal(whole.headers.get('accept-ranges'), 'bytes'); assert.equal(whole.headers.get('cache-control'), 'no-cache'); assert.equal((await whole.arrayBuffer()).byteLength, 1000);
    const head = await fetch(`${base}/clip.mp4`, { method: 'HEAD' }); assert.equal(head.status, 200); assert.equal(head.headers.get('content-length'), '1000'); assert.equal((await head.arrayBuffer()).byteLength, 0);
    const index = await fetch(`${base}/site/`); assert.equal(index.status, 200); assert.match(await index.text(), /<h1>ok/); assert.match(index.headers.get('content-type'), /text\/html/);
    const bare = await fetch(`${base}/site`, { redirect: 'manual' }); assert.equal(bare.status, 301); assert.equal(bare.headers.get('location'), '/site/');
    assert.equal((await fetch(`${base}/UPPER.PNG`)).headers.get('content-type'), 'image/png', 'the extension is matched whatever its case');
    assert.equal((await fetch(`${base}/site/index.html`, { method: 'POST' })).status, 405);
    assert.equal((await fetch(`${base}/nope.css`)).status, 404);
  } finally { dev.close(); }
  const render = await serve(root);
  try { assert.equal((await fetch(`http://127.0.0.1:${render.port}/site/index.html`)).headers.get('cache-control'), 'max-age=3600', 'renders keep the hour-long cache'); }
  finally { render.close(); rmSync(root, { recursive: true, force: true }); }
});

test('review server: only its own page may write notes or approvals', async () => {
  assert.equal(sameOrigin({ host: '127.0.0.1:8765' }), true);
  assert.equal(sameOrigin({ host: '127.0.0.1:8765', origin: 'http://127.0.0.1:8765' }), true);
  assert.equal(sameOrigin({ host: 'localhost:8765', origin: 'http://localhost:8765' }), true);
  assert.equal(sameOrigin({ host: '127.0.0.1:8765', origin: 'https://evil.example' }), false, 'another site open in the reviewer\'s browser');
  assert.equal(sameOrigin({ host: 'evil.example:8765', origin: 'http://evil.example:8765' }), false, 'DNS rebinding names its own host');
  assert.equal(sameOrigin({ host: '127.0.0.1:8765', origin: 'null' }), false);
  const root = mkdtempSync(join(tmpdir(), 'review2-')); mkdirSync(join(root, 'take01'));
  writeFileSync(join(root, 'take01', 'v.mp4'), Buffer.alloc(1000, 7));
  const srv = await reviewServer(root), base = `http://127.0.0.1:${srv.port}`;
  try {
    const approve = (headers) => fetch(`${base}/take01/review/api/approve`, { method: 'POST', headers, body: JSON.stringify({ video: 'take01/v.mp4', reviewer: 'x' }) });
    assert.equal((await approve({ origin: 'https://evil.example' })).status, 403);
    assert.equal(existsSync(join(root, 'take01', 'v.mp4.review.json')), false, 'a forged approval writes nothing');
    assert.equal((await fetch(`${base}/take01/review/api/approve?video=take01/v.mp4`)).status, 405, 'approval is a POST');
    assert.equal((await approve({ origin: base })).status, 200);
    const tail = await fetch(`${base}/take01/v.mp4`, { headers: { range: 'bytes=-5000' } });
    assert.equal(tail.status, 206); assert.equal((await tail.arrayBuffer()).byteLength, 1000);
  } finally { srv.close(); rmSync(root, { recursive: true, force: true }); }
});

test('MCP: arguments are checked against the tool schema, and paths by folder, not by prefix', async () => {
  const plan = TOOLS.find((t) => t.name === 'film_plan').inputSchema;
  assert.deepEqual(argErrors(plan, { film: 'x', placement: 'reels', duration: 15 }), []);
  assert.deepEqual(argErrors(plan, { film: 'x', placement: 'reels', duration: 15, force: null }), [], 'null is "not given"');
  assert.match(argErrors(plan, { film: 'x', placement: 'reels' }).join(), /"duration" is required/);
  assert.match(argErrors(plan, { film: 'x', placement: 'tiktok', duration: 15 }).join(), /"placement" must be one of: reels, youtube/);
  assert.match(argErrors(plan, { film: 'x', placement: 'reels', duration: '15' }).join(), /"duration" must be an integer \(got string\)/);
  assert.match(argErrors(plan, { film: 'x', placement: 'reels', duration: 500 }).join(), /at most 90/);
  assert.match(argErrors(plan, { film: 7, placement: 'reels', duration: 15 }).join(), /"film" must be a string/);
  const inspect = TOOLS.find((t) => t.name === 'film_inspect').inputSchema;
  assert.match(argErrors(inspect, { film: 'x', times: [1, 'two'] }).join(), /every item of "times" must be a number/);
  assert.match(argErrors(inspect, { film: 'x', times: Array(30).fill(1) }).join(), /at most 24 items/);
  assert.deepEqual(argErrors(inspect, { film: 'x', times: [1, 2.5] }), []);
  assert.deepEqual(argErrors(plan, []), ['arguments must be an object']);

  // studio/out-zz is a sibling of studio/out: a prefix test let it through
  const sibling = join(STUDIO, 'out-zz-frontdoor'); mkdirSync(sibling, { recursive: true }); writeFileSync(join(sibling, 'x.mp4'), 'x');
  try { await assert.rejects(TOOLS.find((t) => t.name === 'film_taste').run({ video: 'out-zz-frontdoor/x.mp4' }), /under studio\/out or studio\/takes/); }
  finally { rmSync(sibling, { recursive: true, force: true }); }

  const film = 'zz-frontdoor-mcp', dir = join(STUDIO, 'studio-engine', 'films', film);
  rmSync(dir, { recursive: true, force: true });
  try {
    const h = await handshake({ calls: [['film_plan', { film, placement: 'reels', duration: '15' }], ['film_plan', { film, placement: 'reels', duration: 15, style: 'zz-none' }], ['film_list', {}]] });
    const [typed, style, list] = h.calls.map((c) => c.result);
    assert.equal(typed.isError, true); assert.match(typed.content[0].text, /film_plan: "duration" must be an integer/);
    assert.equal(style.isError, true); assert.match(style.content[0].text, /unknown style/);
    assert.equal(existsSync(dir), false, 'a refused plan leaves no half-made film');
    assert.ok(JSON.parse(list.content[0].text).length > 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
