// Titles layer, drawn with Canvas 2D (correct Arabic shaping) into textures the final pass composites,
// so the logo, lower third and the big drop word are inside every recording, not just on screen.
import * as THREE from 'three';

const DISPLAY = '"Alexandria", "Readex Pro", "IBM Plex Sans Arabic", Tahoma, sans-serif';
const TEXT = '"IBM Plex Sans Arabic", Tahoma, sans-serif';

function texFrom(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  return t;
}

export class Titles {
  constructor() {
    this.ov = document.createElement('canvas');
    this.word = document.createElement('canvas');
    this.led = document.createElement('canvas');
    this.ov.width = 1280; this.ov.height = 720;
    this.word.width = 1600; this.word.height = 600;
    this.led.width = 1024; this.led.height = 512;
    this.ovTex = texFrom(this.ov);
    this.wordTex = texFrom(this.word);
    this.ledTex = texFrom(this.led);
    this.logo = null;
    this.key = '';
  }

  setSize(w, h) {
    const s = Math.min(1, 1920 / Math.max(w, h));
    const W = Math.round(w * s), H = Math.round(h * s);
    if (W === this.ov.width && H === this.ov.height) return;
    this.ov.width = W; this.ov.height = H;
    this.ovTex.dispose();
    this.ovTex = texFrom(this.ov);
    this.key = '';
  }

  setLogo(img) { this.logo = img; this.key = ''; }

  // safe = { top, bottom } as fractions of the height kept clear (the console covers the bottom when visible)
  draw(T, accent, safe = { top: 0, bottom: 0 }) {
    const key = JSON.stringify([T, accent, safe, this.ov.width, this.ov.height, !!this.logo]);
    if (key === this.key) return false;
    this.key = key;
    const c = this.ov, g = c.getContext('2d'), W = c.width, H = c.height, u = Math.min(W, H) / 720;
    g.clearRect(0, 0, W, H);
    g.direction = 'rtl';
    const m = 34 * u, top = safe.top * H, bottom = safe.bottom * H;
    // logo top-right
    if (T.show) {
      if (this.logo) {
        const h = 64 * u, w = (this.logo.width / this.logo.height) * h;
        g.globalAlpha = 0.92; g.drawImage(this.logo, W - m - w, m + top, w, h); g.globalAlpha = 1;
      } else {
        g.save();
        g.font = `700 ${17 * u}px ${DISPLAY}`;
        g.textAlign = 'right'; g.textBaseline = 'middle';
        g.fillStyle = 'rgba(255,255,255,0.92)';
        g.direction = 'ltr';
        const label = 'TRANCE PLUS';
        const tw = g.measureText(label).width;
        g.fillText(label, W - m, m + top + 16 * u);
        // the portal mark: three nested rectangles
        g.strokeStyle = accent; g.lineWidth = 2 * u;
        for (let i = 0; i < 3; i++) { const s = (14 - i * 4) * u; g.strokeRect(W - m - tw - 16 * u - s / 2 - 12 * u, m + top + 16 * u - s / 2, s, s); }
        g.restore();
      }
    }
    // lower third bottom-right
    if (T.show && T.lower && (T.party || T.dj)) {
      const x = W - m, y = H - m - bottom - 18 * u;
      g.textAlign = 'right'; g.textBaseline = 'alphabetic';
      g.font = `700 ${30 * u}px ${DISPLAY}`;
      const pw = g.measureText(T.party || '').width;
      g.font = `500 ${17 * u}px ${TEXT}`;
      const dj = T.dj ? `مع ${T.dj}` : '';
      const dw = g.measureText(dj).width;
      const bw = Math.max(pw, dw) + 40 * u, bh = 78 * u;
      const grad = g.createLinearGradient(x, 0, x - bw - 120 * u, 0);
      grad.addColorStop(0, 'rgba(4,6,10,0.72)'); grad.addColorStop(1, 'rgba(4,6,10,0)');
      g.fillStyle = grad; g.fillRect(x - bw - 120 * u, y - bh + 22 * u, bw + 120 * u + m, bh);
      g.fillStyle = accent; g.fillRect(x + 12 * u, y - bh + 30 * u, 4 * u, bh - 16 * u);
      g.fillStyle = '#fff';
      g.font = `700 ${30 * u}px ${DISPLAY}`;
      g.fillText(T.party || '', x - 4 * u, y - 24 * u);
      g.fillStyle = 'rgba(235,240,248,0.85)';
      g.font = `500 ${17 * u}px ${TEXT}`;
      g.fillText(dj, x - 4 * u, y + 2 * u);
    }
    this.ovTex.needsUpdate = true;
    this.drawLed(T, accent);
    return true;
  }

  drawLed(T, accent) {
    const c = this.led, g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl';
    g.fillStyle = '#fff';
    g.font = `800 150px ${DISPLAY}`;
    g.fillText(T.party || '', c.width / 2, c.height * 0.45);
    g.fillStyle = accent;
    g.font = `600 64px ${TEXT}`;
    g.fillText(T.dj || '', c.width / 2, c.height * 0.78);
    this.ledTex.needsUpdate = true;
  }

  setWord(text, accent) {
    const c = this.word, g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    if (!text) { this.wordTex.needsUpdate = true; return; }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl';
    let size = 260;
    g.font = `800 ${size}px ${DISPLAY}`;
    while (g.measureText(text).width > c.width * 0.92 && size > 60) { size -= 10; g.font = `800 ${size}px ${DISPLAY}`; }
    g.shadowColor = accent; g.shadowBlur = 60;
    g.fillStyle = '#ffffff';
    g.fillText(text, c.width / 2, c.height / 2);
    g.shadowBlur = 0;
    g.fillText(text, c.width / 2, c.height / 2);
    this.wordTex.needsUpdate = true;
  }
}
