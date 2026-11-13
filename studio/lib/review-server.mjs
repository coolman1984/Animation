// Local review server for the playback player (lib/review-player.html). Serves one film's out/<film>/ folder with HTTP
// Range (so <video> can seek frame by frame) and stores notes + approval next to each export:
//   <video>.review.json = { notes: [...], approval: { sha256, reviewer, at, openMajor } }
// An approval is bound to the file's SHA-256: re-exporting the file voids it (the player shows "approval is VOID").
// Loopback only. Started by `node studio.mjs review <film|take>`.
import { createServer } from 'node:http';
import { createReadStream, statSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { extname } from 'node:path';
import { inside, parseRange, TYPES } from './serve.mjs';

// Notes and approvals are written by this server, so only its own page may call the API: a request must name this loopback
// host (a DNS-rebinding page names its own), and a browser request from another origin (any site the reviewer has open could
// POST here) is refused. Tools without an Origin header (curl, tests) still work.
const LOOPBACK = /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/;
export function sameOrigin(headers) {
  if (!LOOPBACK.test(String(headers.host || ''))) return false;
  if (headers.origin === undefined) return true;
  try { return new URL(headers.origin).host === headers.host; } catch { return false; }
}
const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const store = (file) => file + '.review.json';
const readStore = (file) => { try { return JSON.parse(readFileSync(store(file), 'utf8')); } catch { return { notes: [], approval: null }; } };

export function reviewServer(root, { port = 0 } = {}) {
  const body = (req) => new Promise((res, rej) => { let s = ''; req.on('data', (d) => { s += d; if (s.length > 2e6) req.destroy(); }); req.on('end', () => { try { res(JSON.parse(s || '{}')); } catch (e) { rej(e); } }); });
  const json = (rsp, code, value) => { rsp.writeHead(code, { 'content-type': 'application/json' }); rsp.end(JSON.stringify(value)); };
  const server = createServer(async (req, rsp) => {
    try {
      const url = new URL(req.url, 'http://x'), path = decodeURIComponent(url.pathname);
      const api = path.match(/\/api\/(state|notes|approve)$/)?.[1];
      if (api) {
        if (!sameOrigin(req.headers)) return json(rsp, 403, { error: 'the review API only answers its own page' });
        if (api !== 'state' && req.method !== 'POST') return json(rsp, 405, { error: 'POST only' });
        const q = api === 'state' ? { video: url.searchParams.get('video') } : await body(req);
        const file = q.video && inside(root, '/' + q.video);
        if (!file || !existsSync(file) || extname(file) !== '.mp4') return json(rsp, 404, { error: 'unknown video' });
        const s = readStore(file);
        if (api === 'notes') { s.notes = Array.isArray(q.notes) ? q.notes.slice(0, 2000) : []; writeFileSync(store(file), JSON.stringify(s, null, 2)); }
        if (api === 'approve') { s.approval = { sha256: sha256(file), reviewer: String(q.reviewer || 'reviewer').slice(0, 80), at: new Date().toISOString(), openMajor: +q.openMajor || 0 }; writeFileSync(store(file), JSON.stringify(s, null, 2)); }
        return json(rsp, 200, { ...s, sha256: sha256(file) });
      }
      const file = inside(root, path.endsWith('/') ? path + 'index.html' : path);
      if (!file || !existsSync(file) || !statSync(file).isFile()) { rsp.writeHead(404); return rsp.end('not found'); }
      const size = statSync(file).size, type = TYPES[extname(file).toLowerCase()] || 'application/octet-stream';
      const range = parseRange(req.headers.range, size);   // a suffix longer than the file is the whole file, not an error
      if (range === false) { rsp.writeHead(416, { 'content-range': `bytes */${size}` }); return rsp.end(); }
      if (range) {
        const { start, end } = range;
        rsp.writeHead(206, { 'content-type': type, 'accept-ranges': 'bytes', 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1 });
        return createReadStream(file, { start, end }).pipe(rsp);
      }
      rsp.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': size, 'cache-control': 'no-cache' });
      createReadStream(file).pipe(rsp);
    } catch { rsp.writeHead(400); rsp.end(); }
  });
  return new Promise((res, rej) => { server.once('error', rej); server.listen(port, '127.0.0.1', () => res({ server, port: server.address().port, close: () => server.close() })); });
}
