---
name: reference-reverse-engineer
description: Study a supplied reference video, visually inspect compact evidence, infer visual grammar and convert reusable principles into an original native-studio reconstruction. Invoke only when a reference film is supplied.
---
# Reference reverse engineer
Read `STATUS.md` and `studio/REFERENCE_LAB.md`. Respect the bounded scope; do not create a film or clone an entire reference automatically.
1. Load reference-ingest; run `node reference.mjs analyze <source>` from studio. Start with the overview, then the compact sheets in evidence-pack.json. Read metadata/limits and scientific-summary.json; never send every frame to a model.
2. Visually open the actual images. Examine transition strips and watch/listen to authorized original media when available. Load motion-forensics or audio-forensics only for that decision. A JSON manifest is not a visual inspection.
3. Use `refine` only for an unresolved observed issue, a justified <=2s interval and <=12 extra frames. Default pack budget is 72 extraction requests. Explain skipped coverage in long/dense films.
4. Fill `reference/review-template.json` into a private observations file. Cover all report headings, including what does not matter, what should not be copied, psychological effect as a hypothesis, and how our studio can improve. Supply actual viewed evidence paths and disclose unplayed/unheard media.
5. For each technique/layer: observed result, likely technique, confidence, alternative explanations, evidence/timecode and native reproduction route. Never identify GSAP/Three.js/the original source code with certainty from appearance.
6. Apply `review --observations=<file>`. Only this explicit visual-review step changes the report/blueprint to reviewed. Human/agent inspection attestations are not machine proof.
7. Load recreation-director for a difficult 3–8s neutral study and matched comparison; improve purpose, hierarchy, rhythm and clarity rather than pixel equality. Do not use brands/music/source assets without rights.
8. Use `learn` only for a new evidence-backed transferable principle with a counter-case. Store no reference appearance. Stop after acceptance; no optional endless study loop.
Report ready/blocked and exact unverified limitations. A complete machine pack is not a completed artistic interpretation.

**Screen recordings:** ignore player chrome (bar, speaker, rounded frame, counter); crop the HUD at 1:1; use dense segment grids for fast sections; map times with a measured clock offset; attest the visual review honestly (audio analysed numerically, not heard). Worked example: studio/REFERENCE_LAB.md → Field test.

## Artistic forensics (required for new reference studies)
Read `studio/ARTISTIC_FORENSICS.md`. Fill artisticDNA in the review template: five passes, all 20 sections, evidence-linked observed choice → likely intention → why/context/confidence/alternative. Describe mixtures, never force a style label. Cover the whole film with adjacent attention/pacing intervals; unknown coverage remains unknown. Study hook/questions/reveals/payoffs, quiet contrast, repetition, overload and boredom risks. Colour effects are contextual hypotheses. Temporal judgments need playback; sonic judgments need listening. Existing technical reviews remain compatible but artistically pending. Then author an original subject-specific direction with `direct --brief`; disclose originality as a reviewer judgment. Learn grammar, create a new sentence.
