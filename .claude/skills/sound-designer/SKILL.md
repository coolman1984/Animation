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
Shot craft.audioCue records the intended sonic event in the same shot plan used by picture. Shared cues synchronize picture and selected accents. No compulsory SFX at every visual event; no fixed SFX ×2.6 rule.
Use measured mastering: default −14 LUFS / −1.5dBTP / LRA<8 are project targets. Empty/unmeasurable audio must fail early.
Check ending, transient clicks, voice masking, phone/mono translation and exported AAC. Waveforms cannot judge musical taste.
If playback/listening isn't available, label music selection unverified instead of saying it sounds excellent.

**Code-scored reels:** derive hit times from the same beat grid as picture (beat 60/BPM, bar = 4 beats, 1/8 = beat/2) and place them with `placeCues`; riser into the first impact, breakdown before the drop, linear-frequency sweep for a 'linear' word, fade to silence on the last frame. Leave headroom: mastered result was −14.1 LUFS / −3.2 dBTP. Without playback, report the music as unverified by ear (studio/showreel2/score.mjs).
