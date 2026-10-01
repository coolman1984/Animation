---
name: edit-rhythm
description: Timing of the cut — beats on bar lines, dwell times, speed ramps, J/L overlaps, cut-downs and loops from one master. Use when building the timeline or making short versions.
---
# edit-rhythm

## Grid
Choose the tempo first (film 2: 90 BPM → beat 0.667 s, bar 2.667 s). Scene starts on bars; montage cuts every
2 beats (1.333 s); transitions straddle the downbeat (start ~0.3–0.6 s before it).

## Numbers
- Dwell on any proven number / key line ≥ 1.8 s; reading ≤ 17 cps.
- No shot > 8 s without a change in motion/framing.
- Speed ramps for captured idle stretches ≤ 2.6×, smoothed; 1× after a proven result and at scene starts.
- J/L: sound of the next scene may start ≤ 0.5 s early (chime under the tap); picture overlaps 0.3–0.5 s.

## Cut-downs from one master (no re-shoot)
Whole-bar segments of the hero, joined by the composer (`?segments=`) and by `assembleAudio()` (20 ms crossfades):
- 15 s: hook (bars 0–2) + duo opening (bars 5–6.25) + end card (bar 19 → 57.0 s), fade 0.6 s.
- 6 s bumper: hook bar 0 + end card (bar 19 → 54.0 s), fade 0.4 s — works muted.
Pick segments whose chords connect (G13→G13, C→Dm here) so the music cut is invisible.

## Checklist
1. Tempo chosen. 2. Beats on bars. 3. Dwell ≥ 1.8 s. 4. Longest shot ≤ 8 s. 5. Transitions straddle downbeats.
6. Cut-downs whole bars. 7. Chord joins checked. 8. Final fade only once. 9. Durations within ±10 %. 10. Strip at 6 fps reviewed.

## Worked example
`studio/film2/config.mjs` deliveries.
