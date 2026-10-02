# BRIEF — Film 5 «طعم زمان.. بمذاق النهارده» · BALACONBAR, Beni Suef · 25 s · ONE delivery: 9:16 Reels (valid for Facebook Reels)

Owner request 2026-10-02: a 25 s dynamic ad for the café in Beni Suef that uses everything the studio has learned (stretchy type, springs, directional blur,
fast transitions, modern 2026 motion mixed with the old/80s nostalgic look of the owner's images), exciting original music with a distinctive rhythm, and
"one video only, in Reels shape". Plan + craft metadata: `production.json`. Rebuild: `node film5/plates.mjs` (+ the ffmpeg crops listed below) then `node make.mjs film5 --profile=final`.

## Truth
- Product evidence: the owner's real photo (`source/hero-duo.jpg`, cup + LAMAR coconut-milk carton). Cup, carton, logo and boba are cut out and recomposed, never redrawn.
  Brand spelling = the cup: BALACONBAR. The vintage board's spelling "BALAKON BAR" / "BOALCON BAR" is never shown (crops avoid every baked word).
- Storyboard (AI scene art, owner-supplied): text-free crops used only as café atmosphere (swing, awnings, man + car). Never as product proof.
- Vintage board: drink illustrations (iced coffee, latte, lemon, milkshake, bakery), the man with his car, the statue. The agent recorded this assumption; the owner can correct it later.
  No dates or claims from the board are used ("1930", "من قلب الثلاثينيات" are not shown).
- Copy: «طعم زمان..» · «بمذاق النهارده» · «ماتشا بلبن جوز الهند» (the carton is in the real photo) · menu words from the board · «كافيه في بني سويف» ·
  «بارد. كريمي. منعش.» · «تعالى جرّب» · «لحظتك مع الماتشا» (the owner's own tagline) · YOUR MATCHA MOMENT. No prices, health claims, hours or address.
- **Not in the film (no source supplied):** address / phone / social handle / opening hours. The film only says «كافيه في بني سويف». Optional extras, not blockers (AUTONOMOUS_FILM.md: one request → one finished video).
- Third-party mark: the carton shows its maker's logo (LAMAR); the film makes no partnership claim (same owner decision as film 2).

## Direction
Two worlds on one grid: OLD = sepia paper, film strip, polaroid, scratches, grain, Aref Ruqaa; NEW = saturated matcha green, crisp cut-outs, Archivo variable
width (62 → 125 per letter, springs), directional blur, lime accent. They collide (18–20 s) and merge in the lock-up. Motif: the balcony-window arch (the logo)
as portal. Marquee bands fill the unsafe zones with motion. Transitions: tape rewind, rope occlusion, paper slam, band wipe, arch portal, diagonal split swap, cuts on 1/8.

| t (s) | bar | scene | idea |
|---|---|---|---|
| 0–2 | 1 | hook | real cup on frame 1, stretchy MATCHA, tape rewind into the old world |
| 2–4 | 2 | zaman | sepia film strip + polaroid, «طعم زمان..», colour blooms at 3.5 |
| 4–6 | 3 | naharda | real cup on the swing (rope wipe), «بمذاق النهارده», YOUR MATCHA MOMENT |
| 6–8 | 4 | ingredients | carton + cup, MATCHA + COCONUT, focus pull carton → cup |
| 8–10 | 5 | menu | five vintage drink cards on a dotted-eighth rhythm (0.375 s) |
| 10–12 | 6 | place | three café bands, pin, BENI SUEF |
| 12–14 | 7 | sensory | «بارد. كريمي. منعش.» on three beats |
| 14–16 | 8 | montage | eight 1/8-note cuts: real macros ↔ vintage bands |
| 16–18 | 9 | arch | the logo window opens onto the café, «تعالى جرّب», TRY IT |
| 18–20 | 10 | collide | زمان vs النهارده diagonal split swaps, then the new wins |
| 20–25 | 11–12 | brand | logo, «لحظتك مع الماتشا», Beni Suef, held and sparkling |

Music (original, `score.mjs`): 120 BPM, D hijaz, synth bass, plucked arps, darbuka maqsum (dum tak _ tak dum _ tak _), radio low-pass for the old world, drop at 4.0,
stabs on the menu, hits on every 1/8 of the montage, bell chord at 20.0, ding at 24.0. Not listened to (no playback here).

## Plates (git-ignored) and crops
`node film5/plates.mjs` → cup/carton cut-outs, swing rig, logo, bar plates (reuses films 2–4 jobs). ffmpeg crops from the owner's boards into `film5/plates/`:
`sb1-macro sb2-swing sb3-ingred sb4-cafe` (storyboard), `v-mancar v-statue v-card0..4` (vintage board, cards 3× lanczos + unsharp), `hero-duo.jpg` (copy of the hero photo).
