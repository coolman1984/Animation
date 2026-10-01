---
name: sound-designer
description: Choose, audition, arrange and measure music/SFX; recorded licensed music and original scoring are both supported.
---
# sound-designer
Operating policy: `studio/WORKFLOW.md`; load only the relevant department via `studio/SKILLS.md`.


Read CRAFT_GUIDE.md → Music and sound. Match two candidates at most under the same proof clip; listen before choosing.
Select character/instrumentation/phrase ending, then tempo. Don't default every brand to café bossa or equate code synthesis with quality.
lib/music.mjs prepareMusic trims/fades/measures recorded tracks. Example: node studio/lib/music.mjs source.wav output.wav 25 12.
Record creator, source, rights and paid-social scope in production.assets/sound. No silent padding or automatic looping of short tracks.
score.mjs writes takes/<film>/{music,sfx,mix}.wav. Declare all external recordings as production assets/cacheInputs.
Use lib/audio.mjs when original synthesis serves the treatment. Original work still needs an ownership/source record.
Shared cues synchronize picture and selected accents. No compulsory SFX at every visual event; no fixed SFX ×2.6 rule.
Use measured mastering: default −14 LUFS / −1.5dBTP / LRA<8 are project targets. Empty/unmeasurable audio must fail early.
Check ending, transient clicks, voice masking, phone/mono translation and exported AAC. Waveforms cannot judge musical taste.
If playback/listening isn't available, label music selection unverified instead of saying it sounds excellent.
