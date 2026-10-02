# BRIEF — Showreel 2 "CLAUDE · motion designer" · 15 s · 16:9 · 60 fps · 128 BPM

Owner request 2026-10-02: study the uploaded screen recording (`Screen_Recording_20261002_143800_X.mp4`) and make a
15-second motion-graphics showreel "like this exactly". Reference pack (private, git-ignored): `references/user-ref/`
(machine pack + visual review attestation; no audio was listened to).

## What was studied (visually inspected frames, HUD crops, 6 dense segment grids)
A 128 BPM, 8-bar showreel that proves each skill in the bar it belongs to, with a running HUD:
`01 IDENTITY · 02 EASING · 03 MORPHING · 04 SYSTEMS · 05 DEPTH · 06 KINETIC TYPE · 07 FIN`, registration brackets, `CLAUDE MOTION REEL — 2026`,
timecode + `60 FPS`, `128 BPM ▪▪▪▪ BAR n/8`, a bottom progress line. Fields: orange #FD5A39 · cream #F3EDE3 · blue #2B39FC · ink · one lime.
Type: ultra-heavy extended grotesque with an animated width axis, italic serif accent, monospace HUD.

## What this recreation does (native engine, original artwork)
| bar | t (s) | scene | notes |
|---|---|---|---|
| 1 | 0–1.875 | ring + dot → procedurally drawn burst glyph + rotating text ring → collapse | iris punch at the downbeat |
| 2 | 1.875–3.5 | orange iris reveal, CLAUDE letters change width as they land, italic subtitle rises, glitch exit | |
| 3 | 3.5–5.625 | six dots race with linear / ease-in-out / expo-out / back-out / elastic / bounce, ghosts + rings, fold to one blue dot | real easing functions |
| 4 | 5.625–7.5 | circle → triangle → star → square, spring morphs, coral echoes, 12 orbit markers change species | |
| 5 | 7.5–9.375 | cream square → Truchet field, three coral waves rotate/flip tiles | tile count is printed live |
| 6 | 9.375–11.25 | 30×19 = 570-vertex mesh → sphere → torus, perspective, caption values computed live | |
| 7 | 11.25–13.35 | EASE / IN. / EASE / OUT. / NEVER / NEVER rows / LINEAR. at 1/8-note cuts, the full stop floods | |
| 8 | 13.35–15 | burst blooms with confetti, wordmark + italic subtitle + credit line, held lock-up | |

Original score (`score.mjs`): hits on the iris, the drop (7.5 s), every type card and the bloom; a linear-frequency sine sweep for LINEAR.

## Deliberately NOT copied
- The video player chrome in the recording (play bar, speaker button, rounded frame, time counter).
- The reference's audio; any of its artwork. The burst glyph is drawn by `burstPath` (own geometry); fonts are OFL (Archivo, Instrument Serif, Space Mono).
- Exactness: this follows the studied structure, order, timing (±~0.1 s, the recording is offset ~0.35 s from the film clock), palette and type
  roles. Pixel equality is not a goal and not claimed.

## Truth notes
- Section caption numbers (tile count 170, vertices 570, ROT.Y) are computed from this film's own data.
- The wordmark "CLAUDE" is the designer's name as in the reference/request; no trademark artwork is reproduced.
