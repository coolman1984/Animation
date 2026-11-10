// Tiny static file server for composer pages (ES modules cannot load from file://).
import { createServer } from 'node:http';
import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { resolve, relative, isAbsolute, extname } from 'node:path';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.css': 'text/css; charset=utf-8', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.wav': 'audio/wav',
  // media and 3D files films load (audit S4): video seeking needs both the type and byte ranges
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.wasm': 'application/wasm', '.woff': 'font/woff', '.otf': 'font/otf', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.hdr': 'image/vnd.radiance', '.ktx2': 'image/ktx2', '.gif': 'image/gif', '.avif': 'image/avif' };

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
        const st = await stat(path); if (!st.isFile()) throw new Error('not a file');
        const type = TYPES[extname(path).toLowerCase()] || 'application/octet-stream', size = st.size;
        const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
        if (range) {
          const start = range[1] ? +range[1] : size - +range[2], end = range[1] && range[2] ? Math.min(+range[2], size - 1) : size - 1;
          if (!(start >= 0 && start <= end)) { rsp.writeHead(416, { 'content-range': `bytes */${size}` }); return rsp.end(); }
          rsp.writeHead(206, { 'content-type': type, 'accept-ranges': 'bytes', 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1, 'cache-control': 'max-age=3600' });
          return createReadStream(path, { start, end }).pipe(rsp);
        }
        rsp.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': size, 'cache-control': 'max-age=3600' });
        createReadStream(path).pipe(rsp);
      } catch {
        if (placeholder && /\.(png|jpe?g)$/i.test(path)) { rsp.writeHead(200, { 'content-type': 'image/png', 'x-placeholder': '1' }); return rsp.end(PIXEL); }
        rsp.writeHead(404); rsp.end('not found');
      }
    });
    server.once('error', rej);
    server.listen(0, '127.0.0.1', () => res({ server, port: /** @type {import('node:net').AddressInfo} */ (server.address()).port, close: () => server.close() }));
  });
}
