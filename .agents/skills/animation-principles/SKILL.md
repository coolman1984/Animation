---
name: animation-principles
description: Disney's 12 principles of animation as twelve small skills (Dylan Tarre, MIT, vendored), wired into the house critic. Use when judging a film's motion — squash and stretch, anticipation, staging, straight ahead vs pose to pose, follow through, slow in and out, arcs, secondary action, timing, exaggeration, solid drawing, appeal.
---
<!-- generated from .claude/skills by `node studio/studio.mjs agents --sync`; edit the source, not this copy -->
# animation-principles (vendored)
Twelve skills, one principle each, in `studio/toolkit/animation-principles/` (pinned commit and licence: `studio/toolkit/toolkit.json`, `LICENSE`).
Read the file when you judge that principle. The house critic (`studio/studio-engine/lib/critic.mjs`, `director review` / MCP `film_review`) scores the ones a spec can show (`principle-<id>`, with evidence and the next edit). The other six come back as `principles` — a manual checklist, not in the score. MCP `principle_read { slug }` returns the file.

What to look for in OUR films (one hero, code-driven, the house method):

| Principle | In our films | File |
|---|---|---|
| Squash and stretch | On a hit, the hero squashes and then recovers its volume. A scale-up with no deformation reads as dead. | `squash-stretch-mastery/SKILL.md` |
| Anticipation | The hero holds a pose before its big morph or the payoff. A move on the first frame comes out of nowhere. Scored: `principle-anticipation`. | `anticipation-mastery/SKILL.md` |
| Staging | One hero per scene. A second hero key, or a second extrude / lockup / ribbon / mark, splits the eye. Scored: `principle-staging`. | `staging-mastery/SKILL.md` |
| Straight ahead vs pose to pose | Our specs are pose-to-pose keys. Effects (sparks, ribbons) may run free; the hero's story may not drift. | `straight-ahead-pose-mastery/SKILL.md` |
| Follow through and overlapping | After the hero lands, the payoff holds or breathes. Nothing stops on the cut. Scored: `principle-follow-through`. | `follow-through-overlapping/SKILL.md` |
| Slow in and slow out | Motion eases. A declared linear or "none" ease looks mechanical. Scored: `principle-slow-in-out`. | `slow-in-out-mastery/SKILL.md` |
| Arc | A hero that changes x and y in one key travels a straight diagonal. Bow it (a midpoint, or `arc` / `via`). Scored: `principle-arc`. | `arc-mastery/SKILL.md` |
| Secondary action | One supporting move (icon, cursor, spark) offset from the hero, quieter than the hero. | `secondary-action-mastery/SKILL.md` |
| Timing | The scene before the payoff holds — a line leaves, a morph lands early, or the music breathes — so the idea can land. Scored: `principle-timing`. | `timing-principle-mastery/SKILL.md` |
| Exaggeration | Push the hero's one change far enough to read on a phone, then stop. Do not push everything. | `exaggeration-mastery/SKILL.md` |
| Solid drawing | 3D type and ribbons keep one volume and one light. A flat scale is not a turn. | `solid-drawing-mastery/SKILL.md` |
| Appeal | Would we watch the hero's move twice? If the motion has no personality, it is not done. | `appeal-mastery/SKILL.md` |

The upstream text is the principle, not a template. House taste (`studio/QUALITY_PLAYBOOK.md` §0) still decides logos, music, copy and how far to push. Arabic text stays whole, `dir="rtl"`.
