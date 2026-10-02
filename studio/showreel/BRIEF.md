# BRIEF — Studio Showreel "Every craft, one studio" · 15 s (16:9 hero + 9:16 recomposed)

Owner request 2026-10-02: a dynamic 15-second motion-graphics showreel that works as the studio's
abilities résumé. Go all out. Plan + craft metadata: `production.json`. Decisions only here.

## Truth
- Everything on screen is drawn in code or comes from the studio's own test fixture (the cart app capture
  in `examples/app-film-study/capture/`, our own fixture, no client material). No client logos/photos.
- Claims are only abilities the repository really has (Generation 2 modules). The "REAL DATA" number is the
  value read back from the captured app (capture.json), the BPM is the value measured from this film's own score.
- No studio brand name exists yet: the end card uses a descriptive line, not an invented trademark.

## Direction
Swiss-modern résumé. One index runs through the reel like a CV: `01/08 KINETIC TYPE` … `08/08 YOUR FILM`.
Palette: ink #0B0B10, paper #F2EEE6, vermilion #FF4A2B (the one hot colour, always the "subject"), cobalt #2F4BFF.
Type: Montserrat 800/500 (Latin display + index; ability names 3.6u), El Messiri 700 (Arabic display).
9:16: text stays in the Reels safe band, picture composes lower (centre 0.44 H) and reaches ~75 % of the height. Grid: 12 columns, u = 1 % of the short side.
Motif: **shape continuity** — the vermilion dot is the protagonist; every hand-off carries a shape into the next
section (dot → reveal, grid → sphere → set, ring → flash, bar → flood, 9:16 frame → phone, focus ring → end card).
One camera whip at mid-reel is the single "motion" transition (energy peak before the drop).
Camera: one operator (cinema.js): macro pull-back with flow-through keys, foreground pass + rack focus.

## Structure (128 BPM → bar 1.875 s, 8 bars = 15.0 s exactly; each ability = one bar)
| bar | t (s) | ability | picture | hand-off out |
|---|---|---|---|---|
| 1 | 0–1.875 | kinetic type | ink; dot springs, «كل حركة محسوبة» masks up by line, marker under «محسوبة» | circle reveal from the dot |
| 2 | 1.875–3.75 | physics | paper; 9×5 grid springs in a ripple, falls away with inertia, centre cell becomes the sphere | match cut on the sphere |
| 3 | 3.75–5.625 | camera + depth | cobalt set, 5 planes; pull-back 2.4→1.05, column passes, rack focus | whip left (+whoosh) |
| 4 | 5.625–7.5 | light + particles | ink/cobalt WebGL field + rays, ring draws, sparks burst on beat 3 | the ring's light floods the frame on the drop |
| 5 | 7.5–9.375 | sound | vermilion; 40 bars driven by the measured music map, BPM counts to the measured value | paper floods from a bar |
| 6 | 9.375–11.25 | formats | paper; one frame springs 16:9 → 1:1 → 9:16 while its layout recomposes | the 9:16 frame opens into the phone |
| 7 | 11.25–13.125 | real data | cobalt; real app capture, camera pushes to the total, focus ring, verified value counts | circle reveal from the ring |
| 8 | 13.125–15 | your film | ink; dot + frame line, «فيلمك الجاي يبدأ هنا», settled hold 13.5–15 | — |

Sound: original 128 BPM score (lib/audio.mjs): impact on frame 1, filtered arp, kick from bar 2, riser into the
drop at 7.5 s, whoosh on the whip, UI confirm on the focus ring, final chord on the end card. Cues live in production.json.
