// Local review server for the playback player (lib/review-player.html). Serves one film's out/<film>/ folder with HTTP
// Range (so <video> can seek frame by frame) and stores notes + approval next to each export:
//   <video>.review.json = { notes: [...], approval: { sha256, reviewer, at, openMajor } }
// An approval is bound to the file's SHA-256: re-exporting the file voids it (the player shows "approval is VOID").
// Loopback only. Started by `node studio.mjs review <film|take>`.
import { createServer } from 'node:http';
import { createReadStream, statSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { extname } from 'node:path';
import { inside } from './serve.mjs';

const TYPES = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.m4a': 'audio/mp4', '.vtt': 'text/vtt', '.srt': 'text/plain; charset=utf-8' };
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
      const size = statSync(file).size, type = TYPES[extname(file)] || 'application/octet-stream';
      const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
      if (range) {
        const start = range[1] ? +range[1] : size - +range[2], end = range[1] && range[2] ? Math.min(+range[2], size - 1) : size - 1;
        if (!(start >= 0 && start <= end)) { rsp.writeHead(416, { 'content-range': `bytes */${size}` }); return rsp.end(); }
        rsp.writeHead(206, { 'content-type': type, 'accept-ranges': 'bytes', 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1 });
        return createReadStream(file, { start, end }).pipe(rsp);
      }
      rsp.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': size, 'cache-control': 'no-cache' });
      createReadStream(file).pipe(rsp);
    } catch { rsp.writeHead(400); rsp.end(); }
  });
  return new Promise((res, rej) => { server.once('error', rej); server.listen(port, '127.0.0.1', () => res({ server, port: server.address().port, close: () => server.close() })); });
}
