# Terminal Cursor — style card
> One blinking cursor is the hero: the problem's caret, the window it grows into, the bullet of each step, the edit marker, and the end tile.
> Source film: film 22 (10 s Reels). Route: **bespoke** (rung 3: `film22/`).

## 1. Essence, and what it is not
- A short, dense proof: problem (a failing test) → the agent reads, edits, runs → green → one action.
- Not a fake hacker screen, not walls of scrolling code, not neon glow.

## 2. Materials & rendering
- Warm ink background (#15130F), panels a step lighter, cream text; mono code in Space Mono; subframe motion blur (4 subframes).

## 3. Colour logic
- Terracotta (#D97757) is the cursor and nothing else; green/red only for test results. A cream circle wipe for the payoff world.

## 4. Type
- Alexandria for the two copy lines; Space Mono for code. Label staged code «مثال توضيحي» on every frame.

## 5. Motion
- Springs by damping ratio (ζ 0.5–0.8), every beat computed from time; typing times shared by picture and sound; no linear runs, no pops (speed graph).

## 6. Camera grammar
| Move | Expresses | Serves |
|---|---|---|
| Locked with a slow push | focus | typing beats (avoids frozen frames) |
| Hop into the window | entering the tool | act change |
| Circle wipe from the cursor | done | payoff |

## 7. Sound palette
- A minor warning bell + thuds for the problem → typing ticks → groove → C major drop on the tile; hook returns every bar.

## 8. Native moves
- The cursor becomes the bullet of each step; the cursor becomes the circle that wipes the world.

## 9. Pitfalls
- Text moving while it is read. Fade-and-slide-up entrances (use clip reveals and slams). Everything centred.

## 10. How to build it here
- Rung 3 from `film22/` (timing.js, motion.js zspring, speedgraph.mjs). Engine approximation: `words` + `pill` + `shape` on an ink bg with mono labels.

## 11. Variation space
- Any tool that acts in steps: a checkout, a booking, a build. 10–15 s.
