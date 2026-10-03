// Minimal Chrome DevTools Protocol client. No packages: Node >= 22 global WebSocket + fetch.
// One Chromium process per device/worker (background tabs get no frames).
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findChromium } from './doctor.mjs';

// Browser session modes (one switch, nothing else changes):
//  - private (default): the studio starts its own headless Chrome with a throwaway profile per worker and closes it.
//  - attach: STUDIO_CDP_URL=http://127.0.0.1:<port> points at a Chrome that an approved launcher already started with
//    --remote-debugging-port. The studio opens an isolated browser context (own cookies/storage) per worker, renders,
//    then disposes ONLY that context. It never starts, kills or reconfigures the owner's browser.
export const sessionMode = () => (process.env.STUDIO_CDP_URL ? 'attach' : 'private');

// One bounded retry for transient startup failures, never for navigation/render/verification errors.
export async function launch(options = {}) {
  if (sessionMode() === 'attach') return attach(options);
  try { return await launchOnce(options); }
  catch(error){
    if(!/Chromium did not start|Chromium exited/.test(error.message))throw error;
    await new Promise(r=>setTimeout(r,250));
    return launchOnce(options);
  }
}

async function launchOnce({ width = 1280, height = 720, scale = 1, headless = true, extraArgs = [] } = {}) {
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
    proc.kill('SIGKILL'); proc.stderr.destroy(); try { rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); } catch {} throw error;
  }
  const port = new URL(wsUrl).port;
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find((t) => t.type === 'page');
  const client = await connect(page.webSocketDebuggerUrl);
  client.close = async () => {
    try { client.ws.close(); } catch {}
    await shutdown(proc, wsUrl, profile);
  };
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false });
  return client;
}

async function attach({ width = 1280, height = 720, scale = 1, extraArgs = [] } = {}) {
  const base = process.env.STUDIO_CDP_URL.replace(/\/+$/, '');
  let info;
  try { info = await (await fetch(`${base}/json/version`)).json(); }
  catch (error) { throw new Error(`attach mode: no Chrome DevTools endpoint at ${base} (start Chrome through the approved launcher with --remote-debugging-port, or unset STUDIO_CDP_URL for private mode): ${error.message}`); }
  if (extraArgs.length) console.warn('attach mode: launch flags (e.g. SwiftShader for config.gpu) cannot be applied to an existing browser; WebGL uses that browser\'s own GPU settings');
  const browser = await connect(info.webSocketDebuggerUrl);
  let browserContextId;
  try {
    ({ browserContextId } = await browser.send('Target.createBrowserContext', { disposeOnDetach: true }));
    const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId, newWindow: true });
    const client = await connect(info.webSocketDebuggerUrl.replace(/\/devtools\/browser\/.*$/, `/devtools/page/${targetId}`));
    client.version = info.Browser;
    client.close = async () => {
      try { client.ws.close(); } catch {}
      try { await browser.send('Target.disposeBrowserContext', { browserContextId }); } catch {}
      try { browser.ws.close(); } catch {}
    };
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false });
    // A visible browser may keep our window in the background: emulate focus so it keeps producing frames.
    await client.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
    return client;
  } catch (error) {
    if (browserContextId) await browser.send('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
    try { browser.ws.close(); } catch {}
    throw error;
  }
}

// Close Chromium and remove its throwaway profile. A bare kill leaves helper processes holding the profile (and our stderr
// pipe) for seconds: on Windows the profile delete failed silently (69 leftover profiles, 746 MB in one day) and node
// waited ~17 s for the pipe. Ask the browser to quit, wait for the exit, then delete with retries.
export async function shutdown(proc, wsUrl, profile) {
  const exited = proc.exitCode !== null || proc.signalCode !== null ? Promise.resolve() : new Promise((r) => proc.once('exit', r));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    const ws = new WebSocket(wsUrl);
    await Promise.race([new Promise((r, j) => { ws.onopen = r; ws.onerror = j; }), wait(1000)]);
    if (ws.readyState === 1) ws.send(JSON.stringify({ id: 1, method: 'Browser.close' }));
    await Promise.race([exited, wait(3000)]);
    try { ws.close(); } catch {}
  } catch {}
  if (proc.exitCode === null && proc.signalCode === null) { proc.kill('SIGKILL'); await Promise.race([exited, wait(2000)]); }
  proc.stderr?.destroy();
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); } catch {}
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
// Page.captureScreenshot can very rarely never answer in headless software mode right after canvas commits (seen with live
// footage pages: 1 in ~6 captures, the next request answers in ~40 ms). Wait `timeout` ms, then ask again; a late answer to the
// abandoned request is ignored. Pixels are unaffected: the same page state is captured.
export async function screenshot(client, params = { format: 'png' }, { timeout = 4000, tries = 4 } = {}) {
  for (let i = 0; i < tries; i++) {
    const r = await Promise.race([client.send('Page.captureScreenshot', params), new Promise((res) => setTimeout(() => res(null), timeout))]);
    if (r) return r;
  }
  throw new Error(`Page.captureScreenshot did not answer after ${tries} tries`);
}

export async function settleCapture(client, { tries = 8, gap = 30 } = {}) {
  let prev;
  for (let i = 0; i < tries; i++) {
    const shot = (await screenshot(client, { format: 'png' })).data;
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
