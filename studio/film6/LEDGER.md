# LEDGER — Film 6 Pixel Plus «بكسل واحد» (30 s, 9:16 Facebook Reels, one delivery)
time → issue → severity → fix → result. Takes live in `studio/out/film6/` (not in git). Final: take08.

## Builder loop on stills (before any export; not counted as correction rounds)
| time | issue | sev | fix | result |
|---|---|---|---|---|
| 2.4–3.5 | the full-stop pixel sat mid-height of «واحد», and rested rotated 20° | minor | baseline y = line centre + 0.27·size + 4; hop rotation −180° | sits on the baseline, square |
| logo | first trace kept a frame around the crop as a "letter" | tool | `logo_trace.py` drops curves wider than 90 % of the crop | 11 clean parts (P i-dot i x e l / P l u s +) |

## Gates and tools on the review builds (take02–take04) → fixes
| time | issue | sev | fix | result |
|---|---|---|---|---|
| review evidence | `rawCrop` crashed (`spawnSync ffmpeg ENOBUFS`): a 935×511 copy box is 1.4 MB of rgb24, over the 1 MB default buffer | tool bug | `maxBuffer` 256 MB; regression test in `test/evidence.test.mjs` (fails on the old code) | evidence built |
| 1.9–3.9, 7.5–9.4, 13.7–15.1, 19.7–21.7 | headline pairs: line boxes overlapped (line-height 1.35) | gate | line-height 1.12 (big word) / 1.2 (second line) | PASS |
| 3.7–3.9 | copy grew past the safe edge during the dive | gate | copy fades 3.56–3.72 while the camera pushes | PASS |
| 2.2–3.6, 13.9–15.1, 19.9–21.7 | frozen > 1 s on reading holds | gate | slow push-ins (4–4.5 %) on the holds; end card declared hold [28.2, 30] | PASS |

## Builder review of take04 (frames + 30 fps transition strips) → correction round 1 → take05
| time | issue | sev | fix | result on take05 strips |
|---|---|---|---|---|
| 9.5–9.9 | circle wipe opened off-centre: a crescent on the white ball | major | frame lands on the ball spot (spring 0.38 s), both 88 px, radius from 0 with ease-out | blue fills the white ball, then paper opens |
| 15.5–15.6 | toggle read as two hollow rings (white knob on a still-light track) | minor | track darkens first (0.09 s), knob turns white while sliding | clean dark switch |
| 23.74–23.92 | logo scene's pixel visible inside the collapsing line | minor | hero hidden until 23.94; implosion 23.5–23.84 | one line → one pixel |
| 0–3.5 | intro 13.6 dB below the drop (measured −39.7 vs −26.1 dB) | major (sound) | filtered kick pulse, louder pad, pixel motif in the mids; hook melody at 4.0 and 25.5 | intro −32.4 dB, drop −26.0 dB |

## Separate critique pass of take06 (builder, separate pass — host policy: no subagent without the owner's request) → correction round 2 → take07 → take08
26 phone-size samples, 100 % crops, transition strips, measured timeline/audio. Checked: hook/message, focal hierarchy, Arabic spelling, safe layout, CTA.
| time | issue | sev | fix | result |
|---|---|---|---|---|
| 16–22, 4–10 | chroma rings in the dark/blue radial glows (visible faintly at 100 %, strongly at a 5.5× levels boost) | major (finish) | take07: static dither layer — **did not help** (rings persisted). Diagnosis: the rings exist after a plain RGB→yuv420p conversion with no encoder at all (8-bit chroma rounding). take08: opt-in `config.dither` → `encodeFilter` converts via rgb48 → yuv420p10 → yuv420p with error diffusion | rings gone in the master AND the 14 MB share copy at 20.5 s under the same boost |
| eyebrows | 22 px labels illegible on a phone | minor | 26 px mono / 34 px Arabic | readable |
| 28–30 | credit small for the owner's requested ending | minor | name 46 px, «Made by:» 32 px | readable |
| 0.0 | first frame: tiny pixel high in the unsafe top | minor | fall starts at y 330 (inside the safe band) | pixel visible on frame 1 |

Deliberate (not defects): «الوضع الليلي» is a 0.9 s UI label (the switch is the message); «أثر» holds 0.8 s alone but all three words read together 23.0–23.5;
the end card is a declared hold; reading holds use slow pushes, not stillness; the share copy is larger than the old master because the dither costs bits.

## Close
take08: all technical gates PASS (1080×1920, 30 fps, 30.00 s, −13.8 LUFS, TP −2.0 dBTP, LRA 4.1, no frozen/black spans except the declared end hold,
16 text lines inside the safe area with no overlaps, share copy 13.66 MiB). No blocker or major remains → scope DONE after 2 of 2 correction rounds.
Delivered file: `out/film6/take08/film6-reels30-share-14MB.mp4` (banding verified on it). Master `film6-reels30-1080x1920.mp4` (29 MB) stays local.
Not verified: listening (sound checked by tempo/section/loudness analysis and spectrogram only); real-speed viewing by a human; a fresh-reviewer critique;
the 9:16 under live Facebook overlays; Facebook's own re-encode.

## Music v2 (owner: "music very bad and ugly — Western, energy, beats, catchy rhythm") → take09
`film6/score.mjs` rewritten on the same 120 BPM grid (chapters still start on bar lines): 909 four-on-the-floor, clap 2/4, off-beat sub,
pumping supersaw Am–F | C–G (dark section Am–F | Dm–E), one two-bar 3-3-2 hook that returns in every chapter (pluck → lead → marimba bells →
low saw → full chorus on the logo), snare-roll builds and risers into each drop; heartbeat break 13–16 kept; all UI foley kept on the fx bus.
Measured: tempo 120.0 BPM; sections intro −31.6 dB → drop −21 → bounce −25.5 → break −29.2 → dark −22.3 → logo chorus −19.3 (loudest).
take09 final: all gates PASS (30.00 s, −14 LUFS, TP −3.7, LRA 4.3, 16 text lines, share 13.64 MB). Picture unchanged (same review notes as before).
Not verified: listening (measured only).
