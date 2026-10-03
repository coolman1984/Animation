# VOICE STUDIO — speech, transcript, voice and sound post (a permanent department)

Goal: directed, human-quality audio storytelling in Arabic and English — not text-to-speech. Skill: `voice-director`.
Everything shares the film clock with picture: voice lines, cues, music and SFX are placed in film seconds.

```text
VOICE & SOUND DIRECTOR (skill voice-director)
 ├ Speech recognition   tools/live.py vad · transcribe --lang=ar|en|auto · diarize · align (known script)
 ├ Transcript editor    lib/transcript.mjs (canonical transcript, corrections log, fillers, repeats, cut points, search)
 ├ Translation          transcript layers (kind: translation) — the original words are never replaced
 ├ Subtitle engine      SRT · WebVTT · ASS · TXT · JSON · bilingual SRT (RTL marks per line)
 ├ AI voice engine      lib/voice.mjs generate() — providers windows | local | openai | elevenlabs | azure, lexicon, performance map
 ├ Dubbing              transcript → translation → adaptation layer → voice → fitToSlot → mixScript
 ├ Dialogue cleanup     lib/dialogue.mjs polish (high-pass, denoise, de-ess, compression), stitch (click-free jump cuts)
 ├ Music / SFX          score.mjs + lib/audio.mjs / lib/sfx.mjs, sounds/library.json, cue sheet (production.json cues)
 ├ Mixing / mastering   mixScript (voice at film time + ducking), lib/finish.mjs masterAudio (LUFS / true peak)
 └ QA                   lib/mixcheck.mjs (clipping, mono, phone speaker, phase), make.mjs gates, review player — and LISTENING
```

## Commands (from studio/)
```bash
node studio.mjs voice status                                  # providers: offline/cloud, ready?, registered voices + rights
node studio.mjs voice say "كل فكرة عظيمة بتبدأ ببكسل واحد" --lang=ar --style=warm --pace=0.95
node studio.mjs voice script <film> [--final]                 # <film>/voice.json → takes/<film>/voice/*.wav + manifest.json
python tools/live.py models --asr=turbo --tts=1 --diar=1      # offline models (Whisper turbo, Piper, pyannote + ERes2Net)
python tools/live.py ingest <video> <pack> … ; python tools/live.py diarize <pack> ; python tools/live.py transcribe <pack> --lang=auto
node studio.mjs transcript <pack> [--translation=en.json --layer=en]   # canonical transcript + SRT/VTT/ASS/TXT/JSON (+ bilingual)
node studio.mjs mixcheck takes/<film>/mix.wav                 # clipping / mono / phone / phase notes
node studio.mjs sounds whoosh                                 # sound library search with rights
```

## Speech ingest and transcription
- Ingest keeps the original media; `tools/live.py ingest` makes analysis copies (16 kHz mono WAV, frames).
- **Arabic, English and mixed.** `--lang=auto` decodes each VAD phrase separately, so each phrase gets its own language. Decoding the whole file at once had dropped an English sentence inside Arabic speech.
- **Diarization** (`diarize`) writes `speakers.json`. `transcribe` then labels each word with its speaker. It is not perfect: two similar synthetic male voices merged in the test. Correct speaker labels by hand when they matter.
- **Known limits, stated honestly:**
  - Word times are estimated inside Whisper segments and snapped to loudness dips. This is not forced alignment.
  - The decoder gives no per-word confidence.
  - Egyptian dialect words may come out in MSA spelling.
  - Brand names are often misheard. Correct them with `correct()`; every correction is logged.
- **Known script:** `align` places the real words on the detected speech. Use it whenever a script exists.

## The canonical transcript (`lib/transcript.mjs`)
One asset drives editing, subtitles, captions, search, translation, dubbing, word highlighting, speaker labels, jump cuts and quote extraction.
- **Layers:** `addLayer(t, 'en', 'translation', 'ar', {s1: …})`. `coverage()` reports untranslated sentences. A missing English line is never silently replaced with Arabic.
- **Adaptation** (natural dubbing phrasing) is a separate layer kind. The literal translation stays.
- **Editing primitives** measure and never decide:
  - `fillers()`: Arabic + English filler words.
  - `repeats()`: restarts and false starts.
  - `cutPoints()`: breath gaps, longest first.
  - `find()`: quotes.
  - `keepSentences()`: keep-ranges for `lib/edl.mjs`.
- The agent chooses hooks, 15 s and 30 s versions, and the strongest quote.
- **Rule:** a real-footage edit may remove words. It never adds words the speaker did not say.

## Voice generation (`lib/voice.mjs`)
`generate({ text, language, dialect, voice, performance, provider: 'auto'|id, out }, { mode: 'draft'|'final' })`

| Provider | Offline | Arabic / Egyptian | Use |
|---|---|---|---|
| windows (Microsoft Hoda ar-EG, David/Zira en-US) | yes | native Egyptian, robotic | animatics, timing, internal drafts |
| local (Piper ar_JO kareem via sherpa-onnx) | yes | Levantine accent | deterministic scratch |
| azure (ar-EG-SalmaNeural / ShakirNeural) | no | native Egyptian neural voices, SSML prosody | production Egyptian narration |
| openai (gpt-4o-mini-tts) | no | good MSA; dialect via instructions (listen) | expressive direction by instructions |
| elevenlabs (multilingual v2) | no | Arabic variants incl. Egyptian | expressive production voices |

- Cloud adapters are written to the public REST APIs and stay **unverified until run with a key**. Set `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, or `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION`.
- The studio never requires the cloud. `auto` picks offline voices for drafts and the best cleared voice for `final`.
- Specialist Egyptian providers in the 2026 market (SILMA, Munsit, Lahajati) are on the radar (`TECH_RADAR.md`). Add an adapter only after a listening comparison.

**Performance map** (`performance` per line): style, pace, energy, emphasis, pauses and ending.
- **Styles:** warm, authoritative, intimate, energetic, luxury, documentary, friendly, conversational, egyptian-commercial, corporate-english, whispered, urgent, reflective.
- **Controls:**
  - `pace` 0.8–1.25
  - `energy` low / mid / high
  - `emphasis` [words]
  - `pauseAfter` seconds
  - `ending` falling / lifted
- **How each provider receives it:**
  - OpenAI: an instructions sentence.
  - ElevenLabs: stability / style / speed.
  - Azure and Windows: SSML prosody, emphasis and breaks.
  - Local: speed.
- Direct the voice along the film's emotional arc: line by line, not one style for the whole film.

**Lexicon** (`voice/lexicon.json`): how brand names, acronyms and technical terms are spoken inside Arabic or English narration. It changes the spoken text only. Captions keep the written form.

**Voice registry** (`voice/voices.json`): provider, voiceId, language, dialect, source, rights, commercial, ownership, consent and quality for every voice.
- `final` refuses voices that are not cleared commercially.
- **Cloning** needs `clone: true` plus recorded consent `{granted, by, date, scope}`. The studio refuses clones otherwise.
- The studio never clones a voice from arbitrary footage.

## Dubbing
1. Source dialogue → transcript.
2. Transcript → translation layer.
3. Translation → **adaptation** layer: natural phrasing, matching length and lip timing.
4. Adaptation → `voice.json` lines at the original sentence times.
5. Run `voice script`.
6. Run `fitToSlot` to tempo-fit within ±8 %. Beyond that it returns "shorten the adaptation". Speeding a voice up sounds wrong.
7. Run `mixScript`.

Meaning beats literal wording.

## Sound post
- **Dialogue:** `polish()` applies a high-pass, denoise (afftdn/RNNoise), de-ess and compression, then level. `stitch()` gives click-free jump cuts. Use room tone (`sounds/library.json` → room-tone) so gaps never drop to digital silence.
- **Music:** phrase-aware edits come from the music map (`lib/musicmap.mjs`, `lib/rhythm.mjs`). Ducking under speech: `mixScript` / `dialogue.duck()`.
- **SFX:** placed with cues (`placeCues`). Layer for weight; keep frequency space for the voice (avoid 1–4 kHz clutter under speech).
- **Final:**
  - `masterAudio` hits −14 LUFS / −1.5 dBTP for social.
  - `mixcheck` checks clipping, mono fold-down (> 4.5 LU loss = phase trouble), phone speaker (300 Hz–3.4 kHz) and phase.
- **Source separation** (speech / music / effects) is PLANNED: it needs PyTorch. Never claim a perfect split; keep the original track.

## QA (what must be true before calling audio done)
- **Transcription:** Arabic, English and mixed lines all present; speakers checked; a correction log exists.
- **Subtitles:** RTL is correct in a real player; timing is inside speech; translation coverage is 100 % for a bilingual delivery.
- **TTS:**
  - Duration fits its slot (manifest `overruns`).
  - Voice rights are cleared for `final`.
  - The lexicon was applied.
- **Mix:** loudness and true peak gates pass, mixcheck has no notes, music ducks under speech.
- **Listening:** do it on the exported file, with headphones and a phone speaker. **Never declare a voice natural or emotionally right from metadata.**
