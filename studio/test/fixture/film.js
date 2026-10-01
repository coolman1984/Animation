// Self-contained deterministic film: colours and motion encode source time for renderer tests.
let box, label;
export default {
  duration: 4, fps: 30,
  init(stage, { W, H }) {
    stage.style.background = '#244b3c';
    box = document.createElement('div');
    Object.assign(box.style, { position: 'absolute', width: '80px', height: '80px', top: '100px', background: '#ffc766' });
    label = document.createElement('div'); label.className = 'line';
    label.innerHTML = '<span class="word">مرحبا</span>';
    Object.assign(label.style, { position: 'absolute', left: '40px', top: '35px', font: '28px "Plex Arabic"', color: 'white' });
    stage.append(box, label); this.W = W; this.H = H;
  },
  render(t, frame) {
    box.style.left = `${20 + t * 35}px`;
    // Separate channels encode source time and authored frame: preview must preserve both.
    box.style.background = `rgb(${Math.round(t * 50)}, ${frame}, 120)`;
    label.style.display = t >= 1 && t < 2 ? 'block' : 'none';
  },
};
