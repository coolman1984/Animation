# BRIEF — Film 4 "Your Matcha Moment" · BALACONBAR · 20 s (9:16 Reels + 4:5 feed)

Owner brief of 2026-10-01 is the spec; this file records decisions only. Plan + craft metadata: `production.json`.

## Truth
- Product evidence: owner photo `source/hero-duo.jpg` (real cup + LAMAR coconut-milk carton). Cup, logo, boba, ice and carton
  are only cut out and recomposed (film 2's measured masks), never redrawn. Brand spelling = the cup: BALACONBAR.
- `source/swing.jpg` (old poster): only the rope + wooden seat are reused; its AI cup is removed and the seat inpainted,
  the real cup stands in its place. `source/vintage-board.jpg`: palette + arch grammar only — no people, cars, dates or claims.
- Copy: "مش أي ماتشا" · "لحظتك مع الماتشا" · "بجوز الهند" (the carton is in the real product photo) · end card logo +
  "لحظتك مع الماتشا" + "YOUR MATCHA MOMENT". No prices, health, origin or partnership claims.
- Photos and plates stay local (`source/`, `plates/` git-ignored).

## Direction
Contemporary product cinema first, heritage café second. Light: cool fresh → natural green → cream → gold → deep green.
Type: El Messiri 500 (Arabic), Montserrat 500 tracked caps (one English line). Three transition families only:
foreground occlusion (rope 2.5 s, pillar 13.125 s), focus handoff (6.25 s), match cut (9.375 s, camera keeps moving through it).

| t (s) | Shot | Camera / layers |
|---|---|---|
| 0–2.5 | macro hook, cool light | pull-back 2.6→1.08, focus travels ice → logo, fg droplets (depth 2.1) |
| 2.5–6.25 | real cup on the swing, green café light | truck behind the rope, settle; swing drift ≤ 0.5°; rack to fg leaf at the end |
| 6.25–9.375 | real counter: carton sharp → rack to cup | lateral, then one push that continues through the match cut |
| 9.375–13.125 | macro crane boba → gradient → ice | travelling focus band, warm light sweep 10.9–12.3 |
| 13.125–17 | cup inside an arched window, gold light, no text | slow push, arch scales with zoom^2.6, gold sweep 14.7–16 |
| 17–20 | same shot: light falls to deep green, breathe out, brand | settled by 18.25, logged hold 18.2–20 |

Music: code-generated, 96 BPM, 8 bars (Em9–A13–Dmaj9–Bm9–Em9–A13–G/A–D6/9): hook bar 1, lift at 10 s, resolution 17.5 s.
Cuts at 2.5 / 6.25 / 9.375 / 13.125 sit on eighth-note grid (rhythm.mjs); 17.0 is deliberately half a beat before the cadence.

## Rebuild
`cd studio && node film4/plates.mjs && node make.mjs film4 --profile=final` (photos must be in film4/source).
