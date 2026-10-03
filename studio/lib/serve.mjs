// Tiny static file server for composer pages (ES modules cannot load from file://).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute, extname } from 'node:path';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.wav': 'audio/wav' };

// placeholder: answer missing images with a 1×1 grey PNG. ONLY for compatibility smoke tests of films
// whose client photos are intentionally not in git — never for real renders.
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNoaGj4DwAFhAKAjM1mJgAAAABJRU5ErkJggg==', 'base64');
// Containment by path components, not a string prefix: `root-private` shares the prefix of `root` (audit B01).
export function inside(root, urlPath) {
  const base = resolve(root), path = resolve(base, '.' + urlPath);
  const rel = relative(base, path);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel)) ? path : null;
}
export function serve(root, { placeholder = false } = {}) {
  return new Promise((res, rej) => {
    const server = createServer(async (req, rsp) => {
      let path;
      try { path = inside(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)); }
      catch { rsp.writeHead(400); return rsp.end(); } // malformed %-escape (audit B02)
      if (!path) { rsp.writeHead(403); return rsp.end(); }
      try {
        const body = await readFile(path);
        rsp.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream', 'cache-control': 'max-age=3600' });
        rsp.end(body);
      } catch {
        if (placeholder && /\.(png|jpe?g)$/i.test(path)) { rsp.writeHead(200, { 'content-type': 'image/png', 'x-placeholder': '1' }); return rsp.end(PIXEL); }
        rsp.writeHead(404); rsp.end('not found');
      }
    });
    server.once('error', rej);
    server.listen(0, '127.0.0.1', () => res({ server, port: server.address().port, close: () => server.close() }));
  });
}
