# Draft page — فئة خامسة مستعملة

`index.html` at the repository root is the page. It links these folders and does not own their techniques. Copy a folder, plus the markup named here, to reuse that technique.

Open locally from the repository root:

```
python3 -m http.server 8080
```

Then open `http://127.0.0.1:8080/`. After this branch is merged, the same page is `https://coolman1984.github.io/Animation/`.

The first screen is night: a title, a draft price, and one exterior photo. Nothing moves until the page is scrolled. The drawing and the parts list are the next screen.

| Path | Technique |
|---|---|
| `fonts/title.css` | The text face, and the gold title. Gold is a solid colour on `.gold` inside `h1.title`. |
| `scenes/scenes.css`, `scenes/scenes.js` | The bar, the first screen, the sticky story frame, and the closing block. `scenes.js` adds `is-reduced` on `html` when the visitor prefers less motion. |
| `scroll-layers/layers.css`, `scroll-layers/layers.js` | Staged scroll. Each `[data-scroll-layer]` is its own tall stage. It is current while it covers the middle of the screen. `--p` runs from 0 to 1 through that stage. `[data-parallax]` is a band that drifts across the whole story; the number is pixels of travel. |
| `day-night/day-night.css`, `day-night/day-night.js` | Night is the default (`html data-sky="night"` and the night radio checked). The control is two radios, ليل and نهار. Choosing نهار sets day colours. A reload is night again; the choice is not stored. |
| `disassembly/car.svg` | The side-view drawing. A moving piece is a group whose id is `part-` plus the part id. |
| `disassembly/parts.js` | How far each piece travels (`x`, `y`, `r`) and the hinge (`ox`, `oy`). |
| `disassembly/disassembly.css`, `disassembly/disassembly.js` | The parts list, and the motion. While a layer is current, that piece eases out. Earlier pieces stay out. Later pieces stay in. |
| `photos/exterior.jpg`, `photos/CREDITS.md` | The exterior photo and its licence. |

## Part id, shared by the list, the layer, and the drawing

The order of `[data-scroll-layer]` in `index.html` is the order the pieces leave.

| id | الاسم | Layer |
|---|---|---|
| `lamp-front` | الفانوس الأمامي | `#layer-lamp-front` |
| `hood` | الكبوت | `#layer-hood` |
| `wheel-front` | العجلة الأمامية | `#layer-wheel-front` |
| `mirror` | المراية | `#layer-mirror` |
| `door-front` | الباب الأمامي | `#layer-door-front` |
| `seat` | الكرسي | `#layer-seat` |
| `door-rear` | الباب الخلفي | `#layer-door-rear` |
| `wheel-rear` | العجلة الخلفية | `#layer-wheel-rear` |
| `lamp-rear` | الفانوس الخلفي | `#layer-lamp-rear` |
| `trunk` | الشنطة | `#layer-trunk` |

A list row is `<li data-part-link="hood">`. Its layer is `<section data-scroll-layer data-part="hood">`. The drawing group is `<g id="part-hood">`.

Progress in both scroll scripts is the same: distance the layer's top has moved above the screen, divided by the layer height minus one screen.

With less motion, the pieces are shown already apart and every part's text is on the page. No scroll scrubbing runs.

## Not in this draft

There is no ghosted shell, no cutaway, and no working mechanical motion. Those need a measured model. This page has one photo and a drawn side view. The seat in the drawing is a sketch, not the inside of the photographed car. The price is an example in Egyptian pounds, not an offer. No year and no chassis number are stated.
