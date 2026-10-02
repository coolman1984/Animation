# LEDGER — Studio showreel (15 s, 16:9 + 9:16)

time → issue → severity → fix → result. Takes live in `studio/out/showreel/` (not in git).

## Builder checks before the critique (take02–take06)
| time | issue | sev | fix | result |
|---|---|---|---|---|
| 0.0 | frame 1 was black with an invisible dot | major | dot arrives at 4.2× on the opening impact and springs down | frame 1 = vermilion disc on ink |
| 0–0.5, 13.3 | ink #0B0B10 read as "black frames" | gate | rich black #191920 (still reads black) | black gate PASS |
| 11.3, 3.8… | index switched colour before its background did (paper on paper) | major | index lives only outside hand-off windows | PASS on gallery crops |
| all | hidden sections and mask-clipped words were counted by text read-back | tool | composer ignores visibility:hidden and clipped word areas (studio fix) | read-back PASS, 36/35 lines |
| 12.2 | counters produced one caption per intermediate number | tool | counters caption their final value (studio fix) | captions show ١٠٠٫٥٠ ج.م / 128 |
| 12.2 | camera dead stop (hold key mid-move) | minor | flowing key instead of hold | diagnostic cleared |
| — | contrast estimate read thin 15:1 text as 2:1 | tool | 2nd/98th percentile estimate, verified on crops | realistic values |

## Independent critique of take06 (fresh reviewer): SHIP WITH FIXES, 0 blockers, 5 majors
Round 1 (the only correction round used) → take07. Every result below was checked on frames extracted from take07's exported files.
| time | delivery | issue | sev | fix (round 1) | result |
|---|---|---|---|---|---|
| 12.0–13.1 | 9:16 | phone frame cut through the total and «ج.م» | major | tall phone lower and larger (40u), text block above it, push 1.07 about the total | take07 9:16 at 12.1/12.6/13.05: no overlap |
| 11.9–13.1 | both | counter shows a "Latin comma" | major (reported) | **not reproduced**: counter and app both use U+066B; El Messiri/Plex Arabic draw ٫ as a small comma (rendered side by side). Kept the correct character | recorded, no change |
| all | 9:16 | lower 35 % empty; square layout stuck to the top | major | tall composition centre 0.44 H; grid 5×10, bars to 0.76 H, phone to ~0.76 H; text stays in the safe band | take07: grid/bars/phone reach ~0.73–0.76 H |
| 0.7–1.65 | both | hook bar still for ~1 s; marker missing (clipped by the mask) | major | marker inside the word box on beat 2, spring on «محسوبة» on beat 3, slow push on the line | take07 1.3 s: marker + full stop visible, both deliveries |
| bars 2–7 | both | ability names smallest thing on screen | major | labels 3.6u (cap ≥ 2.5 % of short side), Arabic 3.8u; Arabic on its own row in 9:16 | take07: labels legible on every bar |
| 5.70–5.77 | both | whip ended on a sharp sliver | minor | cameraPass blurs outgoing until gone, incoming until landed (studio fix) | take07 5.733/5.767: soft edge only |
| 5.7–7.5 | both | template-looking light bar; maroon off-palette; flash from the left edge | minor | ink/cobalt field, ring 22–26u, hand-off = the ring's light floods the frame (colorHandoff from the ring) | take07 7.43: white disc grows from the ring |
| 9.367 | both | vermilion corners left at the flood | minor | flood starts 0.08 s earlier, completes before the cut | take07 9.367: no vermilion |
| 3.1–3.75 | both | falling tiles merge into blobs | minor | paper edge on every tile | take07 3.5: separate in both |
| 3.8–5.4 | both | index lost on bright columns | minor | dark scrim under the index strip in the set | take07 4.6: legible |
| 11.27–13.1 | 16:9 | "9:16" label cut by the opening panel; progress line camouflaged by the phone | minor | label exits before the hand-off; progress line moved under the index | take07 11.27: no cut label |

Deliberate (not defects): format labels 16:9/1:1 are on screen 0.3 s each (the point is the change); camera pull-back
0.5 ln/s at 3.8–4.4 s is the energy of the reel; hook and end-card copy holds are below the 1.8 s starting point
because every ability gets exactly one bar (1.875 s); the end card is fully settled 13.5–15 s (logged hold).

## Close
take07: all technical gates PASS on both deliveries (1920×1080 and 1080×1920, 30 fps, 15.00 s, −14 LUFS, TP −3 dBTP,
LRA 4.9 LU, no black/frozen spans outside the logged hold, text inside safe areas with no overlaps, share copies 9.43/9.32 MB).
No blocker or major remains → scope DONE after 1 of 2 correction rounds.
Not verified: listening on headphones/phone speaker (no audio playback here; waveform/spectrogram/loudness only);
real-speed playback by a human; the 9:16 under live platform overlays.
