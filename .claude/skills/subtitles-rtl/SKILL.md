---
name: subtitles-rtl
description: Arabic RTL captions — SRT/VTT from the composition's real text timeline, English translations, burn-in rules, line breaking, reading speed. Use when a film has on-screen text or needs captions.
---
# subtitles-rtl
Operating policy: `studio/WORKFLOW.md`; load only the relevant department via `studio/SKILLS.md`.


## Source of truth
Captions are **read back** from the composer: `textTimeline()` (`studio/lib/render.mjs`) renders every 0.1 s and
records which text lines are visible (opacity > 0.5) → start/end per line. No hand-typed timings.
`captions(lines, base, { translate })` (`lib/finish.mjs`) writes `<base>.srt` and `.vtt`. English via the `en` map in `<film>/config.mjs`.

## Rules
- ≤ 7 words per line, ≤ 2 lines on screen, ≥ 1.8 s each, ≤ 17 characters per second.
- Burned-in Arabic: real fonts (El Messiri, Aref Ruqaa, Plex Arabic), `direction: rtl`, one span per **word** (never per letter — breaks shaping).
- Digits: pick Arabic-Indic or Latin per film and keep it everywhere.
- Ellipsis "…" (U+2026) attaches to the word; no space before Arabic punctuation "؟" "،".
- Feed placement: keep inside safe area (24 px inset in 4:5; Reels: configured safeRect, checked against the intended placement UI).
- Facebook: upload SRT named `<name>.ar_EG.srt` / `.en_US.srt` if captions should be selectable; burned text already carries the message.

## Checklist
1. Timeline read back. 2. No overlaps (`issues` empty). 3. Inside safe area. 4. ≥ 1.8 s. 5. ≤ 17 cps.
6. Shaping intact (view a 1:1 crop). 7. Punctuation spacing. 8. EN map complete. 9. SRT + VTT both. 10. Files in the take folder.
