# DESIGN — Rave Studio

## A. World brief (stage A)
**Concept:** the console *is* the stage. Every control on screen lights something real in the 3D show, and the show
answers the music it already knows (sections are found before they play), so the drop lands on the drop.

**Material and geometry:** black anodised console metal with laser light; the nested portal rectangle (from the owner's
warehouse reference) is the mark, the layer icon and the focus language; the ring gate (canyon reference) is the hero object.

**Signature moment:** the drop — the gate's 24 Blender plates blow out radially and reassemble over two bars, pyro and CO2
fire, the director cuts to an FPV dive through the portal, the drop word lands. Met within one build after «ادخل الحفلة».

**What the owner's references taught (uploaded 2026-11-19):** image 1 (warehouse) — receding neon frames, sodium cage lamps,
haze, a sea of silhouettes; image 2 (canyon) — ring gate, amber blinders on towers, blue lasers to the cliffs, warm rock
against a blue dusk; screenshot — the earlier app's tabs (stage, audio, camera, party) and its weak spots: one deck,
English UI, no layers, no transitions, recording without a director.

## B. System (stage B)
| Token | Hex | Job |
|---|---|---|
| night | `#05070b` | ground behind everything |
| console | `rgba(8,11,16,.9)` / panel `#0e131a` | the desk |
| laser | `#3fe0ff` | "live / on" and deck أ — the only cyan in the UI |
| sodium | `#ff9a3c` | heat: deck ب, drop pad, builds |
| rec | `#ff3b4e` | recording only |

Type by role: **Alexandria** (display: titles, pads, tabs, world names — geometric, stage-signage), **IBM Plex Sans Arabic**
500 (labels and copy), **JetBrains Mono** (BPM, time, pitch, cue numbers — tabular). All local, OFL.

RTL: decks أ on the right, ب on the left; horizontal faders fill right → left; waveforms stay left → right (time, like every DJ app).

## C. Motion (stage C)
- Show motion lives in the 3D scene and follows the audio clock: beat phase for chases and jumps, bar lines for cuts, sections for programs.
- UI motion is minimal: 120 ms colour/border changes, `scale(.97)` on press, console collapse instant, toasts 300 ms.
- Transitions are motivated: flash on drops, dissolve into breaks, zoom into builds, iris between worlds, mostly hard cuts on bars.
- Reduced motion: UI transitions off; safe mode caps strobe/flash below 3 Hz and halves flash brightness (also offered on the entrance).

## D. Critique and polish (stage D, this pass)
Fixed after looking at real frames: stage hidden behind the console (camera now frames the visible band), crowd heads near the
lens lit like props (now black silhouettes), red-saturated canyon (display-space colours, calmer key, open sky), eclipse read as
a sun (black disc, thin ring), drop word stretched across the screen (aspect-true box), white-out on drops (flash 0.6 peak, 0.3 s),
deck panel wider than a phone (grid tracks `minmax(0,1fr)`), silent generator on busy frames (adaptive lookahead).
Open: judged in software rendering only; needs the owner's phone and a GPU laptop.
