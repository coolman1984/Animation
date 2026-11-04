# Reference-led art direction — 2026-11-03

Owner target: exceed the visual quality of the supplied screenshots (45709, 45711, 45715, 45719, 45717, 45729, 45731, 45735, 45739, 45737). These are visual references, not proof of award status, real interactions or performance. Do not copy their logos, claims, people or products into a deliverable.

## What the references establish
- Fitness/cycling: a person or product anchors the composition; a controlled overlap connects image and type.
- Medical/industrial: restrained palettes, clear information hierarchy and consistent material/lighting treatment.
- Product/retail: object scale, isolated silhouettes, detail views and editorial pacing carry the identity.
- Learning/creative: a scene can use depth, color, gradients and light when each helps the story.
- Across the set: sections vary their composition rather than repeating identical card grids. Mobile must be composed deliberately, not cropped from desktop.

## Build sequence
Write the visitor task and brand proposition. Study three relevant references and record specific principles, not adjectives. Produce one original visual direction using authorized photography, purpose-made illustration or modeled assets. Plan the first screen, the second section and mobile together before expanding the page. Check silhouettes, image perspective, lighting, typography, text contrast and reading order. Motion must clarify the subject and have a complete reduced-motion state. Compare full-page screenshots at matching viewport sizes and review the actual interactions before claiming progress.

Shadows, gradients, large typography and layered imagery are available artistic tools. The previous cleanup removed automatic decorative defaults; it does not ban intentional art direction. Extra effects, bigger type, renamed palettes or a higher automated score do not prove a better design. Do not promise an award or claim superiority from passing tests.

## Per-site controls now supported
A preset is a fallback. Override theme.tokens with six-digit hex values for bg, ink, muted, accent, accent-ink, card, card-ink and line; radius accepts 0px–48px. Text/background pairs must reach 4.5:1. theme.fonts can choose display, text and label from registered local faces; Arabic sites must select Arabic-capable registered faces. Lora and Geist are added for English typography using already vendored files.

layout.hero: split | media-first | stacked
layout.features: rows | grid
layout.width: narrow | standard | wide
Hero imageWidth/imageHeight preserve the declared source ratio; imageFit defaults to contain. cover is an explicit 4:5 crop and requires visual review, particularly for faces, hands, logos and products. These controls are a foundation for composition, not a substitute for custom assets or a finished art-directed site.

Example (merge into site.json):

```json
{
  "theme": {
    "tokens": {"bg":"#ffffff","ink":"#182820","muted":"#384840","radius":"4px"},
    "fonts": {"display":"Readex Pro","text":"Alexandria","label":"Alexandria"}
  },
  "layout": {"hero":"media-first","features":"grid","width":"wide"}
}
```

## Evidence and limits
Existing 5 web tests pass. Two new unit tests cover custom identity, contrast failure, CSS-value rejection, malformed values, language coverage and independent compositions. The new real Chromium test exercises three hero compositions at 390/820/1440px, checking image load, overflow and intended desktop order. These are layout/security regressions using a labelled SVG fixture; no artistic superiority is inferred. No new client site, photo shoot, 3D scene or motion showcase is presented as complete in this change.
