// Film 24 — capture the landing page (the AI Essentials Academy home, English) for the 3D fly-over.
// 1440 px wide, device scale 2, scrolled once to the bottom so every animation settles. Pieces that lift are marked
// data-layer; the page is shot once with them hidden, then each piece alone on transparent with 28 px padding.
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const pw = require('/opt/node22/lib/node_modules/playwright');
const OUT = new URL('./capture/', import.meta.url).pathname; mkdirSync(OUT, { recursive: true });
const PAD = 28, DSF = 2, TILE = 2048;
const b = await pw.chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1152 }, deviceScaleFactor: DSF, reducedMotion: 'reduce' });
const p = await ctx.newPage();
await p.goto('file:///home/user/Course/AI_Academy.html');
await p.evaluate(() => localStorage.setItem('aiAcademy.v1', JSON.stringify({ lang: 'en', theme: 'light' })));
await p.reload(); await p.waitForSelector('#main h1');
// landing view: hide the app chrome (top bar, sidebar, reading bar) so the home page reads as a page
await p.addStyleTag({ content: `.bar,.side,.readbar,.scrim,.skip,.toast-zone{display:none!important}.shell{display:block!important}main{padding-top:0!important}html,body{background:#fff!important}` });
await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
await p.waitForTimeout(800);
// mark the lifting pieces
const marks = await p.evaluate(() => {
  const pick = (sel, kind, all = false) => (all ? [...document.querySelectorAll(sel)] : [document.querySelector(sel)]).filter(Boolean).map((e) => [e, kind]);
  const list = [
    ...pick('.hero2 .cta .btn', 'button', true),
    ...pick('.showcase .float', 'chip', true),
    ...pick('.showcase .win', 'mockup'),
    ...pick('.cmdk', 'photo'),
    ...pick('.split .eq', 'card'),
    ...pick('.split .split-art .float', 'chip', true),
    ...pick('.ladder2 .rung2', 'card', true),
    ...pick('.ulist', 'testimonial'),
    ...pick('#flabs .labcard', 'card', true),
    ...pick('.honest .chip', 'chip', true),
  ];
  const sy = window.scrollY;
  return list.map(([e, kind], i) => { e.dataset.layer = String(i); const r = e.getBoundingClientRect(); return { id: i, kind, cls: e.className.baseVal ?? e.className, x: r.left, y: r.top + sy, w: r.width, h: r.height }; });
});
const H = await p.evaluate(() => Math.ceil(document.documentElement.scrollHeight));
// base page with the pieces hidden, in tiles (WebGL texture limits)
await p.addStyleTag({ content: '[data-layer]{visibility:hidden!important}' });
const tiles = [];
for (let y = 0, k = 0; y < H; y += TILE, k++) { const h = Math.min(TILE, H - y); const f = `page-${k}.png`; await p.screenshot({ path: OUT + f, fullPage: true, clip: { x: 0, y, width: 1440, height: h } }); tiles.push({ f, y, h }); }
// each piece alone on transparent
await p.addStyleTag({ content: 'html,body,main,.home,.band,section,.split,.hero2,.showcase{background:transparent!important;border-color:transparent!important}' });
for (const m of marks) {
  await p.evaluate((id) => { document.querySelectorAll('[data-layer]').forEach((e) => (e.style.cssText += ';visibility:hidden!important')); const e = document.querySelector(`[data-layer="${id}"]`); e.style.cssText += ';visibility:visible!important'; document.body.classList.add('iso'); }, String(m.id));
  await p.addStyleTag({ content: 'body.iso *{visibility:hidden}body.iso [data-layer][style*="visible"],body.iso [data-layer][style*="visible"] *{visibility:visible}' });
  const clip = { x: Math.max(0, m.x - PAD), y: Math.max(0, m.y - PAD), width: m.w + PAD * 2, height: m.h + PAD * 2 };
  m.f = `piece-${m.id}.png`; m.pad = PAD; m.clip = clip;
  await p.screenshot({ path: OUT + m.f, fullPage: true, clip, omitBackground: true });
}
writeFileSync(OUT + 'layout.json', JSON.stringify({ width: 1440, height: H, dsf: DSF, tiles, pieces: marks }, null, 1));
console.log('page height', H, 'pieces', marks.length, marks.map((m) => m.kind + '@' + Math.round(m.y)).join(' '));
await b.close();
