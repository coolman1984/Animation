---
name: ffmpeg-master
description: ffmpeg cookbook for the studio — pipe PNG frames to x264, concat slices, mux, two-pass share copies, loudness, freeze/black detection, contact sheets, crops, WebP/GIF previews. Use for any encode/measure step.
---
# ffmpeg-master
Operating policy: `studio/WORKFLOW.md`; load only the relevant department via `studio/SKILLS.md`.


All wrapped in `studio/lib/render.mjs`, `lib/finish.mjs`, `lib/measure.mjs`. Raw recipes:

| Job | Command |
|---|---|
| PNG pipe → master | `-f image2pipe -c:v png -framerate 30 -i - -c:v libx264 -preset slow -crf 14 -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 -vf scale=out_color_matrix=bt709:out_range=tv` |
| Join slices, no re-encode | `-f concat -safe 0 -i list.txt -c copy -movflags +faststart` |
| Mux | `-map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart` |
| Share copy to N MB | 2-pass `-b:v (N·0.97·8·2^20/dur − 160k)` `-maxrate 1.6×` `-bufsize 2×` |
| Loudness | `-af ebur128=peak=true -f null -` (read the Summary) |
| Loudnorm 2-pass | pass 1 `print_format=json`, pass 2 `measured_*`, `linear=true` |
| Frozen (with grain!) | `scale=180:-2,gblur=sigma=2,freezedetect=n=-58dB:d=1` |
| Black | `blackdetect=d=0.05:pix_th=0.08` |
| Contact sheet | `fps=1/2.5,scale=270:-2,tile=6x4:padding=4` |
| Transition strip | `-ss A -t 1.8 … fps=6,scale=216:-2,tile=6x2` |
| 1:1 crop check | `crop=540:540:x:y` on a master frame |
| WebP preview | `fps=15,scale=540:-2:flags=lanczos -c:v libwebp_anim -loop 0 -quality 70` |
| Spectrogram | `showspectrumpic=s=1400x400:scale=log:fscale=log` |

## Numbers seen
1080×1350, 30 fps, CRF 14 with film grain → ~26 Mbps (198 MB / 60 s). Grain is expensive; the 27 MB share copy
runs ~3.5 Mbps — check its 1:1 crops for mush on gradients. 4 workers on 4 cores: ~5 fps render (6 min / 60 s).

## Pitfalls
- Writing many PNGs with one output name → use `-frames:v 1` or `-update 1`.
- GPU encoders listed by `-encoders` may not work (no GPU) — doctor test-encodes one frame.

## Checklist
1. bt709 tags. 2. yuv420p. 3. faststart. 4. Slices joined with copy. 5. AAC 48 kHz. 6. Share ≤ target.
7. Loudness from ebur128. 8. Freeze on blurred copy. 9. Sheet + strips viewed. 10. ffprobe the final.

**Verification recipes used in showreels:** frame from the export `ffmpeg -ss T -i master.mp4 -frames:v 1 f.png`; strip `-filter_complex hstack=inputs=N` or `tile`; 1:1 HUD crop `crop=480:270:0:0,scale=960:540`; matched board = reference row above ours with the same timestamps (offset-corrected). Prefer frames from the exported file over the preview path.

**Film 6 (2026-10-03):** chroma rings in dark/saturated radial glows come from 8-bit RGB→yuv420p rounding (present before x264). Opt in with `config.dither: true` → `encodeFilter()` (`lib/render.mjs`): `format=rgb48le,scale=…:sws_dither=ed,format=yuv420p10le,scale=sws_dither=ed,format=yuv420p`. Verify with `crop=…,` + `convert -level 0%,18%` on the master and the share copy. Raw rgb24 crops of a 1080×1920 frame need `maxBuffer` well above Node's 1 MB default.
