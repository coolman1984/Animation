import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureApp, parseDisplayedNumber } from '../lib/app-capture.mjs';
const serveDir = fileURLToPath(new URL('./fixture/app/', import.meta.url));

test('displayed numbers parse from Arabic-Indic and Latin text', () => {
  assert.equal(parseDisplayedNumber('١٠٠٫٥٠ ج.م'), 100.5); assert.equal(parseDisplayedNumber('1,250'), 1250); assert.equal(parseDisplayedNumber('٣'), 3);
  assert.throws(() => parseDisplayedNumber('—'), /not a displayed number/);
});

test('real app capture: drive, read back, verify against app state, capture shots with element boxes; refuse on mismatch', { skip: process.env.STUDIO_RENDER_TEST !== '1', timeout: 60000 }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-app-'));
  try {
    const steps = [
      { goto: 'index.html' },
      { click: '[data-testid=add-matcha]' }, { click: '[data-testid=add-boba]' },
      { read: 'total', selector: '[data-testid=total]', as: 'number' },
      { expect: 'total', equals: 100.5 },
      { click: { text: 'اطلب' } }, { waitText: { selector: '[data-testid=status]', includes: 'تم الطلب' } },
      { verify: 'sourceTotal', js: 'window.__order.total' }, { expect: 'sourceTotal', equalsRead: 'total' },
      { shot: 'cart', boxes: { total: '[data-testid=total]', order: '[data-testid=order]' } },
    ];
    const state = await captureApp({ steps, outDir: dir, serveDir, viewport: { w: 390, h: 600, scale: 2 } });
    assert.equal(state.values.total, 100.5); assert.ok(state.verified.every(v => v.ok));
    assert.ok(existsSync(join(dir, 'cart.png'))); assert.equal(readFileSync(join(dir, 'cart.png')).readUInt32BE(16), 780, 'device-scale capture');
    assert.ok(state.shots.cart.boxes.total.w > 0 && /١٠٠/.test(state.shots.cart.boxes.total.text));
    assert.equal(JSON.parse(readFileSync(join(dir, 'capture.json'), 'utf8')).complete, true);
    await assert.rejects(captureApp({ steps: [steps[0], steps[1], steps[3], { expect: 'total', equals: 999 }], outDir: join(dir, 'bad'), serveDir }), /REFUSING TO FILM/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
