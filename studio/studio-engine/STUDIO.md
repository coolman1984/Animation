# STUDIO ENGINE — read first, read last

**What:** every film = one spec file (`films/<film>/spec.json`) + one command. The creative/technical effort lives in `lib/` (done once); a new film writes **no code**.
Default: **30 fps** (60 only when the owner says so: `--fps=60`). Two shapes: **youtube** 1920×1080, **reel** (Facebook Reels) 1080×1920; `--format=both` renders both from the same spec.

## Commands (run from `studio/`)
| step | command |
|---|---|
| lint + build package only | `node studio-engine/run.mjs <film> --stage=check` |
| key-frame sheet + text gate (fast, ~1 min) | `node studio-engine/run.mjs <film> --stage=stills` → `takes/studio-engine/b-<film>-<fmt>/stills/sheet.png` |
| low-res preview of one scene / the film | `node studio-engine/run.mjs <film> --stage=preview [--scene=id]` |
| the ONE final render + all gates | `node studio-engine/run.mjs <film> [--format=reel|both] [--fps=60]` (default stage) → `out/studio-engine/b-<film>-<fmt>/takeNN/*-share-*.mp4` |
Stay with a render until it prints its gates: start it with `nohup … & echo $! > pid`, wait with `while kill -0 $(cat pid); do sleep 5; done` (never `pgrep -f` on the film name — it matches the waiting shell itself). Never run two renders at once.

## Spec (times in BEATS from the scene start; bpm sets the clock; `reel:{}` overrides any field for the vertical cut)
```json
{ "title": "…", "format": "reel", "bpm": 120, "music": { "progression": ["Am","F","C","G"], "final": "C", "hook": "pop332" },
  "audio": { "music": "song.mp3", "voice": "vo.wav" },            // optional: tempo/beat + word timing are extracted
  "assets": [{ "name": "hero", "kind": "image", "prompt": "…", "refs": ["presenter-1"] }],
  "scenes": [ { "id": "hook", "beats": 8, "music": "intro|drop|chorus|hosts|verse|build|drop2|finale|breath", "drop": true,
      "transition": "flash|smash|fade|cut", "bg": "room|blue|ink|light", "world": { "speed": 1, "tint": 0 }, "hold": false, "breathe": false,
      "elements": [ { "type": "words", "text": "الـ HR", "size": 330, "y": 0.33, "at": 0, "out": 7.75, "style": "slam", "accent": { "1": "accent" }, "sayAt": "HR" } ] } ] }
```
**Elements** (all parametric — see `lib/modules.js`): `words` · `stack` · `extrude` (3D word, fly/spin/implode) · `lockup` (A × B 3D title + reflection) · `mark` (small 3D lock-up) ·
`storm` (paper tunnel) · `slice` (word cut by a slab) · `cards` (before/after turning cards) · `ring` (3D cylinder + push-through) · `pill` (CTA; `parts` keep Arabic/Latin apart) ·
`wipes` (full-frame colour wipes) · `slab` (smash block with lines) · `hosts` (people names) · `sparks` · `shape` (box/circle **morph**, `morph:[…]`, `morphTo` across scenes) ·
`path` (SVG **morph** between icons/paths) · `icon` · `image` (asset with depth drift). Every element emits its own sound and camera hit (`lib/events.js`).

## Where things are
`brand/brand.json` (colours, fonts, logo/presenter rules, rhythm, export) · `lib/` engine · `films/<film>/` specs (+ optional `brand.json`, audio) ·
`assets/library.json` + files (generated once, id + prompt + provider; never regenerated) · `b-<film>-<fmt>/` generated package (git-ignored) · `FINDINGS.md` studio knowledge.

## Golden rules
1. New film = new spec. Never copy a previous spec's idea: the library is tools; the visual idea, transitions and composition are new each time.
2. Only the client's words, claims and numbers. Never mix Arabic and Latin words in one line (use `pill.parts` or two elements).
3. Readable: ≥ 1.8 s per line, ~2.5 s per info card (`cards.step: 5` at 120 BPM). People get their own scene and come back at the end.
4. Music: western, a beat and ONE hook that returns; drops on the big scenes (`drop: true`). Logos whole, never assembled.
5. Gate order: `check` → `stills` (fix until `text OK`) → one final render. A failing gate names its scene: fix that scene in the spec, re-check with `--stage=preview --scene=id`, then final.
6. Assets: Higgsfield MCP (GPT Image 2.5 / Gemini Omni / ElevenLabs v4) only for what code cannot draw; `assets-todo.json` lists requests → generate once → `registerAsset()`.

## Proof (2026-10-04)
AI × HR (film 11 v2) rebuilt from `films/aixhr/spec.json` alone: youtube take04 + reel take01 — **every gate PASS** (the hand-coded original failed the text gate with 367 issues),
sync 30/30 and 31/31 hits on an audible onset, no still span > 0.7 s. Motion energy vs the original at 30 matched timestamps: **106 %** (`compare.mjs`, sheet `compare-aixhr.png`).
Morph grammar (shape → pill → card across scenes, SVG icon morph) proven in `films/demo`. Supplied audio proven in `films/audiotest`: tempo exact (96/120 BPM, beat 0 at 0 s), voice → 18 timed words, `sayAt` lands words on the spoken beat. Fast tests: `node --test studio-engine/test/engine.test.mjs`. Spec size: 1 file, ~190 lines, zero code.

## FORM / FUNCTION extension (2026-10-04)
New parametric elements: ribbon (analytic depth-sorted CPU surface; twist/material/field variations) and cursor (beat-timed pointer path/click). `transition: "wipe"` and `vignette: false` opt into clean geometric staging. Spec creative/craft metadata enters the generated plan. Windows uses fileURLToPath and readdirSync; literal scene backgrounds are linted. Failed renders cannot present earlier takes as current. Worked example: films/form-function/spec.json; source and verification in its CASE_STUDY.md and LEDGER.md. Use STUDIO_CDP_URL to attach to production Chrome started by the mandatory launcher.


## Validation and delivery changes (2026-10-04)
`--stage=check` fails on missing assets or malformed inputs. Beats/BPM must be positive finite numbers; explicit duration equals summed scene beats; scene IDs are unique. Text/stills errors stop rendering. Final delivery requires a new numeric take, a passing final measurement and a nonempty share MP4; sync/motion failures stop delivery. No eligible hard-hit events reports UNCHECKED. Historical MP4s are never used to hide a failed current run.
Supplied file paths resolve from the film folder. Assets carry `rights`; audio uses `musicRights`, `licenseScope`, `voiceRights`. These paths enter cache dependencies. `audio.musicOffset` overrides detected phase in seconds: positive trims the opening, negative pads it. Narration cache invalidates when the source changes and uses automatic language detection through platform PYTHON.
STUDIO_WORKERS is a bounded request. Browser HTTP and handshake startup have deadlines. Hard cuts are opaque at entry; wipes/fades retain the outgoing scene. Morphs inherit unspecified properties and retarget from their actual current state. Deep format overrides retain nested camera settings. Regression evidence and limits: ../CODE_REVIEW_2026-10-04.md.
