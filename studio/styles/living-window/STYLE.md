# Living Window — style card
> A quiet document (a page, a form, a screen) wakes on a click and becomes the product's window; that one window morphs through every feature.
> Source film: film 23 (AI Essentials Academy). Route: **bespoke** (rung 3: `film23/` is the reference build).

## 1. Essence, and what it is not
- The product shown honestly: its real UI rebuilt in DOM (counts, labels, unit names exactly as the product has them).
- ONE window, many states: content blurs out, the frame springs to the next size, new content blurs in.
- Not a screen recording, not floating mock-ups with fake data, not a zoom-through-screenshots slideshow.

## 2. Materials & rendering
- White canvas, hairline borders, grey app chrome with traffic lights, pill buttons, square badges, circuit lines with dots.
- Dark chapter via the window's own moon toggle: a feathered circle reveal (140 px feather) — a hard circle bands under motion blur.

## 3. Colour logic
- One blue (#2F5FE6) for action; signal colours only where the product uses them (green/amber/violet/pink/teal); dark chapter #0B0B0D.

## 4. Type
- IBM Plex Sans Arabic (Arabic) + Inter/JetBrains Mono (Latin UI), as the product itself. Copy column beside the window, never on top of it.
- Never put a middle dot next to Arabic-Indic digits (it reads as zero).

## 5. Motion
- Window morphs: spring ζ 0.72–0.8; content swap 0.24 s in / 0.2 s out with blur. A cursor causes every change.
- A slow push inside each chapter, eased back during the next morph (keeps the frozen-frame gate honest).

## 6. Camera grammar
| Move | Expresses | Serves |
|---|---|---|
| Locked frame, window morphs | the product does the work | feature chapters |
| Circle reveal from a toggle | a mode change | dark chapter |
| Break into pieces → implode | the whole is the brand | payoff |

## 7. Sound palette
- Hook E G A G returning per chapter on pluck → bells → keys → mallets → saw lead; UI clicks and confirms tuned to the hook.

## 8. Native moves
- The page's lines fly out and land as the feature badges. The window breaks into its N pages, which light one by one and fly into the logo.

## 9. Pitfalls
- Faking UI the product does not have. Too much text inside the window to read at phone size. Theme changing before the reveal reaches an element.

## 10. How to build it here
- Rung 3: copy the structure of `film23/` (timing.js shared clock, motion.js winRect chain, film.js chapters, score.mjs). Engine approximation:
  a `shape` window with `morph` steps + `cards`; honest but much simpler.

## 11. Variation space
- The quiet starting object can be a form, a receipt, a contract, a menu. The chapters follow the product's own sidebar.
