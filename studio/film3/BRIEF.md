# BRIEF — Film 3 "خُد لحظتك" · BALACONBAR · 25 s (feed 4:5 + vertical 9:16)

**Status:** in production (see LEDGER.md). Owner brief of 2026-10-01 is the spec; this file records decisions only.

## Truth
- Product evidence: owner photo `IMG-20261001-WA0017.jpg` (cup + coconut-milk carton). Cup, logo, label, boba and ice
  are never redrawn — only cut out (film 2 plates) and recomposed. Brand name = the one printed on the cup.
- `WA0015` (swing poster): mood only, **not used in picture**. `WA0014` (vintage board): palette mood only; nothing claimed from it.
- Copy: "مش أي ماتشا…" · "ماتشا… على مزاجك" · "مع جوز الهند" · "وبوبا تكمل اللحظة" (owner confirmed the drink name
  "ماتشا جوز الهند بالبوبا") · "خُد لحظتك" · CTA "جرّبها النهارده". No prices, address, health, origin or partnership claims.
- Client photos and plates stay local (`film3/source`, `film3/plates` git-ignored; repo is public).

## Direction
Cold detail → warm enjoyment. Palette: deep green #0F2A22/#1C4436, natural matcha #9BB85A, warm cream #F3E9D6, quiet gold #C9A55C.
Type: El Messiri 600 (all headlines), IBM Plex Sans Arabic 500 (CTA). Three composition families: detail (0–3, 11–15),
full product (3–7, 20–25), product in a calm environment (7–11, 15–20). Transitions (3 kinds only): product-matched cut
(3 s, 11 s), defocused leaf passing the lens (7 s, 15 s), arch-mask reveal around the same cup (20 s).

| t (s) | Scene | Camera / layers | Text |
|---|---|---|---|
| 0–3 | Lid & ice on the real counter (clean rebuilt bar plate + carton + cup cut-outs) | pull-back 1.6→0.98; focus travels ice → logo (sharp twin masked over a blurred twin) | مش أي ماتشا… |
| 3–7 | Full cup, deep-green studio, contact shadow + reflection | matched cut, lateral drift; bokeh slower, foreground leaf faster | ماتشا… على مزاجك |
| 7–11 | Real counter: cup → carton → cup | truck to carton with focus pull, hold, return and push into the cup | مع جوز الهند |
| 11–15 | Boba & layers on warm cream | matched cut, diagonal crane, settle for reading | وبوبا / تكمل اللحظة |
| 15–20 | Climax: warm gold bar, carton far back and soft, hero cup | slow push, light sweep, gold bokeh, foreground leaf | خُد لحظتك |
| 20–25 | End: one cup, logo, gold rules, CTA held to 25.0 | arch reveal, cup settles, background glow drifts (logged hold 21.7–25) | جرّبها النهارده |

9:16 is recomposed per scene (own cameras, text positions, logo/CTA inside x 65–1015 / y 269–1248).
Music: code-generated, 96 BPM, 10 bars, Em9–A13–Dmaj9–Bm9 loop, climax bars 6–7, cadence at 22.5 s → D6/9 rings out.

## Rebuild
`cd studio && node film3/plates.mjs && node make.mjs film3 --profile=final` (photos must be in film3/source).
