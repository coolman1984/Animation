---
name: hyperframes
description: HyperFrames (HeyGen, Apache-2.0, vendored skills) — HTML rendered to deterministic MP4 by agents: render contract and work loop, the CLI by job, ~450 registry blocks (transitions, titles, kinetic type, captions, charts, maps, 3D, camera moves), Figma designs and brand tokens into video, Remotion/Lottie/Three.js porting. Use when a film should run on HyperFrames as an external engine, to borrow a named registry block, or to bring a Figma file into a film.
---
# hyperframes (vendored)
Five upstream skills live in `studio/toolkit/hyperframes/` (licence and pinned commit: `studio/toolkit/toolkit.json`):
`hyperframes/` (read first: render contract, work loop), `hyperframes-cli/`, `hyperframes-registry/` (the block catalogue),
`figma/` (Figma → video), `remotion-to-hyperframes/` (port and verify frame by frame). Read the one you need; its relative paths start in its own folder.

Studio adaptations:
- **Engine choice:** the studio engine stays the default (`studio/studio-engine/STUDIO.md`; `node studio/studio.mjs route <film>`). HyperFrames renders
  the SILENT picture as an external engine when it clearly wins (an existing HyperFrames project, a registry block we would otherwise rebuild):
  `config.engine = { type: 'external', name: 'hyperframes', command: [...] }` (`studio/lib/engines.mjs`); the studio still owns audio, mastering,
  gates and review. Rendering still goes through `node studio/studio.mjs build <film>` in the background (AGENTS.md rendering rule).
- **CLI:** pinned `npx hyperframes@0.8.191 <command>` with `DO_NOT_TRACK=1` (or `HYPERFRAMES_NO_TELEMETRY=1`). Local render only: no cloud
  render, `publish` or paid HeyGen media (`media-use` was left out) without the owner's approval. Installing it is a change to the machine: ask once.
- **Borrowing without the engine:** read a registry block's source as a reference and rebuild it in the composer with the same numbers
  (like `studio/library/README.md` moves). House method decides taste; Arabic text never split per letter.
