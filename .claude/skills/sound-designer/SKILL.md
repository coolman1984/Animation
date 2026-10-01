---
name: sound-designer
description: Score and sound-design a film in code — chords, groove, melody, ASMR effects locked to picture, stems, loudness mastering. Use for any music/SFX work; no licensed audio needed.
---
# sound-designer

**Engine:** `studio/lib/audio.mjs` (Rhodes FM, Karplus-Strong pluck, bass, pad, kick, noise hits, ice, bloop,
whoosh, bell, Freeverb room, WAV writer). **Score:** `studio/<film>/score.mjs` → `takes/<film>/{music,sfx,mix}.wav`.

## Recipe used for café/drinks (film 2)
90 BPM bossa/lo-fi: rootless Rhodes voicings Dm9–G13–Cmaj9–A7(b13), bossa comp on eighths [0,3,6,10,12] over 2 bars,
bass root/fifth, shaker 16ths + brush swish on 2 & 4, rim-click clave, soft kick [0,3,4,7] eighths, nylon pluck
melody in two 2-bar phrases, pad bed, final C6/9 ring-out. Sections follow scenes: intro sparse → groove at the
hero shot → lighter for the emotional beat → fullest for the montage → breakdown for "the place" → resolve on the end card.

## Sound design locked to picture
Ice clinks on the hook and on close-ups, bell plucks per callout, shimmer + air on the portal, low whoosh +
bubble blips on the liquid wipe, "bloop" on every montage cut and falling pearl, soft hit (low thump + bell chord)
when the logo lands, pop on the CTA. Times are copied from film.js — keep them in one place when you change one.

## Mix & master (numbers)
High-pass keys 90 Hz (FM 1:1 makes DC), pads 70 Hz, plucks 120 Hz, music bus 30 Hz. SFX bus ×2.6 vs music
(ASMR must be heard). Master: volume → alimiter → two-pass `loudnorm` linear → alimiter (`lib/finish.mjs masterAudio`).
Targets: −14 LUFS social / −16 web, true peak ≤ −1.5 dBTP, LRA < 8. Always export music-only + mix.

## Judge without ears
Spectrogram + waveforms (`showspectrumpic`, `showwavespic`), sub energy (`lowpass=40,volumedetect` ≥ 20 dB under
full band), ebur128 summary. Look for: SFX visible in its own waveform, no clipping, no rumble.

## Checklist
1. Tempo = picture grid. 2. Chords resolve on the end card. 3. SFX on every visual event. 4. HP filters.
5. Reverb sends modest. 6. Fade with picture. 7. Stems written. 8. Loudness measured, not guessed. 9. TP ≤ −1.5. 10. Music-only exported.

## Worked example
`studio/film2/score.mjs` (~150 lines, renders 60 s in ~6 s).
