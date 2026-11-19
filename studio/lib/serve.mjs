// Tiny static file server for composer pages (ES modules cannot load from file://) and for the local site/lab/gallery previews.
// Loopback only, GET/HEAD only. Byte ranges are answered so <video>/<audio> can seek; a folder URL serves its index.html.
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { resolve, relative, isAbsolute, extname, join } from 'node:path';

export const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.xml': 'application/xml', '.map': 'application/json', '.webmanifest': 'application/manifest+json', '.wasm': 'application/wasm', '.pdf': 'application/pdf',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.vtt': 'text/vtt; charset=utf-8', '.srt': 'text/plain; charset=utf-8',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
};

// placeholder: answer missing images with a 1×1 grey PNG. ONLY for compatibility smoke tests of films
// whose client photos are intentionally not in git — never for real renders.
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNoaGj4DwAFhAKAjM1mJgAAAABJRU5ErkJggg==', 'base64');
// Containment by path components, not a string prefix: `root-private` shares the prefix of `root` (audit B01).
export function inside(root, urlPath) {
  const base = resolve(root), path = resolve(base, '.' + urlPath);
  const rel = relative(base, path);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel)) ? path : null;
}
// One HTTP byte range against a file of `size` bytes (RFC 9110 §14): { start, end } to send, null when the header is absent or
// not a single well-formed bytes range (answer 200 with the whole file), false when it cannot be satisfied (answer 416).
export function parseRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(header || '').trim());
  if (!m || (m[1] === '' && m[2] === '')) return null;
  if (m[1] === '') { const n = +m[2]; return n > 0 && size > 0 ? { start: Math.max(0, size - n), end: size - 1 } : false; }   // suffix: the last n bytes
  const start = +m[1], end = m[2] === '' ? size - 1 : Math.min(+m[2], size - 1);
  if (m[2] !== '' && +m[2] < start) return null;
  return start < size ? { start, end } : false;
}
// cache: the Cache-Control value. Renders load the same modules for every worker (default: an hour); the site, lab and gallery
// previews pass 'no-cache' so an edit shows on the next reload instead of an hour later.
export function serve(root, { placeholder = false, cache = 'max-age=3600' } = {}) {
  return new Promise((res, rej) => {
    const server = createServer(async (req, rsp) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') { rsp.writeHead(405, { allow: 'GET, HEAD' }); return rsp.end(); }
      let path, url;
      try { url = new URL(req.url, 'http://x'); path = inside(root, decodeURIComponent(url.pathname)); }
      catch { rsp.writeHead(400); return rsp.end(); } // malformed %-escape (audit B02)
      if (!path) { rsp.writeHead(403); return rsp.end(); }
      try {
        let info = await stat(path);
        if (info.isDirectory()) {
          // without the trailing slash the page's relative links would resolve one folder too high
          if (!url.pathname.endsWith('/')) { rsp.writeHead(301, { location: url.pathname + '/' + url.search }); return rsp.end(); }
          path = join(path, 'index.html'); info = await stat(path);
        }
        const head = { 'content-type': TYPES[extname(path).toLowerCase()] || 'application/octet-stream', 'cache-control': cache, 'accept-ranges': 'bytes', 'x-content-type-options': 'nosniff' };
        const range = parseRange(req.headers.range, info.size);
        if (range === false) { rsp.writeHead(416, { 'content-range': `bytes */${info.size}` }); return rsp.end(); }
        if (range) {
          rsp.writeHead(206, { ...head, 'content-range': `bytes ${range.start}-${range.end}/${info.size}`, 'content-length': range.end - range.start + 1 });
          if (req.method === 'HEAD') return rsp.end();
          return createReadStream(path, range).on('error', () => rsp.destroy()).pipe(rsp);
        }
        if (req.method === 'HEAD') { rsp.writeHead(200, { ...head, 'content-length': info.size }); return rsp.end(); }
        const body = await readFile(path);
        rsp.writeHead(200, { ...head, 'content-length': body.length });
        rsp.end(body);
      } catch {
        if (placeholder && /\.(png|jpe?g)$/i.test(path)) { rsp.writeHead(200, { 'content-type': 'image/png', 'x-placeholder': '1' }); return rsp.end(PIXEL); }
        rsp.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); rsp.end('not found');
      }
    });
    server.once('error', rej);
    server.listen(0, '127.0.0.1', () => res({ server, port: server.address().port, close: () => server.close() }));
  });
}
