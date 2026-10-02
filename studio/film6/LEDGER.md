# LEDGER — Film 6 PIXEL Plus «عندك فكرة حلوة عايزها تتشاف؟» (20 s, 9:16 Reels, one delivery)
time → issue → severity → fix → result. Takes live in `studio/out/film6/` (not in git).

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

## Independent critique
Pending at the time of this commit.
