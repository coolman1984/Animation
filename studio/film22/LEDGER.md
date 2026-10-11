# Film 22 — ledger
- 2026-10-11 take01–03 review builds: gates failed on (a) a frozen span 2.23–3.23 s (typing beat; fixed with a continuous camera push 1.00→1.065), (b) text safe/overlap (headline line boxes, the label below 1248 px, hook lines under the window brand). take04 review: all gates PASS.
- take05 FINAL (local, `out/film22/take05/`): 1080×1920, 30 fps, 10.000 s; −14.2 LUFS, TP −3.2 dBTP, LRA 2.9; no frozen span; 125 text lines inside the safe band, no overlaps; share copy 11.91 MB (`film22-reels10-share-12MB.mp4`). Render ~2 min with 4 subframes per frame on 3 workers.
- Correction rounds used: 1 (gate fixes above) of 2. Own review of the exported frames (contact sheet at 6 fps + four 540 px frames): readable, cursor blur visible. No separate fresh reviewer.
- New engine feature: `lib/render.mjs` `subframes` (config.subframes = S): S captures per frame over a 180° shutter, averaged by ffmpeg in 16-bit gamma-2.2 light (`shutterFilter`). Verified only by this film's render; no unit test added.
- Not verified: listening to the mix; real-speed phone playback; sound-vs-picture offset (kicks and hits sit on the picture's own times, not one frame after); Meta's overlays.
- Assumptions: audience, copy and CTA chosen autonomously (AUTONOMOUS_FILM.md). Rights: Alexandria + Space Mono OFL; all synthesis original.
