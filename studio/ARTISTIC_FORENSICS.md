# Deep artistic, directorial and viewer-experience forensics

This is the artistic review protocol for every supplied reference. `reference/artistic.mjs` adds
ARTISTIC DNA to every `analysis.md` and writes `artistic-dna.json`. Machine packs and legacy reviews
remain explicitly PENDING_ARTISTIC_REVIEW until an evidence-linked review is supplied. Nothing
assigns a style, emotional effect, creative intention or retention score from optical flow alone.

## Five passes: describe, infer purpose, test the alternative

1. **Visual art language.** Describe the actual visible mixture before proposing a label. Cartoon,
   editorial illustration, surrealism, photographic product cinema, collage, abstraction, minimalism,
   retro-futurism, dream imagery, graphic/3D design, 2D characters, mixed media, typography and
   experimental work are vocabulary, not a classifier. Study composition, negative space, balance,
   symmetry/asymmetry, visual weight, relative scale, shape, texture, material, depth, foreground vs
   background, light, shadow, contrast, colour relationships, density, visual rhythm, symbols,
   metaphors, abstraction and realism/stylisation. Mark irrelevant/unsupported topics unknown.
2. **Emotional/perceptual effect.** What might this viewer notice first? What expectation follows?
   Consider curiosity, anticipation, tension, calm, surprise, energy, luxury, playfulness, uncertainty,
   wonder, scale, intimacy, authority, warmth/coldness and urgency only when the choice supports it.
   Separate observed choice from likely intention; give context, confidence and an alternative.
   Colour meanings depend on surrounding colours, materials, culture, message and viewing conditions;
   never write “blue always means trust” or equate fast motion with engagement.
3. **Attention/retention.** Walk the entire timeline: hook, novelty, information, visual/motion/sound
   changes, shot lengths, reveals, questions, delayed answers, micro-payoffs, major payoff, quiet
   intervals, pattern breaks and repetition. Identify boredom hypotheses AND competing simultaneous
   signals. Say where holding longer may allow inspection or make the payoff more important.
   Actual retention is unknown without audience data; these are editorial hypotheses.
4. **Directorial pacing.** Estimate seven axes separately: visual energy, information density,
   camera energy, edit frequency, motion density, audio energy and emotional intensity. Identify
   gradual escalation, waves, constant pressure, slow burn, rapid hook then calm, setup → tension →
   payoff, repeated mini-climaxes, or an observed combination. Explain why the pattern serves or
   obstructs the message. Fast → quiet → reveal may work better than constant speed; it is not a rule.
5. **Cinematic intent.** For major shot-scale, distance, velocity, settling, focus, depth, occlusion,
   reveal, cut, transition, sound/image and light changes, connect visible behavior to storytelling.
   “Slow push, then settle” is description. “Reduces surrounding space, then gives time to inspect
   material before the reveal” is a plausible reason. Record alternatives, not assumed author intent.

## Review contract

Use `reference/review-template.json` in a private pack/session file. New templates include artisticDNA.
Set context.viewer, purpose and viewingSituation. Every one of the 20 ARTISTIC DNA sections needs a
summary and status (`reviewed` or `not-assessed`). A reviewed section cites observationIds. An
unassessed section discloses the missing evidence, rather than replacing it with generic praise.

An observation has id, start/end seconds, one of the five layer names, basis (still/motion/audio),
observedChoice, likelyIntention, context, whyItMayWork, alternative, confidence [0,1], timestamped
image evidence from viewedEvidence, transferablePrinciple and counterCase. Example structure:

```json
{
  "id": "material-inspection", "start": 2, "end": 5,
  "layer": "cinematicIntent", "basis": "motion",
  "observedChoice": "A slow push ends in a quiet hold before the material reveal.",
  "likelyIntention": "May give the object importance and permit inspection.",
  "context": "Familiar premium object viewed on a phone.",
  "whyItMayWork": "Settling removes competing motion while the texture becomes legible.",
  "alternative": "The move may simply accommodate a crop.", "confidence": 0.65,
  "evidence": [{"file": "frames/f012.png", "t": 3}],
  "transferablePrinciple": "Settle before a detail that needs inspection.",
  "counterCase": "A chase or urgent warning may require continued movement."
}
```
This is an illustrative schema, not an observation about any real film. Use only actual inspected
pack paths and truthful timestamps. Prefer 8–24 important decisions; maximum 80, no quota.

## Whole-film attention and pacing maps

timeline is 1–48 chronological, adjacent intervals covering [0, duration], without gaps or overlaps.
Merge similar beats for long references. Keep explicitly unknown intervals when coverage is missing.
Each interval supplies basis, confidence, observationIds, narrativeRole and why; attention and pacing
axis values are subjective 0–5 estimates (null unknown; zero is an assessed low value).

Also record firstNotice, expectation, delayedAnswer, microPayoff, majorPayoff, quietMoment,
patternBreak, repetition, boredomRisk, overloadRisk and slowingOpportunity. Use “none” or “unknown”
truthfully. This produces time-indexed Markdown curves/tables and narrative interpretation, not an
invented numerical engagement index. Never average these axes into a scientific retention score.

- `motionPlaybackInspected=true` is necessary for motion judgments and temporal curve ratings.
- Still-only intervals can estimate attention.informationDensity; all temporal/pacing values stay null.
- Unseen intervals use basis unknown and null values. Unknown is never silently drawn as zero.
- audioEnergy/soundIntensity require available audio AND audioListened=true. Numerical audio analysis
  alone does not establish subjective sonic energy or musical fit.
- All sections can be discussed with partial evidence, but unsupported judgments stay not-assessed.
  A reviewer attestation is not independent proof that inspection occurred or persuasion worked.

```sh
node reference.mjs review reference-name --observations=/path/private-review.json
```
Validation occurs before review artifacts change. Reviewed artistic intent is included in
recreation-plan.json for the director; technical reconstruction readiness remains a separate gate.
Old reviews keep working, but do not silently become artistic reviews. Five-layer coverage is explicit; missing layers are not-assessed. A successfully applied new review invalidates old original-direction files; author the direction against the new interpretation.

## Convert the grammar into an original sentence

Use `reference/original-direction-template.json`, then:

```sh
node reference.mjs direct reference-name --brief=/path/private-original-direction.json
```
This command requires reviewed artistic DNA. The director supplies subject, viewer, objective,
concept, visualLanguage, emotionalArc, pacingStrategy, cameraStrategy, soundStrategy, payoff and
avoidCopying. Supply 1–12 transformations: reviewed observationIds → transferable principle →
originalExecution → whyItFitsSubject → differenceFromReference → counterCase.

Outputs: original-direction.json and original-direction.md beside the private evidence pack. This is
an explicit agent/director authoring step, not an automatic generator or a promise of originality.
Use new composition, assets, characters, brand, metaphors and soundtrack. Preserve relationships
(e.g. quiet inspection before reveal), not identifiable artwork, exact staging or superficial tricks.

Check originality at hook/proof/payoff style frames. Identify decoration without story/hierarchy value;
remove it unless it deliberately serves atmosphere. “Premium” needs visible reasons: controlled
hierarchy, material/light coherence, intentional restraint, precise timing, readable proof or other
observed factors. Expense, software, saturation, speed and particle count do not certify quality.

## Learning and limits

Store a principle only after inspected playback with evidence, context, confidence and counter-case.
Do not populate shared lessons with these schema examples. Artistic outputs and direction briefs are
private reference artifacts; no new reference media/assets or licensed audio are imported by this scope.
This module structures experienced judgment; it does not replace a director's eyes, listening, audience
research or an actual final-film critique. Apply the existing bounded correction policy.

## Low-effort agent workflow

`analyze` now writes a private review-draft.json automatically. Existing packs use
`node reference.mjs prepare <pack>` once; it refuses to overwrite an existing draft.
The draft fills real whole-film ranges (<=12 merged sections) and suggested frame paths/timestamps,
unknown curve values and all report headings. Suggested evidence is NOT marked viewed.

The agent opens the suggested images/playback, enters viewer/context and records 8–24 useful decisions
once. With autoSections=true, add topics (ARTISTIC_SECTIONS names) to each observation; review routes
one observation into all applicable headings. No need to write twenty duplicate summaries. Unaddressed
headings stay not-assessed; no creative effect is invented to complete paperwork. Edit only observed
narrative moments/ratings. Then review the draft and author one original direction. Auto-routing saves
writing; actual artistic reasoning and evidence inspection remain the agent's job.

All inspection, observations, drafts and direction files in this document are authored by the Claude Code agent, never assigned to the owner. See AUTONOMOUS_FILM.md.
