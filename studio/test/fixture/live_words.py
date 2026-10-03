# Word-timing accuracy of tools/live.py on speech with KNOWN word edges: synthesise each word separately (Piper ar_JO),
# join with short gaps, run VAD + script alignment, compare. Prints one JSON line {median, mean, max, inside, n}.
import json, os, sys, subprocess, tempfile, numpy as np, soundfile as sf, sherpa_onnx
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'tools')); import live
d = os.path.join(live.MODELS, live.TTS[0])
tts = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(vits=sherpa_onnx.OfflineTtsVitsModelConfig(
    model=f'{d}/ar_JO-kareem-medium.onnx', tokens=f'{d}/tokens.txt', data_dir=f'{d}/espeak-ng-data'), num_threads=4)))
lines = ['أهلا بيكم في بيكسل بلس.', 'إحنا بنعمل إعلانات وأنيميشن وبرمجيات.', 'كل فكرة عظيمة بتبدأ ببكسل واحد.']
sr, parts, truth, t = 22050, [np.zeros(11025, np.float32)], [], 0.5
for l in lines:
    for w in l.split():
        a = np.array(tts.generate(w.strip('.'), sid=0, speed=1.0).samples, np.float32); nz = np.where(np.abs(a) > 0.01)[0]; a = a[nz[0]:nz[-1] + 1]
        truth.append((t, t + len(a) / sr)); parts += [a, np.zeros(int(sr * 0.06), np.float32)]; t += len(a) / sr + 0.06
    parts.append(np.zeros(int(sr * 0.8), np.float32)); t += 0.8
P = tempfile.mkdtemp(); sf.write(f'{P}/voice.wav', np.concatenate(parts), sr)
json.dump({'fps': 30, 'frames': 0, 'w': 0, 'h': 0, 'audio': True}, open(f'{P}/pack.json', 'w')); open(f'{P}/script.txt', 'w').write('\n'.join(lines))
L = os.path.join(ROOT, 'tools', 'live.py')
subprocess.run(['python3', L, 'vad', P, f'--wav={P}/voice.wav'], check=True, capture_output=True)
subprocess.run(['python3', L, 'align', P, f'--script={P}/script.txt'], check=True, capture_output=True)
words = json.load(open(f'{P}/transcript.json'))['words']
e = [abs(q['start'] - a) for (a, b), q in zip(truth, words)] + [abs(q['end'] - b) for (a, b), q in zip(truth, words)]
inside = sum(1 for (a, b), q in zip(truth, words) if a <= (q['start'] + q['end']) / 2 <= b)
print(json.dumps({'median': round(float(np.median(e)), 3), 'mean': round(float(np.mean(e)), 3), 'max': round(float(np.max(e)), 3), 'inside': inside, 'n': len(truth)}))
