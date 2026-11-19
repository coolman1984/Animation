# Rave Studio — ترانس بلس ستوديو الحفلات

One HTML file (`rave-studio.html`, ~1.5 MB, works offline and from a phone's file manager) that is a 3D concert
visualiser, a two-deck DJ mixer, a lighting desk, a camera director, a layer compositor and a recorder.
Stage assets are modelled in Blender; the same assets open in a Godot project for a native app or an offline movie.

Owner request (2026-11-19): beat the three uploaded "Trance Plus" pages (Eclipse, Rave Your World, the sound journey)
at a world level, using Blender, Godot, Three.js, transitions, layers, far more controls, recording, mixing and a full DJ.

## Open it

- Phone or desktop: open `rave-studio.html` directly (no server, no network). Chrome / Edge / Android Chrome recommended.
- «ادخل الحفلة» loads the four built-in tracks on the two decks and starts deck أ. «شغّل مزيكتك» opens a file picker.

## What is inside

| Area | What it does |
|---|---|
| 4 worlds | **وادي الصخر** canyon at dusk with the Blender ring gate that explodes on the drop and reassembles; **المخزن** industrial hall with nested neon portals, sodium cage lamps, catwalk; **ليلة الكسوف** desert night, truss pyramid with chasing LED edges, live eclipse corona, sky beacon, distant pyramids; **المعبد الكوني** nebula, wire core with orbit rings, floating monoliths, hyperspace rings that rush on builds and drops. |
| Stage fixtures | Moving heads with real pan/tilt and volumetric beams, laser emitters (fan, tunnel, scan, crisscross), laser ceiling ("liquid sky"), blinders, LED screens running VJ programs or the party name, 700–4,500 people in one draw call who jump on the beat, raise arms with the energy and hold phones up in breakdowns, pyro columns with sparks, CO2 jets, confetti, fireworks, haze. |
| Decks (×2) | Built-in trance generator (4 original tracks, synthesised live: kick, rolling bass, supersaw arps, pads, claps, snare-roll builds, risers, impacts) or any audio file. File analysis: colour waveform (low/mid/high), tempo, beat grid, and a section map that finds breaks, builds and drops before they play. Play, CDJ cue, 4 hot cues, beat loops 1–16 with ½/×2, beat jump, pitch ±8/16/50 %, nudge, sync (tempo + bar phase). |
| Mixer | Trim, 3-band EQ with kill, colour filter, channel faders, VU meters, crossfader with three curves, master volume, **automatic transition** (sync, enter, bass swap at the half, crossfade over 8/16/32 bars), a file library. |
| Master FX | Sweep filter, tempo-synced echo, hall reverb, flanger, bit crusher, trance gate on the beat grid (4 patterns), hold-to-build riser that lands an impact + visual drop. |
| Lighting desk | Auto program that follows the song (intro / main / build / drop / break / outro) or manual; 8 masters; beam chases (sweep, fan, chase, wave, tunnel, ballyhoo, random); laser shapes; 8 palettes + 3 colour pickers; colour swap per phrase; auto drop, pyro every 8 bars, confetti and fireworks on drops. Pads: drop, strobe, blinder, laser, pyro, CO2, confetti, fireworks, riser, blackout, glitch. |
| Camera director | 8 shots (front row, behind the DJ, high drone, rising crane, side track, stage orbit, FPV dive through the gate, wide), an automatic director that cuts on bar lines by section, 10 transitions (cut, dissolve, flash, whip, glitch, iris, zoom-through, slices, luma, pixel), shake, lens punch, free camera (drag, pinch/wheel, arrows). |
| Layers | 3D world → bloom → motion trails → VJ layer (8 programs, 4 blend modes) → titles and logo (Canvas 2D, correct Arabic) → mirror / kaleidoscope → glitch, chroma, grain, vignette, letterbox → grade (exposure, contrast, saturation, hue). Everything is inside the recording. |
| Recording | Video of the canvas + the final mix (MP4 where the browser can, else WebM), frame formats screen / 1080p / 9:16 reel / square / 4K, 30 or 60 fps, three bitrates; master mix to 16-bit WAV; PNG still; 4K poster; share on phones. |
| More | MIDI controllers with learn mode, 8 scene memories, show export/import (JSON), line-in mode (visuals react to an external DJ mixer), safe mode for flashes, adaptive quality, keyboard shortcuts (`?`). |

## Build

```sh
node studio/studio.mjs setup gpu            # once: three@0.186.1 + esbuild into studio/vendor
node studio/web/rave-studio/build.mjs        # or --three=<a node_modules dir that holds three and esbuild>
```

`build.mjs` bundles `src/` with esbuild (IIFE, minified), inlines Three.js, four OFL fonts from `studio/assets/fonts`,
`assets/stage.glb` and `assets/poster.jpg`, and writes `rave-studio.html`. The built file is committed on purpose:
it is the deliverable the owner opens on a phone.

## Blender (assets) — `blender/stage_assets.py`

```sh
blender -b -P blender/stage_assets.py -- --out assets             # GLB only
blender -b -P blender/stage_assets.py -- --out assets --poster    # + Cycles key art (1600×900, 96 samples ≈ 4.5 min on 4 CPU cores)
```

The portable Blender download (`studio/native/install.sh blender`) was refused by the network here; the same Blender
4.5.15 runs as the `bpy` wheel from PyPI (`python3.11 -m pip install bpy==4.5.15`, then `python stage_assets.py -- …`).

Asset names the app and Godot look up: `gate_panel_00…23` (separate so they can explode radially), `truss_seg` (2 m box
truss), `speaker`, `speaker_grille`, `booth`, `booth_slats`, `booth_gear`, `crowd_person` (arms hanging; shoulders at
x = ±0.255, y = 1.42; the shaders rotate vertices with |x| > 0.215 below y 1.47), `mh_base`, `mh_yoke`, `mh_head`, `mh_lens`
(lens faces −Z), `lamp_cage`, `lamp_bulb`, `blinder`, `blinder_cells`, `monolith`, `monolith_lines`. The gate rings are
rebuilt in code with the same radii (5.86 / 6.16 m). Without the GLB the app falls back to simple stand-ins.

## Godot (native) — `godot/`

Godot 4.5, GL Compatibility. Loads `../assets/stage.glb` at run time (no import step), builds the canyon gate stage,
crowd (MultiMesh + shader), lasers and the explode-on-drop gate, and reacts to the Master bus spectrum.

```sh
godot --path godot -- --track=/abs/song.mp3 --bpm=138                    # play (mp3 / ogg / wav)
godot --path godot --write-movie out.avi --fixed-fps 30 --quit-after 900 -- --track=/abs/song.wav --bpm=140 --start-bar=16
```

`--start-bar` says which bar of the cycle (16 = build, 24 = drop) the track starts at. Movie Maker renders offline at any
speed, so heavy scenes still give a smooth 30 fps file. To ship it as an app, export with Godot's templates and add
`*.glb` to the export's non-resource filter.

## Verification (2026-11-19, this cloud session; Chromium headless with SwiftShader, no GPU)

- No page errors on desktop 1440×900 / 1280×720 or phone 390×844; no sideways overflow in any tab on the phone.
- Audio graph measured: generator renders offline (peak 1.13 before the limiter); live build → drop recording −15.8 dB mean, −0.6 dB peak.
- Recording: WAV 16-bit 44.1 kHz stereo; video file with picture + audio (this headless build has no H.264, so it wrote VP9/Opus; Chrome with H.264 writes MP4/AVC); PNG still.
- Godot 4.5.1 render: 600 frames at 1280×720 via Movie Maker, synced to the recorded mix.
- Not verified: a real phone GPU, Safari/iOS, a physical MIDI controller, line-in with a real mixer, frame rate on the owner's hardware, the owner's verdict.

## Licences

Code, scenes, music generator and copy: written for this studio. Three.js 0.186.1 (MIT) bundled. Fonts: Alexandria,
IBM Plex Sans Arabic, JetBrains Mono (SIL OFL 1.1, see `studio/assets/fonts`). Blender (GPL) and Godot (MIT) are tools;
their output (GLB, renders) carries no tool licence. No samples, photos, HDRIs or third-party models.
"Trance Plus" and "Trance Architect" are the owner's names from the uploaded pages; the parties shown are fictional.
