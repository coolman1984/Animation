// Studio Engine — every readable line an element puts on screen, with its size and beat times. Shared by the critic and the storyboard lint.
export function copyOf(e) {
  const at = e.at ?? 0, out = [];
  if (e.type === 'words' && e.text) out.push({ text: e.text, size: e.size, at, end: e.out });
  if (e.type === 'stack') for (const [i, l] of (e.lines || []).entries()) out.push({ text: l.text, size: l.size || e.size || 120, at: l.at ?? at + i * 0.5, end: e.out, fact: l.fact });
  if (e.type === 'pill') { const parts = (e.parts || [e.text]).filter(Boolean); out.push({ text: parts.map((p) => (typeof p === 'string' ? p : p.text)).join(' '), size: Math.min(...parts.map((p) => (typeof p === 'object' && p.size) || e.size || 70)), at, end: e.out }); }
  if (e.type === 'slab') for (const l of e.lines || []) out.push({ text: l.text, size: l.size || 120, at: l.at ?? at, end: e.out, fact: l.fact });
  if (['slice', 'extrude'].includes(e.type) && e.text) out.push({ text: e.text, size: e.size || 300, at, end: e.out });
  if (e.type === 'wipes') for (const w of e.items || []) out.push({ text: w.text, size: w.size || 250, at: w.at, end: w.at + 2, fact: w.fact });
  if (e.type === 'cards') for (const [i, it] of (e.items || []).entries()) for (const [k, size] of [['title', 76], ['titleAr', 48], ['old', 46], ['oldAr', 40], ['new', 46], ['newAr', 40]]) if (it?.[k]) out.push({ text: it[k], size, at: (e.start ?? 1) + i * (e.step ?? 5), end: (e.start ?? 1) + (i + 1) * (e.step ?? 5), fact: it.fact });
  if (['lockup', 'mark'].includes(e.type)) out.push({ text: (e.parts || []).join(' '), size: e.size || 300, at, end: e.out });
  return out.filter((c) => typeof c.text === 'string' && c.text.trim());
}
