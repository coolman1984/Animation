// Studio Engine — the shared clock (DOM-free: imported by the browser player AND the Node score).
// A spec is written in beats; this turns it into seconds and lists every audible/visible event of every element,
// so picture (shake, flashes) and sound (SFX, drops) can never drift apart.
export function timeline(spec) {
  const bpm = spec.bpm || 120, B = 60 / bpm;
  let beat = 0;
  const scenes = spec.scenes.map((s, i) => { const a0 = beat; beat += s.beats; return { ...s, index: i, a0, b0: beat, a: a0 * B, b: beat * B }; });
  const duration = spec.duration || beat * B;
  return { bpm, B, scenes, duration, beats: beat };
}
const at = (e, d = 0) => (e.at ?? d);
// [{ t, kind, amp, id }] in seconds. kinds: slam impact flash flip spin whirl push wipe smash confirm line tick sparks implode slash glitch land drop
export function eventsOf(spec) {
  const { scenes, B } = timeline(spec), ev = [];
  const add = (t, kind, amp = 1, id = '') => ev.push({ t: +t.toFixed(4), kind, amp, id });
  for (const s of scenes) {
    const T = (beats) => s.a + beats * B;
    if (s.transition === 'flash' || s.transition === 'smash') add(s.a, s.transition === 'smash' ? 'smash' : 'flash', 1.4, s.id);
    if (s.drop) add(s.a, 'drop', 1, s.id);
    for (const e of s.elements || []) {
      const id = e.id || e.type;
      switch (e.type) {
        case 'words': add(T(at(e)), e.style === 'rise' || e.style === 'pop' ? 'tick' : 'slam', e.amp ?? (e.size > 200 ? 1 : 0.7), id); break;
        case 'stack': (e.lines || []).forEach((l, i) => add(T(l.at ?? at(e) + i * 0.5), 'slam', l.amp ?? 0.7, id)); break;
        case 'extrude': add(T(at(e)), 'impact', 1.2, id); if (e.implodeAt != null) add(T(e.implodeAt), 'implode', 1, id); break;
        case 'lockup': add(T(at(e)), 'impact', 1.4, id); add(T(e.midAt ?? at(e) + 1), 'spin', 0.9, id); break;
        case 'slice': add(T(at(e)), 'glitch', 0.6, id); add(T(e.cutAt ?? at(e) + 1), 'slash', 1, id); add(T((e.cutAt ?? at(e) + 1)) + 0.5, 'land', 0.5, id); break;
        case 'cards': (e.items || []).forEach((_, i) => add(T((e.start ?? 1) + i * (e.step ?? 5)), 'flip', 0.8 * (1 + 0.1 * i), id)); break;
        case 'ring': add(T(at(e)), 'whirl', 1, id); if (e.pushAt != null) add(T(e.pushAt), 'push', 0.8, id); break;
        case 'wipes': (e.items || []).forEach((w) => add(T(w.at), 'wipe', 1, id)); break;
        case 'slab': add(T(at(e)), 'smash', 1.6, id); (e.lines || []).slice(1).forEach((l) => add(T(l.at ?? at(e) + 1.5), 'impact', 0.9, id)); break;
        case 'pill': add(T(at(e)), 'confirm', 0.5, id); break;
        case 'hosts': add(T(at(e)), 'line', 0.8, id); (e.people || []).forEach((_, i) => add(T(at(e) + 0.5 + i), 'slam', 0.7, id)); add(T(at(e) + 2.5), 'tick', 0.5, id); break;
        case 'sparks': add(T(at(e)), 'sparks', 0.8, id); break;
        case 'shape': case 'path': case 'icon': if (e.sound) add(T(at(e)), e.sound, 0.5, id); break;
        default: break;
      }
    }
  }
  return ev.sort((a, b) => a.t - b.t);
}
