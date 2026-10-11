# Film 22 — «Claude Code» 10 s Reels (2026-10-11)
Owner request: a new 10 s film about Claude Code using the 2026-10-11 motion-numbers methods. No placement named → Reels 9:16, 1080×1920, 30 fps, one delivery (`reels10`).
**Idea:** one orange terminal cursor is the hero of every shot. Problem cursor (a failing test) → grows into a terminal window → the typing caret → a bullet for each step the agent takes → the edit marker on the fixed line → a dot that visits three tests → a circle that wipes the world cream → the tile on the drop.
**Copy (Egyptian Arabic, two lines + one action):** «باج واحد.. ضيّع يومك؟» → «بيقرا.. بيعدّل.. بيجرّب» → «جرّبه دلوقتي». Code/test names are Latin mono.
**Honesty:** the code, test names and numbers are an invented illustration, labelled «مثال توضيحي» on every frame; no speed, accuracy or customer claim; no URL (none supplied). The tile is a generic terminal glyph, not Anthropic's logo; no affiliation claimed.
**Methods applied:** springs by damping ratio (`motion.js zspring`, ζ 0.5–0.8) · every beat computed from time (`timing.js tb/fr`) · subframe motion blur (`config.subframes: 4`, new in `lib/render.mjs`) · speed graph (`node film22/speedgraph.mjs`: no linear runs, no pops) · typing times shared by picture and sound (`CHAR_T`).
**Named ban list (applied):** no glow/bloom, no floating particles, no purple/blue gradients, no fade-and-slide-up (clip reveals and slams instead), no everything-centred layout, no moving text while it is read.
**Look:** ink #15130f, cream #f4efe6, terracotta #d97757, green #6fcf97, red #ef6f63; Alexandria (display) + Space Mono (code).
**Sound:** original 120 BPM score (`score.mjs`): A minor warning bell + thuds → typing ticks → groove → C major drop on the tile; hook E G A G returns every bar.
