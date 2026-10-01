# Craft decisions, with evidence

This is a reusable directing guide, not a mandatory visual style. Pick the treatment that serves the product.
Working assumptions and project targets below are not platform requirements or guaranteed advertising results.

## Direction and content
Write one sentence: “For [viewer], show [real benefit/proof], so they [one action].”
Choose one direction, one dominant motif and at most two transition families. The main product must stay truthful:
real logo/spelling, correct ingredients/shape/packaging, no invented price, branch, founding date or health benefit.
Separate product evidence from mood references in production.json; a different drink is not a hero replacement.

A scene earns its time by revealing, proving or making the viewer feel something specific. Vary shot scale when the
source supports it: hero → material/detail → contextual relationship → resolved hero/CTA. A photo only supports
limited reframing/parallax, not newly discovered camera angles. Quiet product holds are part of direction.
Build three style frames before motion. Inspect small phone view and native-resolution crops. Do not add grain,
blur, glow, particles, arches, liquid or a vintage palette just because an earlier film used them.

## Elegant Egyptian copy
Sound like a confident host talking to one person. Familiar Egyptian words, short connected ideas, restrained
punctuation, no forced slang or translated corporate Arabic. Read aloud once; remove any phrase you would not say.
Lead with a clear product fact or appealing moment, then an easy invitation. Do not describe every visible element.

| Weak / generic | Better direction, only if true |
|---|---|
| كل رشفة فيها حكاية | Name what makes this particular drink different |
| تجربة استثنائية لا مثيل لها | Show the evidence; remove the unsupported superlative |
| دلّع حواسك في عالم من السحر | A simple invitation: «على مهلك… دي لحظتك» |
| لا تفوّت فرصة الاستمتاع | «جرّبها النهارده» when this is the desired action |
| أفضل ماتشا صحية ١٠٠٪ | Use confirmed ingredients, with no health inference |

For the supplied matcha references, possible copy is «ماتشا بجوز الهند» then «ومعاها بوبا»; confirm the recipe
from the owner before treating ingredients as factual proof. The real cup spelling beats the vintage mood board.
Keep ≤7 words/line and usually ≥1.8s fully readable, ≤17 visible characters/s as project starting points.
`copyIssues` flags these mechanically; it cannot judge persuasion, pronunciation, authenticity or truth.
Copy intervals exclude entrance/exit animation. Split by words, never Arabic letters. Check RTL shaping, punctuation,
line breaks and the actual logo at phone size. Preserve official Latin brand spelling where appropriate.
Voiceover is optional: no fabricated customer quote, forced announcer delivery or music fighting speech.

## Layers, depth, camera and focus
Use the smallest useful stack: repaired background, subject, contact shadow, optional foreground, separate typography.
Extract at source resolution. Preserve fine edges, translucent plastic and the printed logo. Inspect `lab.matteSheet`
on light/dark/magenta; alpha counts only reveal transparency, not correctness. Check 100% edges and share-copy crops.
A blurred fill is suitable only for defocused texture. It cannot reconstruct architecture, text or reflective surfaces.
If clean separation is impossible, keep the original photograph and use controlled framing; don't invent hidden product parts.

`lib/depth.js` shares one camera among layers. Depth=1 is the hero; smaller values move less, larger move more.
`depthScene.render(camera, overrides)` resets from base values every frame. Focus is per layer; type lives outside the
scene. A graphic rack focus moves attention between depth planes; this is not true optical 3D. Use a short, motivated
focus pull, then let the product settle sharp. Contact shadows follow the product's ground position and camera plane.
Mask/repair backgrounds beyond the most extreme camera positions. Clamp flat photo cameras with `coverCamera`.
Avoid artificial orbit, excessive scaling, free-floating packaging, large parallax revealing seams or breathing merely to beat freeze checks.
Do not imply automatic segmentation or reconstructed 3D: the new helpers animate prepared layers.

## Motion and edit
Use motion to reveal the subject or carry the eye to the next focal point. One dominant action at a time.
Ease into a readable hold; entrances are not obliged to take 0.9s. Frame one must already communicate.
Match cuts align subject position/scale. Occlusion wipes hide the cut behind a real foreground shape.
Avoid overlapping dissolves that duplicate a cup. Track start/mid/end of transitions, not only attractive stills.
Rhythm follows phrasing and message, with beat/bar alignment where it helps; never force every cut onto a bar.
Use one shared shot/cue table for picture and sound. Intentional holds go into config.holds with reasons in the ledger.

## Music and sound
Select by character, instrumentation, arrangement, available endings and usable rights, not by genre name alone.
Audition at most two candidates at matched loudness under the SAME 8–12s proof clip. For a restrained café treatment,
start with warm acoustic/soft jazz instrumentation, subtle bass/brushes and space around the product; other brands need other music.
Check the whole phrase: hook, development, landing on CTA. Example only: 96 BPM in 4/4 gives 10 bars in 25s,
which can be arranged as 8 bars of development + 2 bars of resolution. This doesn't prescribe music for every film.
Real recorded/original music is welcome. The built-in synthesis engine is an option for deliberate sound design,
not proof of premium music. Never mark a waveform as a listening review.

Record track/creator/source, license evidence and paid-social scope. Do not infer ad rights from a streaming link or
social music availability. Do not make a purchase unless authorized. If no suitable track is available, report the gap.
`prepareMusic` trims an existing recording to exact length, fades and measures; it rejects a short source instead of
padding silently or looping a bad seam. Audition edited endings. In score.mjs, combine it with selected SFX and write
music.wav, sfx.wav and mix.wav; list source files as production assets or config.cacheInputs for cache invalidation.
Use accents at a few meaningful events. No compulsory sound on every word/cut, fixed SFX gain multiplier or repeated whoosh.
Listen on headphones and a phone/mono speaker where available. Check dialogue intelligibility and stereo compatibility.
−14 LUFS, TP≤−1.5dBTP and LRA<8 are this studio's defaults, not universal Meta rules.

## Review and stop rule
One short sound-on proof, targeted corrections, one full final check. Two failed attempts at the same issue trigger
a cause diagnosis, not another wholesale redesign. Fix blocker/major defects; defer taste-only alternatives once the direction works.
Review the actual export, not just DOM or a contact sheet. Passing metrics are technical evidence only.
Record: time → observed problem → severity → smallest fix → measured/seen result. Explicitly mark unheard/unseen material.

## Technical references consulted 2026-10-01
- [FFmpeg filters](https://ffmpeg.org/ffmpeg-filters.html): atrim, asetpts, afade, loudnorm. Edge fades preserve edit duration; overlap crossfades change it.
- [MDN transforms](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/transform): transform composition and origins.
- [MDN masking](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Masking): alpha masks preserve partial transparency.
- [MDN filter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/filter): per-element blur/filter behavior.
These are implementation references. Creative judgments above are editorial choices, not claims of newly invented October 2026 techniques.
