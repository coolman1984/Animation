# LEDGER — film 12 (time → issue → severity → fix → result)

| Round | t (s) | Issue | Sev | Fix | Result |
|---|---|---|---|---|---|
| Plates | host | green turf spill on the shoulder survived the person mask | major | green-dominance key + largest component + 1 px erode | clean on teal |
| Plates | logo | JPEG fringe made green/blue cubes at the logo edge | minor | flat colour = median of opaque pixels | solid |
| Style frames | 2.1–6.2 | pitch small, players tiny | major | players ×1.55, ball ×1.6 | readable |
| Style frames | 13.8 | white "كل قرار" lost on the white silhouette | major | pink with black extrusion | readable |
| Style frames | 20.9+ | `LOCK` constant pointed at 25 s → title stayed cubes | major | LOCK = 10·bar (20.83 s) | crisp title after the lock |
| Proof | 2.3 / 6.4 / 8.6 / 10.7 / 15 / 17 | 0.3 s of empty background after each cut | major | heroes start assembling inside the transition window | no dead frames |
| Review take02 | all | true peak −0.7 dBTP | blocker | lookahead limiter + soft clip in the score | −3.5 dBTP, −13.8 LUFS |
| Review take02 | headings | text outside the 5 % safe box (line-height, entry scale) | major | line-height 1.0, tops ≥ 76, smaller entry scale | gate passes |
| Review take04 | 11–12 | "بعد ٥ جولات" chip covered the first bar's label | major | rows moved down (top 296, step 60) | clear |
| Judge take05 | host 16.8–18.4 | stair-stepped matte, soft face (848×478 source) | major | frame upscaled 2× Lanczos, alpha blurred + smoothstep on the big grid, light unsharp | smooth edge |
| Judge | trophy 8.5–10.1 | crop included crowd arc, turf, light tile; blurry mosaic | major | colour rules outside the cup column, bottom edge dissolves, unsharp + saturation, cell 8 | clean silhouette, crisp |
| Judge | all | equalizer showed 2 bars only | major | fractional band index returned NaN → interpolate bands | full-width music-driven bars |
| Judge | 12.6–14.4 | "كل" lost on the white silhouette; blob without detail | major | comic-ink halftone version of the photo, silhouette 860 px, 16-direction black halo on the words | readable on every frame |
| Judge | 8.1 / 10.2 / 16.6 / 18.6 | empty frames after a cut | minor | cube floor of 35 % alpha / 40 % size, shorter scatter distances, earlier starts | cubes visible inside the clip |
| Judge | 2.0–3.0 | pitch slow to read, ghost text | minor | drop 1.7–2.7, lines 2.45, players 2.7, text out at 1.68 | pitch readable by 2.7 s |
| Judge | various | text/graphic clearances (ball vs "الكورة", rings over numerals, heading vs pitch) | minor | ball up, rings removed in the chart, pitch/radar moved down, chips marked "(توضيحي)" | ≥ 30 px |
| Judge | chart 10.8–12.4 | chart filled 55 % of the width | minor | 88 px per point, x0 1470 | full width |
| Judge | audio | lock hit not bigger than the others; ball hit softer | minor | lock impact + kick ×1.5–2, other cut hits 0.6, −2 dB outside the lock window | lock +3.9 dB, ball ≥ cuts |
| Final take07 | — | wide25: all 11 gates PASS (−13.8 LUFS, −2.7 dBTP, 23.2 MB share); 26 timestamps inspected on the exported file; text gate fix ("الكورة" box at entry). Not verified: listening, real-speed viewing | — | — | delivered |
| Owner v2 (take08) | all | owner: use the reference reel's music exactly, change nothing else | — | reference music fitted 117.57→115.2 BPM (rubberband, pitch kept), beats 0–23 twice with the repeat on the 12.5 s cut, same RMS as the old bed, effects unchanged; equalizer/relief now read the new mix | all 11 gates PASS (−14 LUFS, −3.2 dBTP); 48 hits on the grid, every cut within 9–15 ms of a hit. Licence of the track NOT verified |
| Owner v3 (take09) | all | owner: sync the picture to the music (music untouched) | — | rubberband removed; picture retimed by film12/timing.js (real t × 1.0206 = authored time), effects resampled onto the same clock, production times scaled; track repeats from its start at 12.248 s (the flash cut) | all 11 gates PASS (−14 LUFS, −1.9 dBTP); all ten cuts/hits within 1–24 ms of a drum hit. Licence NOT verified |
