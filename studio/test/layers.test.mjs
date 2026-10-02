import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildLayers, validateLayerPlan } from '../lib/layers.mjs';

test('layer plans are validated before any work (unknown refs, fabricated depth without provenance)', () => {
  assert.ok(validateLayerPlan({}).length);
  const errs = validateLayerPlan({ source: 'a.png', out: 'o', layers: [{ name: 'clean', type: 'clean', remove: ['product'] }, { name: 'd', type: 'depth', path: 'x.png' }, { name: 'p', matte: { type: 'magic' } }] });
  for (const p of [/earlier cut-out/, /provenance/, /matte.type/]) assert.ok(errs.some(e => p.test(e)), p);
});

test('one photo → product cut-out, clean plate with honest provenance, shadow plate, matte checks', { skip: process.env.STUDIO_RENDER_TEST !== '1', timeout: 60000 }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-layers-'));
  try {
    const src = join(dir, 'photo.png');
    execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=0x20c040:s=200x150', '-vf', 'drawbox=x=60:y=40:w=80:h=70:color=0xd04030:t=fill', '-frames:v', '1', src]);
    const plan = { source: src, out: join(dir, 'plates'), layers: [
      { name: 'product', matte: { type: 'chroma', color: '#20c040', tolerance: 40, softness: 20 } },
      { name: 'clean', type: 'clean', remove: ['product'], grow: 4 },
      { name: 'shadow', type: 'shadow', from: 'product', blur: 6 },
    ] };
    const { manifest } = await buildLayers(plan, { root: dir });
    const product = manifest.layers.find(l => l.name === 'product');
    assert.deepEqual([product.bounds.x, product.bounds.y, product.bounds.w, product.bounds.h], [60, 40, 80, 70]);
    const clean = manifest.layers.find(l => l.name === 'clean');
    assert.ok(clean.synthesizedFraction > 0.18 && clean.synthesizedFraction < 0.3, `synthesized ${clean.synthesizedFraction}`);
    assert.match(clean.provenance, /never as product evidence/);
    const px = execFileSync('ffmpeg', ['-v', 'error', '-i', join(dir, 'plates', 'clean.png'), '-vf', 'crop=1:1:100:75,format=rgb24', '-f', 'rawvideo', '-']);
    assert.ok(px[1] > 150 && px[0] < 80, `clean plate centre is background green, got ${[...px]}`);
    for (const f of ['product.png', 'product-check.png', 'clean.png', 'clean-fillmask.png', 'shadow.png', 'layers.json']) assert.ok(existsSync(join(dir, 'plates', f)), f);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
