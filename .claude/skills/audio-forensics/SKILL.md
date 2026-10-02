---
name: audio-forensics
description: Interpret measured audio energy, onset/beat candidates and their relationship to reference-film cuts, type, product reveals and camera movement without assuming beat-driven editing.
---
# Audio forensics
Start with scientific-summary.json. Read only relevant intervals from audio.json and audio-visual-map.json; do not load every raw beat/energy sample. Listen to the authorized exported audio/film before interpreting mood or music suitability.
FFmpeg extracts mono analysis audio. Default Node musicmap analyzer measures energy/onsets and a constant-tempo candidate grid. `--audio-engine=python` uses optional NumPy/librosa (and its decode dependencies); no automatic package installation.
- Distinguish a measured transient from an estimated beat/downbeat grid. Record tempo/downbeat confidence; half/double tempo, speech, silence and tempo changes can mislead the analyzer.
- Inspect energy curves, quiet/build/release/peak candidates. Musical meaning and emotional response remain interpretation, not a scientific fact about every viewer.
- Read signed offsets in seconds. Close onsets suggest correspondence, not deliberate sync. Include meaningful edits off the grid.
- Add visually observed type hits, scale settles, reveals and camera starts as `visualEvents` in the review; the relationship map is updated from those events.
- For a browser-only source, audio is unavailable unless an authorized local file is supplied. Do not secretly record/decrypt audio. Report unheard evidence.
- Do not reuse a reference track for reconstruction without permission. Neutral studies can be silent; compare rhythm using event timing and report this limitation.
