# One Dot Hero — style card
> One small object from the brand (the logo's dot, the app's signal colour) does every job in the film and lands last in the logo.
> Source films: film 6 Pixel Plus (owner's house standard), film 16 Hessa. Route: **engine** (shape + morphTo + cursor) or bespoke for full craft.

## 1. Essence, and what it is not
- ONE hero object carries all chapters: a ball, a button, a portal, a toggle knob, a coin, and finally the logo's own dot.
- Every transition has a cause: the dot is clicked, lands, floods, or becomes the next container.
- Not a montage of effects, not a slideshow of cards, not a logo built from pieces (the owner rejected that: show the logo whole).

## 2. Materials & rendering
- Flat vector shapes with a soft contact shadow; one container that morphs (springs 0.42–0.45 s, bounce 0.14–0.18) with motion blur from its own speed.
- A paper pixel/dot grid as the ground; the dot ripples it on landing. Subtle grain (≈ 3 %).

## 3. Colour logic
- One brand colour = the hero; everything else neutral (paper #F2F0EB, ink #1F2328, grey #8D949E). Chapters may change the world's light
  (brand blue / paper / dark mode) but the hero keeps its colour. Never morph the hero through a mixed colour (it passes through grey).

## 4. Type
- One family for display + text (Alexandria), one mono for labels (Space Mono). Headline 150 px / lh 1.12, support 86 px / lh 1.2 on Reels.
- Words rise from blur, 0.07–0.09 s stagger; one idea per bar; copy above the bottom 35 % on Reels.

## 5. Motion
- Squash on contact anchored at the floor, stretch along velocity, onion skin at speed. Holds 0.5–1.5 s between bursts; slow 4 % push in holds.
- A cursor is the narrator: every change has a click (bowed path, dip + ring).

## 6. Camera grammar
| Move | Expresses | Serves |
|---|---|---|
| Locked, then a portal dive into the clicked object | entering a service | chapter change |
| Circle wipe opening from the hero at centre | a new world | light change |
| Slow push on a hold | read now | copy, logo |
| Cut on a downbeat | punch | drop |

## 7. Sound palette
- Western, 120 BPM, a hook that returns each chapter on a new instrument (pluck → lead → bells → full chorus); the logo is the loudest.
- Tuned bounce plucks for landings, soft clicks for the cursor, a whoosh per morph. Openverse first for effects; house synths otherwise.

## 8. Native moves
- The dot becomes the full stop of the promise line. The dot is the play button of an ad. The dot lands last as the logo's dot.

## 9. Pitfalls
- A second hero creeping in (icons that compete). A morph that hides its cause. Copy competing with the hero for the centre.

## 10. How to build it here
- Engine: `director plan <film> --style=one-dot-hero`; hero = `shape` with `hero` + `morphTo` chain, `cursor` clicks, `path` icon morphs, `pill` CTA.
- Bespoke recipes: `TECHNIQUES.md` 2026-10-03 (morphBox, swap, portal, circleWipe, assembly), `QUALITY_PLAYBOOK.md` §5.

## 11. Variation space
- The hero can be any small brand element (a letter's accent, a product's button, a seed). Chapters can be 2–4. Worlds: light/dark/brand.
