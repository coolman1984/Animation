---
name: studio-doctor
description: Probe the machine — Node, Chromium + device-scale gate, ffmpeg encoders/filters, GPU, Arabic fonts, cores/RAM/disk — and give install guidance. Use at the start of every session before rendering.
---
# studio-doctor
Operating policy: `studio/WORKFLOW.md`; load only the relevant department via `studio/SKILLS.md`.


Run: `node studio/lib/doctor.mjs` (writes `studio/takes/doctor.json`, exit 1 if a required row fails). make.mjs runs it quietly.

## Required rows
Node ≥ 22 with global WebSocket · Chromium (`/opt/pw-browsers/chromium` or `STUDIO_CHROMIUM`) · device-scale gate
(css × 2 = png width) · ffmpeg + ffprobe · libx264 + aac · loudnorm/alimiter/ebur128 · freezedetect/blackdetect/tile ·
libass subtitles · palettegen + libwebp.

## Optional rows
GPU encoder (test-encodes one frame — listed ≠ usable) · Arabic fonts (vendored OFL fonts in `studio/assets/fonts` make
system fonts irrelevant) · Python (not needed).

## Install guidance (container is ephemeral)
- ffmpeg: `apt-get install -y ffmpeg` (6.1 tested).
- Fonts: download OFL TTFs from `raw.githubusercontent.com/google/fonts/main/ofl/<family>/` into `studio/assets/fonts`, add the OFL text.
- pip may be slow/blocked — the studio needs no Python.
- Chromium: never `playwright install`; use the pre-installed one.

## Checklist
1. Run doctor. 2. All required OK. 3. Scale gate OK. 4. Workers = min(4, cores). 5. Disk ≥ 5 GB free for a 60 s 1080p film (frames are piped, but masters are ~200 MB).
6. Fonts vendored. 7. GPU only if test-encode passes. 8. Network not needed for builds. 9. doctor.json saved. 10. Note limits in BRIEF.
