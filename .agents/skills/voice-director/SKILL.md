---
name: voice-director
description: Voice & sound department — Arabic/English transcription (mixed speech, speakers), the canonical transcript (captions, translation layers, transcript editing), directed AI narration with a performance map and pronunciation lexicon, consent-gated voice registry, dubbing with timing fit, dialogue cleanup, ducked mixes and mix QA. Use for any film with speech, narration, captions, dubbing or a final sound mix.
---
<!-- generated from .claude/skills by `node studio/studio.mjs agents --sync`; edit the source, not this copy -->
# voice-director
Department guide: `studio/VOICE_STUDIO.md`. Shares the film clock with picture (cues in production.json, voice lines in `<film>/voice.json`).

1. **Real speech in footage:**
   - `python tools/live.py ingest`, then `diarize`, then `transcribe --lang=auto`. Use `align` if a script exists.
   - `node studio.mjs transcript <pack>` gives the canonical transcript plus SRT/VTT/ASS/TXT/JSON.
   - One file, no footage pack: `node studio.mjs captions <video|audio>` (`lib/whisper.mjs`, local whisper.cpp, faster-whisper or sherpa-onnx). If none is installed it prints install commands and exits 2. If one is installed and the run fails, it prints that failure and one hint, not the install guide. It does not download a model. faster-whisper reads the 16 kHz WAV itself and keeps Silero VAD on.
   - Correct names and brand terms with `correct()`; it logs every change.
2. **Edit like an editor:**
   - `fillers`, `repeats` and `cutPoints` measure; you decide the hook, the strongest quote and the 15 s / 30 s versions.
   - Use `keepSentences` for `lib/edl.mjs`.
   - Never add words a real speaker did not say.
3. **Translation:** a separate layer; `coverage()` must be complete for a bilingual delivery. The dubbing adaptation is a third layer.
4. **Narration:**
   - Write `<film>/voice.json` lines at film times, each with a `performance` (style, pace, energy, emphasis, pauseAfter, ending) that follows the emotional arc.
   - Add product names and acronyms to `voice/lexicon.json`.
   - Drafts: `node studio.mjs voice script <film>` (offline Windows Hoda ar-EG / David en-US, or Piper).
   - Final: a commercially cleared voice from `voice/voices.json` (Azure ar-EG neural for native Egyptian, OpenAI or ElevenLabs when keys exist), run with `--final`.
5. **Fit:** the manifest flags `overruns`. `fitToSlot` tempo-fits ±8 % at most; beyond that, rewrite the line shorter.
6. **Mix:**
   - Run `mixScript(manifest, { music, out })` (voice at film time + sidechain ducking), then `masterAudio`.
   - Then `node studio.mjs mixcheck` (clipping, mono, phone speaker, phase).
7. **QA:**
   - Listen to the exported file on headphones AND a phone speaker.
   - Check subtitle direction and timing in a real player.
   - Write findings in LEDGER.md.
   - Never call a voice natural or emotionally right without listening.

## Rights and consent
- Every voice has a registry entry: provider, rights, commercial, consent, quality.
- `final` refuses voices that are not cleared commercially.
- Cloning needs `clone: true` and recorded consent `{granted, by, date, scope}`. Never clone from arbitrary footage.
- Disclose AI voices where the provider's terms require it.

## Do not
- Do not hard-code one provider.
- Do not require the cloud: offline voices always work for drafts.
- Do not replace the original transcript with a translation.
- Do not speed a voice beyond ±8 % to fit.
- Do not claim perfect source separation (PLANNED) or perfect diarization.
