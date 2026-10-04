# FINDINGS — what the studio already knows (scanned once, 2026-10-04; do not re-read the films)

Source: films 6–11 code + STATUS/CRAFT/QUALITY_PLAYBOOK §0 + key frames already reviewed in those sessions. Reused, never modified.

## Look
- **Palette families:** deep navy ink `#030818/#071336`, electric blue `#1E6BFF`, cyan `#4FD8FF`, ice `#BFEFFF`, white, one hot accent (yellow `#FFD21F`, or the client's own). Light = radial glow + perspective floor grid + dust + vignette.
- **Type:** Alexandria (Arabic + Latin, weights 500–900) for display and text; Space Mono for labels; El Messiri / Plex Arabic for calm or formal films; Lora for classy Latin. Arabic lines rtl, Latin ltr — **never mix scripts in one line** (bidi breaks); `margin-inline-end 0.36em` between Latin words.
- **Logos:** shown whole (pop-in / blur-resolve), never assembled from pieces (owner rejected film 7's build).

## Motion grammar (what made films 6–11 look high-end)
- **Kinetic slam:** a word drops out of the camera (scale 1.6–3 → 1, blur 10–30 → 0, spring overshoot), exits up with blur; staggered words.
- **Extruded 3D type:** 20–30 stacked `translateZ` copies + gradient face + glow layer; flies in, orbits, implodes. Keep ≤ ~70 layers per scene (headless capture stalls above).
- **3D devices:** flip cards (rotateX about the bottom edge, text rides the card), cylinder ring with push-through, perspective floor, camera node orbit/dolly, shake on beat hits.
- **Transitions:** white flash on drops, slice by a slab, implode into a point, colour wipes, slab smash, shared-element box morph (film 6 UI morphs), match cuts.
- **Details:** hash-seeded particles/sparks, light sweeps, HUD rings, icons that morph old→new, progress dots, breathing hold so no frame freezes.
- **Easing:** springs (`springStep`), outExpo entries, inOutCubic moves; anticipation before big moves, overshoot on arrival, follow-through on exits.

## Sync with sound
- One shared clock (`timing.js`): BPM → beats → every chapter on a bar line, every event on a beat/half-beat; picture and score import the same numbers.
- Score is synthesised in Node (`lib/audio.mjs`, `lib/sfx.mjs`): kick/clap/hats/bass/pads/arp/hook + one SFX per picture event; soft limiting, master to −14 LUFS / −1.5 dBTP.
- Owner taste: western, energetic, a beat + ONE catchy hook that returns; symbolic sounds over literal foley; "no music" = effects + room tone.

## Pace & honesty
- Readable: ≥ 1.8 s per line, ~2.5 s per info card, text always on a turning card, people get their own chapter + a return at the end (film 11 v2 lesson).
- Only the client's copy and claims; no invented numbers, dates, prices or clients.

## Engineering facts that shape the engine
- Frames are pure functions of t (render in any order, slices in parallel); composer = `lib/composer.html`, render/gates = `make.mjs` via `node studio.mjs build <dir>`.
- Text gate counts a word when its opacity > 0.5 → slams must stay faint while scaled up; lines must be laid out without overlapping boxes.
- No network at render time → GSAP/MorphSVG are not vendored; the engine implements deterministic equivalents (springs, path resampling morph, shared-element morph) on top of `lib/kinetics.js`, `lib/motion.js`, `lib/transitions.js`.
- Higgsfield MCP is **not connected** in this environment: the asset layer has the adapter slot + cache, procedural/CSS assets until it is.
