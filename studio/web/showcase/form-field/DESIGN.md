# FORM / FIELD — concept site design record

## A. Creative direction
Fictional creative studio; audience: design-conscious clients. Three candidate directions: kinetic typography, warm material editorial, and stark architectural monochrome. Chosen: warm material editorial, a tactile sculpture and generous typography suggest careful craft without claiming real work. Both project studies are imaginary. Goal: demonstrate distinctive art direction and a readable mobile-first narrative.

## B. Design system
Warm paper, deep green ink and terracotta; Georgia display with system sans text. Wide editorial spacing and responsive one/two-column layout. Focus indicators, semantic sections and explicit concept disclosure. Original inline SVG artwork requires no external assets.

## C. Motion storyboard
Section entry: subtle fade and rise on scroll, only when motion is allowed. Without JavaScript or with reduced motion all content remains visible. No industrial 3D inspection is needed for this conceptual brand site.

## D. Critique and polish
Strengths: one visual idea across artwork, palette and type; fictional status is stated. Limits: illustrations are studies, not photographs or verified client work. Accessibility, visual alignment and actual performance require real browser and device review; no independent design critique has been performed.

### Browser verification — 2026-11-03
Live Chromium preview checked in iframe viewports 390, 820 and 1440 px (content widths 375, 805 and 1425 after scrollbar). No horizontal document overflow or missing internal anchor targets. Phone Explore work link navigates to #work. No-JavaScript 390px frame retains content. Fixed invalid wrapper/main nesting discovered in accessibility tree, increased visible navigation targets to 44px high and darkened accent. Reduced-motion media rule inspected in source; OS emulation and real devices not tested.

### Rendering regression — verification supersedes earlier limitation


## Verified web and text rasterization fixes — 2026-11-03
Installed local Chromium 131.0.6778.0 (npm @sparticuz/chromium 131.0.1), SwiftShader, and the repository-pinned PixiJS 8.22.0 / Three.js 0.186.1. Retrieved original font files. Web unit tests: 5 pass, 0 fail. Targeted original example comparison loop: pixi-study, shader-study and three-study all pass across separate sessions and forward/reverse seeks, with unchanged pixel thresholds and without per-frame settle workaround. Before the fix, three-study at 4s differed in 2246 channel values by up to 29; differences were confined to the DOM title (bbox 75,272–195,303). Removing persistent will-change:transform from textLine word spans fixes history-dependent text rasterization here. Browser audit after typography/touch fixes: no red lights and no readability/tap-target warnings; remaining three taste advisories concern intentional multi-line display type, scanner-unrecognized IntersectionObserver motion, and a 37% desktop hero media area. Full repository suite, real devices, newer Chromium and original CI host were not run; this is targeted evidence, not a universal determinism claim. No new paid service or API used.
