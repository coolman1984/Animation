import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { resolve, join, extname, basename } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { mediaProbe, safeURL, publicURL, work, save } from './common.mjs';
import { browserSource } from './browser.mjs';
export async function ingest(source, dir, opts = {}) {
  mkdirSync(join(dir, 'source'), { recursive: true });
  let local, page = opts.browser, route = 'local', url;
  if (/^https?:\/\//i.test(source)) {
    url = safeURL(source); route = 'direct-url';
    if (!page) {
      const rsp = await fetch(url, { signal: AbortSignal.timeout(25000) });
      if (!rsp.ok) throw new Error(`HTTP ${rsp.status}; access controls are not bypassed`);
      const type = rsp.headers.get('content-type') || '';
      if (/text\/html/i.test(type)) { await rsp.body?.cancel(); page = true; }
      else {
        if (/mpegurl|dash\+xml/i.test(type) || /\.(m3u8|mpd)$/i.test(url.pathname)) { await rsp.body?.cancel(); throw new Error('Adaptive/protected manifests are not downloaded. Use --browser for ordinary authorized playback.'); }
        local = join(dir, 'source', 'reference' + (extname(url.pathname).match(/^\.[a-z0-9]{1,5}$/i)?.[0] || '.media'));
        let bytes = 0; const limit = (opts.maxMB || 128) * 2**20;
        const budget = new Transform({ transform(b, _, cb) { bytes += b.length; cb(bytes > limit ? new Error('Reference download exceeds byte budget') : null, b); } });
        await pipeline(Readable.fromWeb(rsp.body), budget, createWriteStream(local));
      }
    }
  } else { if (opts.browser) throw new Error('--browser requires an HTTP(S) webpage'); local = resolve(source); if (!existsSync(local)) throw new Error('Local source not found'); }
  let handle;
  if (page) { handle = await browserSource(url.href, opts); route = 'browser'; }
  else {
    const metadata = await mediaProbe(local);
    handle = { local, metadata, async frame(t, file, { width = 1280 } = {}) {
      const grab = (at) => work('ffmpeg', ['-hide_banner', '-nostats', '-y', '-ss', String(at), '-copyts', '-i', local, '-an', '-vf', `scale='min(${width},iw)':-2,showinfo`, '-frames:v', '1', file]);
      let r = await grab(t);
      // A time just past the last decoded frame (variable-rate recordings) yields no image: step back once instead of failing the whole pack.
      if (!/pts_time/.test(r.stderr) && t > 0.2) r = await grab(Math.max(0, t - 0.2));
      const found = [...r.stderr.matchAll(/pts_time:([-\d.]+)/g)][0];
      return { requested: t, actual: found ? +found[1] : null, timestampSource: found ? 'decoded-frame-pts' : 'unavailable', capture: 'ffmpeg-decoded' };
    }, close: async () => {} };
  }
  const meta = handle.metadata;
  if (meta.duration > (opts.maxDuration || 300)) { await handle.close(); throw new Error(`Duration ${meta.duration}s exceeds analysis budget. Set --max-duration explicitly for longer media.`); }
  const provenance = { route, input: url ? publicURL(source) : local, privateRuntimeMedia: local ? route === 'direct-url' ? 'source/' + basename(local) : local : null, at: new Date().toISOString(), authorization: opts.rights || 'user-supplied analysis request; reuse rights NOT asserted', notes: ['Analysis does not establish permission to reuse media, audio, brand or likeness.', 'No DRM, session cookies, protected manifests or access-control bypass.'] };
  if(opts.record!==false){if(url)save(join(dir,'source/request.json'),{url:source,selector:opts.selector,frameURL:opts.frameURL,playSelector:opts.playSelector});save(join(dir, 'source.json'), provenance); save(join(dir, 'metadata.json'), meta);}
  return handle;
}
