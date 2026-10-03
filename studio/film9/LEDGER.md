# LEDGER — Film 9 NeuroAnara (20 s, 9:16, no music). Takes in `studio/out/film9/` (not in git). Final: take04.

| time | issue | sev | fix | result |
|---|---|---|---|---|
| font | the page's wordmark is a serif; the studio had none | asset | Lora (OFL) from fonts.gstatic.com, `@font-face` in composer, licence in `assets/fonts/OFL-lora.txt` | matching serif |
| stills | hook line touched the frame edges; the banner hit the figure's feet | minor | hook 66/70 px; figure parks higher | clear |
| take01 | "Neuro is decoded." readable only 0.6 s | minor | فكّر/اربط/قرّر tightened, the decode beat moved 0.7 s earlier | ~1.6 s with the gloss |
| take02 | the wordmark's line box overlapped the tagline | gate | line-height 1.0 | PASS |
| take03 | true peak +0.2 dBTP (sparse effects pushed up to −16 LUFS) | gate | quieter thumps, louder room tone, tanh soft limiting before normalisation | −2.6 dBTP |
| take03 | frozen 15.8–17.0; «قرّر.» below the safe band while rising | gate | slow 5 % push on the decoded lines; words 30 px higher | PASS |
| take04 | all gates PASS: 1080×1920, 30 fps, 20.00 s, −15.8 LUFS, TP −2.6, LRA 3.6, 40 text lines in the safe band, share 9.8 MB | — | — | delivered |

Deliberate: a 0.4 s clean breath at ~7.4 between the causes and the decode diagram. Not verified: listening, real-speed phone viewing, a fresh reviewer.

## Owner revision (2026-10-03): "the chair-scene sounds are very bad and not expressive; change only those" → take06
0–3.9 s rebuilt in `score.mjs` §A: a quiet heartbeat that quickens, a breath in on each lean, a wooden creak synthesised as stick-slip friction
(a train of tiny clicks ringing a 480–620 Hz resonance), a felt thump as he drops back onto the seat, two chair-leg knocks, a tired breath out;
the text clicks and the UI chime were removed. Everything after 3.9 s is unchanged. First pass made the scene 5 dB louder than the rest (LRA 8.6 FAIL)
→ levels halved → take06 all gates PASS (−15.8 LUFS, TP −2.5, LRA 4.9). Not verified: listening.
