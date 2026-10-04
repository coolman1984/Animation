> **Owner revision v2 (2026-10-04):** "the client can't read anything" → 44 s at 120 BPM (everything ~20% slower), six areas 2.5 s each and never blank, a 4 s hosts chapter (12–16) plus the names under the CTA, new catchy western dance-pop score. 30 fps. The clock table below is v1; current times are in `timing.js`.

# BRIEF — Film 11 «AI × HR» · workshop showreel · 25 s · ONE delivery: 1920×1080 @ 60 fps

Owner request 2026-10-04: a 25 s Arabic motion-graphics video "like the strongest showreel in a world-class motion designer's portfolio" for the new course/workshop
**AI × HR**: bold 3D, kinetic type, inventive transitions, morphs, cinematic camera, motion/music/SFX in sync, escalating rhythm, 1080p 60 fps, no questions asked.
Two posters supplied (announcement + workshop). Plan and craft metadata: `production.json`. Rebuild: `node studio.mjs build film11 --profile=final`.

## Truth
- Only the posters' own copy is used: the hosts (Ayman Essam — RBA, PHRi; Mohamed Fawzy — AI Automation | Lecturer), the six Traditional HR → AI-Powered HR areas, the workshop
  ingredients, "Bigger Than a Training…", "WORKSHOP COMING SOON", "I'M INTERESTED — اكتب في الكومنت". **No date, price, venue or contact was supplied, so none is shown.**
- Posters' artwork is not copied; the film is rebuilt from scratch in code (CSS 3D, canvas particles).

## Idea
The hero is the **×**. Old HR drowns in a storm of paper («الـ HR بيتغير بسرعة…»); the storm bursts into AI (extruded 3D type, «والـ AI مش بقى مجرد Tool» — the word *Tool* is sliced
and imploded); AI × HR becomes the 3D title with the two hosts; six HR areas flip from before to with-AI; the workshop's ingredients orbit as a 3D ring the camera pushes through;
"Bigger Than a Training…" breaks into three word-wipes; the × ends as the yellow slab «WORKSHOP COMING SOON» with the lock-up and the call to comment.

## Clock (144 BPM, beat = 25 frames at 60 fps, bar = 100 frames, 15 bars = 25.000 s) — `timing.js` is shared by picture and sound
| beats | s | chapter | event |
|---|---|---|---|
| 0–8 | 0–3.33 | storm | three slammed words on beats 0, 2, 4; snare roll; riser |
| 8–16 | 3.33–6.67 | brain | flash + AI impact; «والـ» / «مش بقى مجرد» / Tool; slash at beat 12; implode 15.4 |
| 16–24 | 6.67–10 | title | flash, AI × HR, × spin, subtitle, hosts, pill |
| 24–36 | 10–15 | flip | a new area every 2 beats, ratchet rising per card |
| 36–44 | 15–18.33 | ring | cylinder ring, push-through at beat 41 |
| 44–52 | 18.33–21.67 | mega | Bigger / Than a Training… / three wipes at 48, 50, 51 |
| 52–60 | 21.67–25 | end | smash, WORKSHOP / COMING SOON, CTA at beat 57, hold |

Music (`score.mjs`, original): A minor → F → C → G ×3, then F G C; kick/clap/hats/bass/pads/arp/hook entering by chapter (half-time chops in the flip chapter, one-beat stop at the
mega chapter), pumping side-chain, soft limiting for loudness. Not listened to (measured only).
