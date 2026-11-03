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

### Rendering regression limitation
Example screenshot capture now calls existing settleCapture after each seek instead of only initial setup. Pixel comparison thresholds are unchanged. This addresses a potential compositor race; the previous Pixi failure is not yet confirmed resolved. Cloud Chromium cannot initialize WebGL for the Pixi regression (CanvasRenderer is not yet implemented). No new GitHub Actions run appeared after opening PR #35 at the time checked.
