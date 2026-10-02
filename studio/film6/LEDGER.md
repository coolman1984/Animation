# LEDGER — Film 6 PIXEL Plus video ad «عندك فكرة حلوة عايزها تتشاف؟» (20 s, 9:16 Reels, one delivery)
time → issue → severity → fix → result. Takes live in `studio/out/film6/` (not in git). Final: take09.

## Reference study (owner-supplied screen recording, pack `references/pixelplus-ref/`, private)
`reference.mjs analyze` + `timeline` + `audio` (OpenCV/librosa installed for this session). Visually inspected: overview,
three evidence sheets, eight full-resolution frames. Measured: 123.15 BPM, A minor/Phrygian, house kick/clap pattern, motion
peaks at the dot grow (≈2.8), push (≈5.0), whip (7.4–8.1), stamp/iris (11.4–11.7) and bloom (13.8). Audio analysed
numerically, not heard; no voice in the reference.

## Builder loop on stills (before any export; not counted as correction rounds)
| time | issue | sev | fix | result |
|---|---|---|---|---|
| mascot | egg body, long neck, grey face, tiny eyes, side-hair helmet | major | bust ellipsoid, short neck, brighter skin (gamma × 0.75), bigger eyes/brows, hair cap rules; headphones dropped (unreadable), round glasses added (identity, ≠ reference) | readable, friendly at film scale |
| 9.8–19 | «ابدأ» pill leaked into later scenes (child `visibility: visible` beats a hidden parent) | blocker | scenes toggled with `display` | gone |
| 4.6 | service objects ≈ 50 px | major | object size 0.24 → 0.33 | readable objects |
| 7.9 | «ويتفتكر.» past the left safe edge | major | 150/128 px | inside |
| 18.8 | sweater visible through the wordmark | major | mascot behind the brand layer, clipped at the letters' top | head peeks over the logo |
| 8.2 | phone text clipped; PIXEL touching Plus | minor | 33 px; 0.2 em gap | clean |

## Gates (review takes 02–04)
| time | issue | sev | fix | result |
|---|---|---|---|---|
| 18.3–20 | frozen end card | gate | declared hold `[[18.3, 20]]` (CTA reading time) | PASS |
| 13.0–13.3 | black opening of the dark scene | gate | declared `darkSpans [[12.95, 13.4]]` (deliberate beat of darkness after the iris) | PASS |
| 3–4.1, 5.8–6.2, 6.4–9, 13.7–16, 10.0–10.5 | text outside safe / overlaps (result push-in scaled from the centre; dark lines too wide; Ruqaa line boxes tall; words of arriving cards counted before the card arrived) | gate | result scales from its right edge; dark 112/148 px; accent line-height 1.0; words fade with their card; services words fade 0.1 s into the push | PASS take04 (32 lines checked every 0.1 s) |
| 7.9 | forward vs reverse render differed (underline measured on the first rendered frame, mid-push) | blocker | untransformed layout boxes (`layoutRect`) | film-6 determinism test passes |

Notes, deliberate: «اتظبط.» stamp is a 0.85 s one-word punch (preflight's 1.8 s reading note); the palette overlaps the
showreels because the owner asked for the reference's white/ink/blue; cue "stamp −42 ms" is the detector's transient estimate.

## Independent critique of take04 (fresh reviewer agent; frames, strips and 100 % crops of the export; audio measured, not heard)
Verdict: not ready — 0 blockers, 5 majors, 5 minors. Same day the owner revised the brief (Arabic on-screen copy + music, no
voiceover; «إعلان/فيديو» instead of «فيلم»; a new character with an Egyptian character). Correction round 1 covered both → take05–07.
| time | issue | sev | fix | result on the exported take06/07 |
|---|---|---|---|---|
| whole | mascot too close to the reference character (hair, sweater, chest patch, staging) | major | new character «ابن البلد»: tarboosh + side tassel, moustache, cheeks, tan skin, galabeya placket, + pin; colour pair per material | clearly a different, Egyptian character; owner request met |
| 17–20 | CTA pill covered the dots of «بتخلّي» | major | footer removed, CTA row 1094 → 1128 | dots visible, clear gap at 18.9 |
| 14.9–15.55 | «الباقي.» readable ≈ 0.5 s, 3.2:1 on black | major | lands by 14.6, bloom from 15.62; #8197FF on black | readable 14.6–15.65 |
| all mascot shots | blown white patch on the lit face; outline lost on white | major | tan skin paper colour; shirt lum ≤ 0.9 keeps dots | continuous outline |
| 9.93–10.07 | black barrel → grey flash at the click | major | one light circle in the board's colour, cut under full cover | frames 9.80–10.07 only grow, one colour |
| 18.9 | torso edge touching the wordmark | minor | character raised, clipped 25 px above the letters | clear paper above the letters |
| 4.8 | megaphone read as a lollipop; «01» and «٠١» both shown | minor | spins settle on a ¾ view by t0+1 s; Latin numbers removed | megaphone and camera read |
| 7.8 | big mascot competed with the phone; under the Reels buttons | minor | corner peek, head 200 → 135 px | phone leads |
| 0.0 | weak first frame | minor | character in frame from frame 0, first word solid | frame 0 shows face + «عندك فكرة» |
| 11.5 | tiny board mascot broke into noise | minor | tighter crop (size 0.40) | face and tarboosh read |
Also in round 1: HUD timecode and «BPM» made Arabic (timecode in its own LTR isolate); voice pipeline removed; score rewritten
with darbuka maqsum, riq and an oud-like melody in A Hijaz.

## Owner revision 2 — «change the character: a complete human, cute, friendly» → correction round 2 (owner-requested) → take08–09
| time | issue | sev | fix | result on the exported take08/09 |
|---|---|---|---|---|
| whole | the tarboosh-and-moustache bust looked older and was only a head and shoulders | owner | new full-body chibi character (arms, legs, trainers, hoodie), big eyes with two highlights, dithered blush, small smile, swept hair; arm/forearm angles, hop, stride, ground shadow as uniforms; palette: tan skin, yellow hoodie, jeans, white trainers | complete, readable, friendly in every scene |
| 3–6 | cards (y 640–1140) would hide a full-height figure | layout | cards moved to y 610–1080 (470 px high) so the figure stands below them | figure fully visible, points at the cards |
| 16–20 | no room for a full figure above the wordmark | layout | the character stands ON the wordmark (feet 846, hidden 12 px behind the letter tops), pops up with a spring about its feet | readable, no overlap with the tagline |
| 6–9 | big figure vs phone | layout | figure stands to the right of the phone, x 765, 122 px unit | phone still the largest object |
Gates after the change: all PASS (31 text lines checked, no overlaps). Not verified: listening; phone playback.

## Final (take09, `make film6 --profile=final`)
All technical gates PASS: 1080×1920, 30 fps, 20.00 s, −13.9 LUFS, TP −3.0 dBTP, LRA 5 LU, holds/dark span declared, 31 text
lines inside the safe area with no overlaps, share copy 11.18 MB. The master (5.6 MB, CRF 14) is smaller than the share copy
because flat graphics compress well, so the master is the delivered file. Not verified: listening (music measured only) and
real-time playback on a phone. The independent critique covered take04 (the earlier busts); the new character was checked on
stills, strips and the exported frames by the builder only — no second fresh review was run for this owner-requested swap.
