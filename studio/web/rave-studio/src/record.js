// Video recorder: the WebGL canvas (with every layer) + the master mix → MP4 where the browser can,
// otherwise WebM. Plus helpers to save or share a file from the page.

const TYPES = [
  'video/mp4;codecs=avc1.640028,mp4a.40.2',
  'video/mp4;codecs=avc1.42E01F,mp4a.40.2',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

export function pickType() {
  if (typeof MediaRecorder === 'undefined') return null;
  return TYPES.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

export class VideoRecorder {
  constructor(canvas) { this.canvas = canvas; this.rec = null; this.t0 = 0; }

  get active() { return !!this.rec; }
  seconds() { return this.rec ? (performance.now() - this.t0) / 1000 : 0; }

  start({ fps = 30, mbps = 16, audio = null }) {
    const type = pickType();
    if (type === null) throw new Error('MediaRecorder غير مدعوم في المتصفح ده');
    const vs = this.canvas.captureStream(fps);
    const tracks = [...vs.getVideoTracks()];
    if (audio) tracks.push(...audio.getAudioTracks());
    const stream = new MediaStream(tracks);
    this.chunks = [];
    this.type = type || 'video/webm';
    this.rec = new MediaRecorder(stream, { mimeType: type || undefined, videoBitsPerSecond: mbps * 1e6, audioBitsPerSecond: 256000 });
    this.rec.ondataavailable = (e) => { if (e.data && e.data.size) this.chunks.push(e.data); };
    this.rec.start(1000);
    this.t0 = performance.now();
    this.bytes = () => this.chunks.reduce((s, c) => s + c.size, 0);
  }

  stop() {
    return new Promise((resolve) => {
      const r = this.rec;
      if (!r) return resolve(null);
      r.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.type.split(';')[0] });
        this.chunks = [];
        resolve(blob);
      };
      r.stop();
      r.stream.getVideoTracks().forEach((t) => t.stop());
      this.rec = null;
    });
  }
}

export function stamp() {
  const d = new Date(), p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return url;
}

export async function shareBlob(blob, name) {
  const file = new File([blob], name, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return true; }
  return false;
}

export const extFor = (type) => (type.includes('mp4') ? 'mp4' : type.includes('wav') ? 'wav' : type.includes('png') ? 'png' : 'webm');
