// Speed audit — our own small "Lighthouse" over the studio's zero-package CDP client (2026-11-06).
// Why our own: Lighthouse (GoogleChrome, Apache-2.0) is the score clients know, but it is a large npm tree and a second browser
// driver. Ideas taken from its design (LEARN; no code copied): a throttled phone profile (slow 4G, RTT 150 ms, 1.6 Mbps,
// CPU ×4, 412×823 at DPR 1.75), Core Web Vitals read from PerformanceObserver (FCP, LCP, CLS, TBT from long tasks), and its
// published log-normal scoring curves and weights. Speed Index needs a filmstrip, so it is left out and the other weights are
// renormalised: the number is an estimate and says so. Real Lighthouse runs instead when installed (`setup webperf`, --lighthouse).
//   speedAudit({ dir, page, outDir, lighthouse }) → { score, metrics, findings: [{ id, light, why }], source }
//   scoreMetric(id, value) → 0…1 (exported for tests)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { launch } from '../../lib/cdp.mjs';
import { serve } from '../../lib/serve.mjs';
import { findChromium } from '../../lib/doctor.mjs';

const STUDIO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PHONE = { w: 412, h: 823, dpr: 1.75, rtt: 150, kbps: 1638.4, cpu: 4 };
// Lighthouse 10–12 mobile control points (p10 = score 0.9, median = score 0.5) and weights; SI dropped, weights renormalised.
export const CURVES = { fcp: { p10: 1800, median: 3000, weight: 0.10 }, lcp: { p10: 2500, median: 4000, weight: 0.25 }, tbt: { p10: 200, median: 600, weight: 0.30 }, cls: { p10: 0.1, median: 0.25, weight: 0.25 } };

const erfc = (x) => { const z = Math.abs(x), t = 1 / (1 + z / 2); const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))); return x >= 0 ? r : 2 - r; };
export function scoreMetric(id, value) {
  const c = CURVES[id]; if (!c) throw new Error(`unknown metric ${id}`);
  if (value <= 0) return 1;
  const sigma = (Math.log(c.median) - Math.log(c.p10)) / 1.2815516;   // Φ⁻¹(0.9)
  return Math.min(1, Math.max(0, 0.5 * erfc((Math.log(value) - Math.log(c.median)) / (sigma * Math.SQRT2))));
}
export function totalScore(metrics) {
  const ids = Object.keys(CURVES), w = ids.reduce((s, k) => s + CURVES[k].weight, 0);
  return Math.round((100 * ids.reduce((s, k) => s + CURVES[k].weight * scoreMetric(k, metrics[k]), 0)) / w);
}

// Installed before any page script: buffered observers keep every entry from navigation start.
const OBSERVE = `(() => { const v = window.__vitals = { lcp: 0, cls: 0, long: [], fcp: 0 };
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) v.lcp = e.renderTime || e.loadTime || e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch {}
  try { let s = 0, last = 0, first = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) { if (e.hadRecentInput) continue; if (e.startTime - last > 1000 || e.startTime - first > 5000) { s = 0; first = e.startTime; } s += e.value; last = e.startTime; v.cls = Math.max(v.cls, s); } }).observe({ type: 'layout-shift', buffered: true }); } catch {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) v.long.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true }); } catch {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') v.fcp = e.startTime; }).observe({ type: 'paint', buffered: true }); } catch {}
})();`;

const COLLECT = `(() => { const v = window.__vitals, dpr = devicePixelRatio, H = innerHeight;
  const tbt = v.long.filter(([s]) => s >= v.fcp).reduce((t, [, d]) => t + Math.max(0, d - 50), 0);
  const res = performance.getEntriesByType('resource'), bytes = (u) => { const e = res.find((r) => r.name === u); return e ? (e.encodedBodySize || e.decodedBodySize || 0) : 0; };
  const images = [...document.images].map((img) => { const r = img.getBoundingClientRect(), src = img.currentSrc || img.src;
    return { src: src.split('/').pop(), natural: img.naturalWidth, shown: Math.round(r.width * dpr), bytes: bytes(src), sized: img.hasAttribute('width') && img.hasAttribute('height'),
      lazy: img.loading === 'lazy', below: r.top + scrollY > H * 1.2, modern: /\\.(webp|avif)(\\?|$)/i.test(src) || /image\\/(webp|avif)/.test(img.closest('picture')?.querySelector('source')?.type || '') }; });
  const fonts = res.filter((r) => /\\.(woff2?|ttf|otf)(\\?|$)/i.test(r.name)).map((r) => ({ file: r.name.split('/').pop(), bytes: r.encodedBodySize || r.decodedBodySize || 0 }));
  const blocking = res.filter((r) => r.renderBlockingStatus === 'blocking').map((r) => r.name.split('/').pop());
  const nav = performance.getEntriesByType('navigation')[0];
  return { fcp: Math.round(v.fcp), lcp: Math.round(v.lcp || v.fcp), cls: +v.cls.toFixed(3), tbt: Math.round(tbt), images, fonts, blocking,
    transferKB: Math.round((res.reduce((s, r) => s + (r.encodedBodySize || r.decodedBodySize || 0), 0) + (nav?.encodedBodySize || 0)) / 1024), requests: res.length + 1 };
})()`;

export function findings(m) {
  const out = [], add = (id, light, why) => out.push({ id, light, why });
  const fmt = (k) => (k === 'cls' ? m[k] : `${(m[k] / 1000).toFixed(1)} s`);
  for (const k of Object.keys(CURVES)) { const s = scoreMetric(k, m[k]); add(k, s >= 0.9 ? 'green' : s >= 0.5 ? 'yellow' : 'red', `${k.toUpperCase()} ${k === 'tbt' ? m[k] + ' ms' : fmt(k)} (score ${Math.round(s * 100)})`); }
  const big = m.images.filter((i) => i.natural && i.natural > i.shown * 1.5 && i.bytes > 30 * 1024);
  add('image-size', big.length ? 'yellow' : 'green', big.length ? big.slice(0, 4).map((i) => `${i.src} ${i.natural}px for ${i.shown}px`).join(' · ') + ' → node studio.mjs web images' : 'no image is much wider than it is shown');
  const old = m.images.filter((i) => !i.modern && i.bytes > 100 * 1024);
  add('image-format', old.length ? 'yellow' : 'green', old.length ? old.slice(0, 4).map((i) => `${i.src} ${Math.round(i.bytes / 1024)} KB`).join(' · ') + ' → WebP/AVIF (web images)' : 'large images are WebP/AVIF');
  const unsized = m.images.filter((i) => !i.sized), eager = m.images.filter((i) => i.below && !i.lazy);
  add('image-layout', unsized.length || eager.length ? 'yellow' : 'green', [...unsized.slice(0, 3).map((i) => `${i.src} has no width/height`), ...eager.slice(0, 3).map((i) => `${i.src} below the fold without loading=lazy`)].join(' · ') || 'images reserve their space; below-the-fold images load lazily');
  const fontKB = Math.round(m.fonts.reduce((s, f) => s + f.bytes, 0) / 1024), raw = m.fonts.filter((f) => !/\.woff2/i.test(f.file));
  add('fonts', fontKB > 150 || raw.length ? 'yellow' : 'green', `${m.fonts.length} font file(s), ${fontKB} KB${raw.length ? '; not WOFF2: ' + raw.map((f) => f.file).join(', ') : ''}${fontKB > 150 || raw.length ? ' → node studio.mjs web fonts' : ''}`);
  add('render-blocking', m.blocking.length > 2 ? 'yellow' : 'green', m.blocking.length ? `blocking: ${m.blocking.join(', ')}` : 'nothing blocks the first paint');
  return out;
}

function lighthouseCli() { const p = join(STUDIO, 'vendor', 'node_modules', 'lighthouse', 'cli', 'index.js'); return existsSync(p) ? p : null; }

export async function speedAudit({ dir, page = 'index.html', outDir, lighthouse = false }) {
  mkdirSync(outDir, { recursive: true });
  const srv = await serve(dir), url = `http://127.0.0.1:${srv.port}/${page}`;
  try {
    if (lighthouse) {
      const cli = lighthouseCli(); if (!cli) throw new Error('Lighthouse is not installed: node studio.mjs setup webperf');
      const json = join(outDir, 'lighthouse.json');
      // async spawn: the static server lives in this process, a blocking spawnSync would starve it and Lighthouse would wait forever
      const code = await new Promise((res, rej) => { const p = spawn(process.execPath, [cli, url, '--quiet', '--output=json', `--output-path=${json}`, '--only-categories=performance,accessibility,best-practices,seo', '--max-wait-for-load=45000', '--chrome-flags=--headless=new --no-sandbox --disable-dev-shm-usage'], { env: { ...process.env, CHROME_PATH: findChromium() }, stdio: 'inherit' }); p.on('error', rej); p.on('close', res); });
      if (code !== 0 || !existsSync(json)) throw new Error(`lighthouse exited ${code}`);
      const L = JSON.parse(readFileSync(json, 'utf8')), cat = (k) => Math.round((L.categories[k]?.score ?? 0) * 100), a = (k) => L.audits[k]?.numericValue ?? 0;
      return { source: `Lighthouse ${L.lighthouseVersion}`, score: cat('performance'), categories: { performance: cat('performance'), accessibility: cat('accessibility'), bestPractices: cat('best-practices'), seo: cat('seo') },
        metrics: { fcp: Math.round(a('first-contentful-paint')), lcp: Math.round(a('largest-contentful-paint')), tbt: Math.round(a('total-blocking-time')), cls: +a('cumulative-layout-shift').toFixed(3), si: Math.round(a('speed-index')) }, findings: [], report: json };
    }
    const client = await launch({ width: PHONE.w, height: PHONE.h });
    try {
      for (const d of ['Page.enable', 'Network.enable', 'Runtime.enable']) await client.send(d);
      await client.send('Network.setCacheDisabled', { cacheDisabled: true });
      await client.send('Network.emulateNetworkConditions', { offline: false, latency: PHONE.rtt, downloadThroughput: (PHONE.kbps * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
      await client.send('Emulation.setCPUThrottlingRate', { rate: PHONE.cpu });
      await client.send('Emulation.setDeviceMetricsOverride', { width: PHONE.w, height: PHONE.h, deviceScaleFactor: PHONE.dpr, mobile: true });
      await client.send('Page.addScriptToEvaluateOnNewDocument', { source: OBSERVE });
      await client.goto(url, { timeout: 90000 });
      await client.eval('new Promise((r) => setTimeout(() => r(true), 2500))');   // let late LCP candidates, shifts and long tasks land
      const m = await client.eval(COLLECT);
      const res = { source: 'studio speed estimate (Lighthouse-style curves, no Speed Index)', profile: PHONE, score: totalScore(m), metrics: { fcp: m.fcp, lcp: m.lcp, tbt: m.tbt, cls: m.cls, transferKB: m.transferKB, requests: m.requests }, findings: findings(m), detail: m };
      writeFileSync(join(outDir, 'speed.json'), JSON.stringify(res, null, 2));
      return res;
    } finally { await client.close(); }
  } finally { srv.close(); }
}
