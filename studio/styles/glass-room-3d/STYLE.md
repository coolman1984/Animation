# Glass Room 3D — style card
> Extruded 3D titles in a glass room with a travelling floor grid, a paper storm of old work, a symbol (×) that becomes the lock-up.
> Source films: film 11 / Studio Engine `films/aixhr` (AI × HR). Route: **engine** (the engine's native look).

## 1. Essence, and what it is not
- Big, loud, event energy: a symbol carries the story (scratch → multiplier → spinning 3D title → final lock-up).
- Not calm or premium; not a product UI story.

## 2. Materials & rendering
- The engine's room: radial blue gradient, floor and ceiling grids, dust, vignette; `extrude` words with glowing sides; paper `storm`.

## 3. Colour logic
- Deep blue room, white type, yellow accent (#FFD21F) for the one word that matters and the CTA pill.

## 4. Type
- Alexandria 900 for slams; Latin in its own element (never mixed in an Arabic line); hosts' names in their own chapter.

## 5. Motion
- `slam` entrances with camera shake from events; flash/smash transitions on drops; implosion into the next title.

## 6. Camera grammar
| Move | Expresses | Serves |
|---|---|---|
| Orbit around the lock-up | the event's scale | title |
| Push-through a ring | entering the content | chapters |
| Flash cut on a drop | energy | chapter change |

## 7. Sound palette
- The engine's original score: western pop, four-on-the-floor, one 3-3-2 hook; drops on big scenes.

## 8. Native moves
- The storm bursts into the AI title; the × spins into the A × B lock-up; cards turn from old to new.

## 9. Pitfalls
- Too much copy per card (the owner once said "the client can't read anything": slow it ~20 %). Montage of every element (pick one hero).

## 10. How to build it here
- Engine: `director plan <film> --style=glass-room-3d`, then `extrude`, `lockup`, `storm`, `cards`, `ring`, `hosts`, `pill`. Example: `studio-engine/films/aixhr/spec.json`.

## 11. Variation space
- Any symbol from the name (+, ×, →, a letter). Swap the room tint per chapter (`world.tint`).
