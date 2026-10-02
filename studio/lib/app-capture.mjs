// Film a REAL application: drive it, read what it actually displays, verify, capture clean stills.
// Output = REAL PRODUCT STATE (capture.json + PNG screens + element boxes + read-back values).
// The film's PRESENTATION LAYER (camera, callouts, titles, transitions; lib/screen.js) only reads this
// state. A failed expectation throws: the studio refuses to build a film on a faked outcome.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, settleCapture } from './cdp.mjs';
import { findChromium } from './doctor.mjs';
import { serve } from './serve.mjs';
import { execFileSync } from 'node:child_process';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Steps (executed in order):
//  { goto: url }                         absolute URL, or a path served from `serveDir`
//  { click: selector | { text } }        by test id/label/visible text, never by index
//  { type: { selector, text, cps } }     time-based typing (characters per second)
//  { wait: selector | ms }               element present, or a fixed pause
//  { waitText: { selector, includes } }  until an element's text contains a value
//  { read: name, selector, as? }         read displayed text ('text' | 'number')
//  { expect: name, equals | includes | matches | equalsRead }   verified or the capture fails
//  { verify: name, js }                  read a value from the app's own state (system of record) in-page
//  { shot: name, boxes?: { label: selector }, clip?: selector }  PNG at device scale + element boxes
export async function captureApp({ steps, outDir, viewport = { w: 390, h: 844, scale: 2 }, serveDir, timeout = 8000, label = 'capture', runtime = { launch, serve } }) {
  if (!Array.isArray(steps) || !steps.length) throw new Error('captureApp needs steps');
  mkdirSync(outDir, { recursive: true });
  const srv = serveDir ? await runtime.serve(serveDir) : null;
  let client;
  try { client=await runtime.launch({ width: viewport.w, height: viewport.h, scale: viewport.scale || 1 }); }
  catch(error){srv?.close();throw error;}
  const state = { label, viewport, chromium: (() => { try { return execFileSync(findChromium(), ['--version'], { encoding: 'utf8' }).trim(); } catch { return null; } })(),
    values: {}, verified: [], shots: {}, log: [] };
  const t0 = Date.now(), log = (event, detail) => state.log.push({ ms: Date.now() - t0, event, ...detail });
  const q = sel => typeof sel === 'string' ? `document.querySelector(${JSON.stringify(sel)})`
    : `[...document.querySelectorAll('button,a,[role=button],label,input,[data-testid]')].find(e => (e.innerText || e.value || e.getAttribute('aria-label') || '').trim() === ${JSON.stringify(sel.text)})`;
  const until = async (expr, what) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) { if (await client.eval(`!!(${expr})`)) return; await sleep(50); }
    throw new Error(`timeout waiting for ${what}`);
  };
  try {
    for (const step of steps) {
      if (step.goto) { const url = /^https?:/.test(step.goto) ? step.goto : `http://127.0.0.1:${srv.port}/${step.goto.replace(/^\//, '')}`; await client.goto(url); await client.eval('document.fonts.ready.then(() => true)'); log('goto', { url }); }
      else if (step.click) {
        await until(q(step.click), `click target ${JSON.stringify(step.click)}`);
        const box = await client.eval(`(() => { const e = ${q(step.click)}; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
        for (const type of ['mousePressed', 'mouseReleased']) await client.send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 });
        log('click', { target: step.click, at: box }); await sleep(step.settle ?? 120);
      } else if (step.type) {
        const { selector, text, cps = 12 } = step.type;
        await until(q(selector), `input ${selector}`); await client.eval(`${q(selector)}.focus()`);
        for (const ch of text) { await client.send('Input.insertText', { text: ch }); await sleep(1000 / cps); }
        log('type', { selector, text });
      } else if (step.wait !== undefined) {
        if (typeof step.wait === 'number') await sleep(step.wait); else await until(q(step.wait), step.wait);
        log('wait', { wait: step.wait });
      } else if (step.waitText) {
        const { selector, includes } = step.waitText;
        await until(`(${q(selector)}?.innerText || '').includes(${JSON.stringify(includes)})`, `${selector} to include ${includes}`);
        log('waitText', step.waitText);
      } else if (step.read) {
        await until(q(step.selector), step.selector);
        const text = (await client.eval(`(${q(step.selector)}.innerText || ${q(step.selector)}.value || '').trim()`));
        state.values[step.read] = step.as === 'number' ? parseDisplayedNumber(text) : text;
        log('read', { name: step.read, selector: step.selector, text });
      } else if (step.verify) {
        state.values[step.verify] = await client.eval(step.js);
        log('verify-source', { name: step.verify, value: state.values[step.verify] });
      } else if (step.expect) {
        const v = state.values[step.expect];
        const ok = 'equals' in step ? v === step.equals : 'includes' in step ? String(v).includes(step.includes)
          : 'matches' in step ? new RegExp(step.matches, 'u').test(String(v)) : 'equalsRead' in step ? v === state.values[step.equalsRead] : false;
        state.verified.push({ name: step.expect, value: v, ok, rule: Object.fromEntries(Object.entries(step).filter(([k]) => k !== 'expect')) });
        if (!ok) throw new Error(`REFUSING TO FILM: ${step.expect} = ${JSON.stringify(v)} does not satisfy ${JSON.stringify(step)}`);
        log('expect', { name: step.expect, ok });
      } else if (step.shot) {
        await settleCapture(client);
        let clip;
        if (step.clip) { const r = await client.eval(`(() => { const r = ${q(step.clip)}.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; })()`); clip = { ...r, scale: 1 }; }
        const png = Buffer.from((await client.send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip } : {}) })).data, 'base64');
        const file = `${step.shot}.png`; writeFileSync(join(outDir, file), png);
        const boxes = {};
        for (const [name, sel] of Object.entries(step.boxes || {})) {
          boxes[name] = await client.eval(`(() => { const e = ${q(sel)}; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, text: (e.innerText || '').trim() }; })()`);
          if (!boxes[name]) throw new Error(`shot ${step.shot}: box ${name} (${JSON.stringify(sel)}) not on screen`);
        }
        state.shots[step.shot] = { file, css: { w: clip?.width ?? viewport.w, h: clip?.height ?? viewport.h }, scale: viewport.scale || 1, boxes, origin: clip ? { x: clip.x, y: clip.y } : { x: 0, y: 0 } };
        log('shot', { name: step.shot });
      } else throw new Error(`unknown capture step ${JSON.stringify(step)}`);
    }
  } finally { try { await client.close(); } finally { srv?.close(); } }
  state.complete = true;
  writeFileSync(join(outDir, 'capture.json'), JSON.stringify(state, null, 1));
  return state;
}

// Numbers as displayed (Arabic-Indic or Latin digits, Arabic separators) → Number.
export function parseDisplayedNumber(text) {
  const latin = String(text).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/٫/g, '.').replace(/[٬,\s]/g, '');
  const m = latin.match(/-?\d+(?:\.\d+)?/);
  if (!m) throw new Error(`not a displayed number: ${text}`);
  return Number(m[0]);
}
