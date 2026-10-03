# QUALITY PLAYBOOK — how film 6 got to "premium", as a repeatable method

Distilled from film 6 (Pixel Plus, 30 s Reels, 2026-10-03) and the films before it. Read it at the start of any film
together with `WORKFLOW.md` (process authority) and `AUTONOMOUS_FILM.md` (owner policy). Recipes with numbers live in
`TECHNIQUES.md`; one-line lessons in `CRAFT.md`. This file is the *why and in what order*. Guidance, not a new gate.

## 0. Owner taste — learned from his own feedback (authoritative; read first)
- **Music:** Western, with energy, a real beat and one catchy hook that returns in every chapter, locked to the cuts (tempo from the edit grid).
  A soft, "safe" bed was rejected as "very bad and ugly" twice. Calm/premium briefs still get a beat and a hook (film 7), only lower in energy.
  If he says "no music", use effects only: one effect per on-screen event, a very low room tone, soft-limit peaks (film 9).
- **Sound for a feeling:** he prefers a symbolic sound that states the emotion (a low wavering warning bell = "I have a problem and I'm worried") over literal foley (breaths, creaks, heartbeats were rejected in film 9).
- **Logos:** show the client's logo **whole** (pop-in, blur-resolve, particle burst into the finished mark). Never build it slowly from traced
  pieces — film 7's shield/ribbon/arrow build was "very ugly" and was cut. Trace logos only to render them crisp, not to dismantle them.
- **Honesty is a feature:** copy only what the client said or showed; name real clients as text (no third-party logo art); replace claims the
  client cannot make with an honest forward line ("ومصنعكم.. المحطة القادمة"). List brand conflicts across his boards in the BRIEF.
- **Language:** ads in natural Egyptian Arabic; formal pitches (factories, top management) in Modern Standard Arabic; Latin taglines kept as the brand writes them.
- **Shape of every film:** a hook in the first 2 s that names the viewer's problem → the brand's own idea as motion (its name, its method, its
  posts) → one clean payoff with the logo and one action. One idea per bar; never a montage of effects.
- **Placement:** Reels 9:16 when nothing is named; 16:9 for a meeting-room screen; one delivery, one finished link, an Egyptian conclusion-first
  report that says plainly what was not listened to or not seen at real speed.
- **When he sends a reference:** keep its order and argument, transcribe it if it speaks (`tools/live.py`), never copy its artwork or claims.

## 1. Concept: find the one hero
- **Look inside the brand for the hero object.** Film 6 used the logo's blue i-dot as the only protagonist. Every scene is that
  object doing a job (button, ad frame, ball, toggle knob, the logo dot again). Result: every transition has a cause and the payoff writes itself.
- **Turn the name into the idea.** Pixel Plus → "every great idea starts with one pixel" → the ending builds the logo "pixel by pixel".
  Try: what is the brand name, literally, as a moving thing?
- **Chapters = services, each with its own light.** Three worlds (brand blue, paper, dark mode) keep a showreel varied while one motif
  (pixel grid, pixel object, one type system) keeps it one film. Order follows the client's own wording ("ads, animation, software").
- **Make the ad show, not claim.** «إعلانك هنا» inside the ad, «تطبيقك» on the app card: staged, honest, and it puts the viewer in the
  client's chair. Never invent numbers, clients or results (`data-honesty`).
- **End on the owner's exact words.** Credit lines and spellings are copied literally (spelling follows the logo when the brief has a typo; report it).

## 2. Study references by measuring, then transfer the grammar
1. Contact sheet (2 fps) → dense 30 fps strips of 1 s around each change (`tile=6x5`) → `reference.mjs timeline` (cuts, holds) and `audio` (BPM, sections).
2. Write the grammar as numbers: "0 hard cuts; one container morphs in 0.2–0.27 s with motion blur; old content blurs out first, new blurs in;
   cursor causes every change; holds 0.5–1.5 s; 120 BPM". Then put the brand's story on that grammar — never copy their artwork.
3. If the forensics Python modules are missing: `pip install -r reference/requirements-optional.txt` (container installs do not persist).

## 3. Brand truth first
- Raster logo only? `python3 tools/logo_trace.py <logo> <film>/plates --crop=x0,y0,x1,y1` → vector parts + colour plate + particle grid +
  `logo-check.png`. **Look at the check image** (it showed a stray "08" sheet number on auto-crop). Group parts into letters in the film.
- Letters = `<img src=logo-color.png>` + `clip-path: path()` (awaited by `ready`); the colours remain the owner's pixels.
- Vendor a font that matches the logo's geometry (film 6: Alexandria, Arabic + Latin in one family) and record it in `ASSETS.md`.

## 4. Build order that saved time
1. Brief + `production.json` (shot times on the music grid: 120 BPM → bar 2 s; 15 bars = 30 s).
2. Write the whole `film.js`, then **render 12–20 stills per batch** with `node lib/render.mjs stills <film> --times=… --w --h` (8 s per batch)
   and fix composition on stills before any video. Most layout bugs died here.
3. Draft (`make.mjs <film>`, 10 s) → review (`--profile=review`, ~90 s for 30 s) → read the gate list → fix → review again.
4. **Transition strips from the exported mp4** at 30 fps (`-ss T -i mp4 -vf "scale=180:-2,tile=7x3" -frames:v 1`) for every scene change.
   Film 6's round 1 (crescent wipe, hollow toggle, early pixel) was invisible on stills and obvious on strips.
5. Final → separate critique → at most one more round → final.

## 5. Motion craft that reads as premium
- **One container, many shapes:** per-property springs with keyed targets (`lib/uimorph.js` `morphBox`), blur from its own speed (`morphBlur`,
  exactly 0 when settled), content swapped with blur (`swap`). Spring 0.42–0.45 s, bounce 0.14–0.18.
- **A cursor is a narrator:** every change has a cause (`cursorAt` bowed path, `cursorClick` dip + ring).
- **Animator details sell an animation studio:** squash on contact anchored at the floor, stretch along velocity, onion skin (ghosts 2 frames apart),
  spacing dots (one per frame), a graph-editor curve dragged live, a heartbeat lub-dub on the beat.
- **Transitions from objects:** portal dive into the clicked object (`portal`), circle wipe that opens from an object that first lands exactly on the
  centre (`circleWipe`, ease-out radius ×1.08 so it completes), a dark-mode toggle that flips the world, cut on a downbeat for the punch, implosion into the hero.
- **Payoff by assembly:** burst the hero into the logo's own pixels (`assembly` + `flight`), mosaic dissolves cell by cell into the crisp letters, the hero lands last.
- **Holds breathe:** slow push-ins (4–4.5 % over a hold) and seeded twinkles keep the frozen-frame gate honest without disturbing reading.
- **Taste guard:** two type families; no frame borders, confetti or glow without a reason in the craft block.

## 6. Arabic type on a 9:16 phone
- Headline pair: big word 150 px / line-height 1.12, second line 86 px light / line-height 1.2 (line boxes, not glyphs, trip the overlap gate).
- Body/UI ≥ 34 px Arabic, ≥ 26 px mono; credits ≥ 46 px. Words rise from blur with 0.07–0.09 s stagger; never split Arabic letters.
- Keep copy inside the commonly published safe band (1080×1920: x 65–1015, y 269–1248); the bottom 35 % gets only decorative motion.

## 7. Sound without ears
- Compose on the picture's own times (every tap, pop, land, morph whoosh) and `placeCues(fx, plan.cues)` for the main hits.
- Measure your own mix: `node reference.mjs audio takes/<film>/mix.wav` (BPM, section loudness). Film 6's intro was 13.6 dB under the drop
  (−39.7 vs −26.1 dB) → a filtered pulse and a mid-range motif brought it to −32.4 dB. A melody in the 600 Hz–2 kHz band gives identity; a spectrogram shows when it is missing.
- Say plainly that the mix was not listened to.

## 8. Finish checks the gates do not do
- **Banding:** crop a dark/saturated gradient from the exported master AND share copy, boost `-level 0%,18%`. Rings → `config.dither: true`
  (error-diffused RGB→YUV via 10-bit). Picture-side noise does not fix it: the rings come from the 8-bit colour conversion itself.
- 100 % crops of the logo and the smallest type; a phone-size sheet (270 px tiles) of ~25 moments; the first frame as a thumbnail.
- Deliver the share copy you actually checked; keep the master local.

## 9. Ideas bank (not yet used, worth trying when they fit a brief)
- Kinetic logo "rebuild" in the opposite direction for a loop seam (end frame = first frame).
- A real phone frame with the client's own Reels UI as the stage for an ads chapter.
- Variable-weight Arabic headlines (Alexandria 100–900) animated by weight instead of scale.
- A "before/after" scrubber between a flat idea and the finished design, driven by the cursor.
- Sound-reactive pixel grid (dot lift = drum envelope from the score's own kick list).
