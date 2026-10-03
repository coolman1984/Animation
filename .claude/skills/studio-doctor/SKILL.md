---
name: studio-doctor
description: Probe the machine — Node, Chromium + device-scale gate, ffmpeg encoders/filters, GPU, Arabic fonts, cores/RAM/disk — and give install guidance. Use at the start of every session before rendering.
---
# studio-doctor
Operating policy: `studio/WORKFLOW.md`; load only the relevant department via `studio/SKILLS.md`.


Run: `node studio/lib/doctor.mjs` (writes `studio/takes/doctor.json`, exit 1 if a required row fails). make.mjs calls
`buildCheck()`: required rows only, and it reuses the last passing result (`takes/doctor-build.json`) while node, Chromium,
ffmpeg and ffprobe are the same files. Delete that file to force a fresh check after changing tools in place.

## Required rows
Node ≥ 22 with global WebSocket · Chromium (`STUDIO_CHROMIUM`, else Linux `/opt/pw-browsers/chromium`…, Windows installed
Chrome/Edge, macOS Chrome — `browserCandidates()` in `lib/platform.mjs`; the version comes from DevTools `/json/version`,
because `chrome.exe --version` opens a window on Windows) · device-scale gate
(css × 2 = png width) · ffmpeg + ffprobe · libx264 + aac · loudnorm/alimiter/ebur128 · freezedetect/blackdetect/tile ·
libass subtitles · palettegen + libwebp.

## Optional rows
GPU encoder (test-encodes one frame — listed ≠ usable) · Arabic fonts (vendored OFL fonts in `studio/assets/fonts` make
system fonts irrelevant) · Python (not needed for films; `STUDIO_PYTHON`, else `python` on Windows / `python3` elsewhere) ·
live-action, logo-tracer and forensics module lists.

## Install guidance (container is ephemeral)
- ffmpeg: `apt-get install -y ffmpeg` (6.1 tested). Windows: the gyan.dev full build (9.0.1 tested).
- Windows (2026-10-03, owner machine): installed Chrome is found automatically; Python modules install with
  `python -m pip install -r reference/requirements-optional.txt -r tools/requirements-live.txt`. Keep ONE OpenCV package
  (mediapipe brings `opencv-contrib-python`; several OpenCV wheels share the `cv2` folder and overwrite each other).
- Fonts: download OFL TTFs from `raw.githubusercontent.com/google/fonts/main/ofl/<family>/` into `studio/assets/fonts`, add the OFL text.
- pip may be slow/blocked — the studio needs no Python.
- Chromium: never `playwright install`; use the pre-installed one.

## Checklist
1. Run doctor. 2. All required OK. 3. Scale gate OK. 4. Workers = min(4, cores). 5. Disk ≥ 5 GB free for a 60 s 1080p film (frames are piped, but masters are ~200 MB).
6. Fonts vendored. 7. GPU only if test-encode passes. 8. Network not needed for builds. 9. doctor.json saved. 10. Note limits in BRIEF.
