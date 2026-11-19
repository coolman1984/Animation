// MIDI controllers: learn mode binds any knob, fader or button on screen to a CC or note.
// Mappings live in the browser (localStorage) under the controller's port name.

export class Midi {
  constructor(registry, onStatus) {
    this.registry = registry; // Map id → { kind: 'range'|'button', set(v), press(on) }
    this.map = {};
    this.learn = false;
    this.armed = null;
    this.onStatus = onStatus || (() => {});
    try { this.map = JSON.parse(localStorage.getItem('rave-midi') || '{}'); } catch { this.map = {}; }
  }

  async connect() {
    if (!navigator.requestMIDIAccess) throw new Error('المتصفح ده مفيهوش دعم ميدي');
    this.access = await navigator.requestMIDIAccess();
    const bind = () => {
      const names = [];
      for (const input of this.access.inputs.values()) { input.onmidimessage = (e) => this.message(e.data); names.push(input.name); }
      this.onStatus(names);
    };
    this.access.onstatechange = bind;
    bind();
  }

  arm(id) { this.armed = id; }

  message([st, d1, d2]) {
    const type = st & 0xf0, ch = st & 0x0f;
    let key, value, isNote = false;
    if (type === 0xb0) { key = `cc${ch}:${d1}`; value = d2 / 127; }
    else if (type === 0x90 || type === 0x80) { key = `n${ch}:${d1}`; value = type === 0x90 && d2 > 0 ? 1 : 0; isNote = true; }
    else return;
    if (this.learn && this.armed) {
      if (isNote && value === 0) return;
      this.map[key] = this.armed;
      this.save();
      this.onStatus(null, { key, id: this.armed });
      this.armed = null;
      return;
    }
    const id = this.map[key];
    const c = id && this.registry.get(id);
    if (!c) return;
    if (c.kind === 'range') c.set(value, true);
    else c.press(value > 0.5, isNote);
  }

  save() { try { localStorage.setItem('rave-midi', JSON.stringify(this.map)); } catch { /* private mode */ } }
  clear() { this.map = {}; this.save(); }
}
