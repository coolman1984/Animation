import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launch } from '../lib/cdp.mjs';
import { serve } from '../lib/serve.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
test('real depth scene: reverse seek is identical, selective focus excludes Arabic, matte diagnostics preserve alpha', { skip: process.env.STUDIO_RENDER_TEST !== '1', timeout: 60000 }, async () => {
  const server = await serve(root); let client;
  try {
    client = await launch({ width: 400, height: 450 });
    await client.goto(`http://127.0.0.1:${server.port}/lib/composer.html?film=/examples/depth-study/film.js&w=400&h=450`);
    for (let i = 0; i < 100 && !(await client.eval('!!window.ready')); i++) await new Promise(r => setTimeout(r, 50));
    await client.eval('window.ready');
    const frame = async t => {
      await client.eval(`window.renderAt(${t})`);
      return (await client.send('Page.captureScreenshot', { format: 'png' })).data;
    };
    const a = await frame(2); const early = await frame(0.25); const b = await frame(2);
    assert.equal(a, b); assert.notEqual(a, early);
    const state = await client.eval(`({hero: getComputedStyle(document.querySelector('[data-layer="hero"]')).filter,
      foreground: getComputedStyle(document.querySelector('[data-layer="foreground"]')).filter,
      text: getComputedStyle(document.querySelector('.line')).filter,
      textOutside: !document.querySelector('.line').closest('[data-layer]')})`);
    assert.equal(state.hero, 'none'); assert.notEqual(state.foreground, 'none'); assert.equal(state.text, 'none'); assert.equal(state.textOutside, true);
    await client.goto(`http://127.0.0.1:${server.port}/lib/imagelab-page.html`);
    const check = await client.eval(`(() => { const c=lab.canvas(3,1); const d=c.getContext('2d').createImageData(3,1); d.data.set([0,0,0,0,100,100,100,128,100,100,100,255]); lab.put(c,d); const r=lab.matteSheet(c); return {alpha:r.alpha,width:r.sheet.width}; })()`);
    assert.deepEqual(check.alpha, { clear: 1, partial: 1, solid: 1, total: 3 }); assert.equal(check.width, 9);
  } finally { await client?.close(); server.close(); }
});
