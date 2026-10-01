---
name: platform-delivery
description: Per-platform specs and upload checklist — aspect, length, bitrate, loudness, safe zones, filenames. Use when deciding formats or packaging deliverables.
---
# platform-delivery

| Platform | Aspect / size | Length | Loudness | Notes |
|---|---|---|---|---|
| Facebook / Instagram feed | 4:5 1080×1350 (max feed area) | hero ≤ 60 s; 6–15 s versions usually perform best | −14 LUFS | 85 % watch muted → message in text |
| Reels / Stories | 9:16 1080×1920 | ≤ 60 s (≤ 15 s ideal) | −14 | safe: top 14 % (269 px), bottom 35 % (672 px), sides 6 % (65 px) |
| YouTube | 16:9 1920×1080 (or 4K) | any | −14 (normalised) / −16 web | burn-in optional; upload SRT |
| Website hero loop | 16:9, silent | 6–12 s loop | — | WebP/MP4 ≤ 4 MB |
| Bumper | any | 6 s | −14 | brand + one line + CTA |
| Chat (WhatsApp etc.) | as master | — | — | share copy ≤ 27 MB (30 MB caps) |

All: H.264 High, yuv420p, bt709, AAC 48 kHz, faststart.

## 9:16 from a 4:5 film (how film 2 did it)
Composer stage 1080×1920; film detects `H/W > 1.5` and puts the 1080×1350 design at y 285; backdrops bleed,
photo cameras go through `fill()` (min 1.2× for a 1600² photo), text kept in x 65–1015 / y 269–1248, end card scaled as
a group. Deliveries `reels60` / `reels15` in `studio/film2/config.mjs` with `w, h, safe`. Regression-check the 4:5 output after.

## Filenames
`<film>-<delivery>-<W>x<H>.mp4`, `<film>-<delivery>-share-27MB.mp4`, `<film>-music-only.m4a`,
`<film>-<delivery>.ar.srt/.vtt`, `.en.srt/.vtt`, `thumb-N.jpg`, `poster.jpg`, `contact-sheet.png`, `measure.json`.

## Upload checklist
1. Right aspect per placement. 2. Captions file attached. 3. Thumbnail chosen. 4. CTA button matches the film's CTA
(film 2: "Get directions"/"Send message"). 5. First 3 s checked muted on a phone. 6. Brand ≤ 5 s. 7. No banned claims.
8. Loudness −14. 9. File plays (ffprobe). 10. Short versions uploaded as separate ads for testing.
