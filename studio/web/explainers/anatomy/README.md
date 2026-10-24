# Anatomy explainer

A static page that takes one object apart. The example object is a coffee grinder built in code (cylinders and boxes). There is no downloaded model.

The page import map loads `./engine/three/build/three.module.js`. That file is a tree-shaken piece of Three.js 0.186.1 (MIT), the same pin as `node studio/studio.mjs setup gpu`. It keeps the WebGL renderer, a standard material, two lights and three geometries, and leaves out the rest of the build so the page stays under the studio's weight gate. `engine/three/LICENSE` is the Three.js licence. Nothing else is imported. Regenerating it needs `setup gpu` and esbuild pointed at `three/src` for those same exports.

## Parts file

`parts.json` is the reusable half:

| Field | Meaning |
|---|---|
| `id` | stable name, also the key in `scene.mjs` `REST` / `meshFor` |
| `label` | hotspot and list text. Keep each Arabic phrase whole. The page is `lang="ar" dir="rtl"`. |
| `note` | the paragraph shown when the part is chosen |
| `offset` | `[x, y, z]` added when the explode slider is at 1 |
| `colour` | `#RRGGBB` |

To explain a different object, replace the JSON and the mesh builder in `scene.mjs`. The slider, hotspots, tour, orbit and `render(t)` stay.

A flat diagram (no orbit) belongs to the `diagram-design` skill. A mesh rebuilt from a photograph belongs to `img2threejs`, then this page.

## Controls

- Explode slider, and `+` / `-`.
- Drag the picture to orbit. Arrow keys orbit too (not while the slider is focused).
- Hover or tap a ring for a leader-line label. Click a ring or a list row for the note.
- **الجولة** steps through the parts and pulls them apart.
- `prefers-reduced-motion`: nothing autoplays. The tour and the slider jump. There is no running animation.

## Filming

The pose is a function of time (`anatomy.mjs` `poseAt`, about 16 seconds: assembled, explode, then one part at a time).

- `index.html?t=3.2` draws that second and does not drift.
- After the module loads, `window.anatomyRender(t)` and the `render(t)` method on `mount()` do the same. Call them in any order.

## Licence

Procedural geometry and the copy are studio-written. The only runtime dependency is the tree-shaken Three.js file above (MIT). No other runtime dependency.
