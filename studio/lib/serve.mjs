// Tiny static file server for composer pages (ES modules cannot load from file://).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.wav': 'audio/wav' };

export function serve(root) {
  return new Promise((res) => {
    const server = createServer(async (req, rsp) => {
      const path = normalize(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
      if (!path.startsWith(root)) { rsp.writeHead(403); return rsp.end(); }
      try {
        const body = await readFile(path);
        rsp.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream', 'cache-control': 'max-age=3600' });
        rsp.end(body);
      } catch { rsp.writeHead(404); rsp.end('not found'); }
    });
    server.listen(0, '127.0.0.1', () => res({ server, port: server.address().port, close: () => server.close() }));
  });
}
