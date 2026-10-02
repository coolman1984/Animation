// Minimal Chrome DevTools Protocol client. No packages: Node >= 22 global WebSocket + fetch.
// One Chromium process per device/worker (background tabs get no frames).
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findChromium } from './doctor.mjs';

export async function launch({ width = 1280, height = 720, scale = 1, headless = true, extraArgs = [] } = {}) {
  const bin = findChromium();
  if (!bin) throw new Error('Chromium not found (run the doctor)');
  const profile = mkdtempSync(join(tmpdir(), 'studio-chrome-'));
  const args = [
    headless ? '--headless=new' : '',
    '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--hide-scrollbars', '--mute-audio',
    '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
    '--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--allow-file-access-from-files', '--remote-debugging-port=0',
    `--force-device-scale-factor=${scale}`, `--window-size=${width},${height}`,
    `--user-data-dir=${profile}`, ...extraArgs, 'about:blank',
  ].filter(Boolean);
  const proc = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let wsUrl;
  try {
    wsUrl = await new Promise((res, rej) => {
      let buf = '';
      const t = setTimeout(() => rej(new Error('Chromium did not start: ' + buf.slice(-1500))), 20000);
      proc.stderr.on('data', d => {
        buf += d;
        const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
        if (m) { clearTimeout(t); res(m[1]); }
      });
      proc.on('error', error => { clearTimeout(t); rej(error); });
      proc.on('exit', (code, signal) => { clearTimeout(t); rej(new Error(`Chromium exited ${code ?? signal}: ${buf.slice(-1500)}`)); });
    });
  } catch (error) {
    proc.kill('SIGKILL'); rmSync(profile, { recursive: true, force: true }); throw error;
  }
  const port = new URL(wsUrl).port;
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find((t) => t.type === 'page');
  const client = await connect(page.webSocketDebuggerUrl);
  client.close = async () => {
    try { client.ws.close(); } catch {}
    proc.kill('SIGKILL');
    try { rmSync(profile, { recursive: true, force: true }); } catch {}
  };
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false });
  return client;
}

export async function connect(url) {
  const ws = new WebSocket(url);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = () => j(new Error('CDP connect failed')); });
  let id = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej, method } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result);
    } else if (m.method) {
      for (const fn of listeners.get(m.method) || []) fn(m.params);
    }
  };
  const client = {
    ws,
    send: (method, params = {}) => new Promise((res, rej) => {
      const i = ++id;
      pending.set(i, { res, rej, method });
      ws.send(JSON.stringify({ id: i, method, params }));
    }),
    on: (method, fn) => { if (!listeners.has(method)) listeners.set(method, []); listeners.get(method).push(fn); },
    once: (method) => new Promise((r) => {
      const fn = (p) => { listeners.set(method, listeners.get(method).filter((f) => f !== fn)); r(p); };
      client.on(method, fn);
    }),
    async eval(expression) {
      const r = await client.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(`eval: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
      return r.result.value;
    },
    async goto(url) {
      const loaded = client.once('Page.loadEventFired');
      await client.send('Page.navigate', { url });
      await loaded;
    },
    async png(clip) {
      const r = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, ...(clip ? { clip } : {}) });
      return Buffer.from(r.data, 'base64');
    },
  };
  return client;
}

// The first screenshot after a page loads can be torn (lower tiles still showing an older raster),
// measured on Chromium 141 headless with heavy filter layers. Capture until two consecutive
// screenshots match before any real frame is taken; later captures were verified stable.
export async function settleCapture(client, { tries = 8, gap = 30 } = {}) {
  let prev;
  for (let i = 0; i < tries; i++) {
    const shot = (await client.send('Page.captureScreenshot', { format: 'png' })).data;
    if (shot === prev) return i;
    prev = shot; await new Promise(r => setTimeout(r, gap));
  }
  return tries;
}

// Width of a PNG or JPEG buffer — used by the device-scale gate.
export function imageWidth(buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return buf.readUInt32BE(16);
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc3) return buf.readUInt16BE(i + 7);
    i += 2 + len;
  }
  return null;
}
