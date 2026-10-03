> **Owner revision 2026-10-03:** the icon-building section (7.5–17.5 below) was removed as ugly; the finished logo now enters whole at 7.5 and the film is 15 s (`reels15`). The table below is the original 25 s plan; 17.5→7.5 and 20–25→10–15 in the delivered cut.

# BRIEF — Film 7 «معاك سند» · SANAD Business Advisory · 25 s · ONE delivery: Reels 9:16

Owner request 2026-10-03: a 25 s ad for SANAD (سند) — "premium, balanced, calm, attractive, motivating, playing on the client's emotions and psychological
needs" — and "a dynamic 25-second motion-graphics video that shows what an incredible motion designer you are, like a showreel for a résumé… go all out".
No placement was named, so the studio default for social video was used: 1080×1920 @ 30 fps (`config.ownerRequest`). Plan + craft metadata: `production.json`.
Rebuild: `python3 film7/icon_trace.py` + `python3 tools/logo_trace.py …` (see LEDGER) then `node make.mjs film7 --profile=final`.

## Truth
- Brand evidence: the five boards the owner supplied (primary logo, two identity boards, the navy Arabic banner, the office wall). All client material, git-ignored.
  The icon is **traced, never redrawn**: `icon_trace.py` splits the primary logo into its colour pieces (navy / gold / green connected components, potrace outlines,
  the owner's own pixels as the colour plate). The Latin SANAD wordmark and the Arabic «سند» wordmark are traced the same way (`tools/logo_trace.py`).
- **Brand conflicts to tell the owner** (nothing was changed): the boards show three different icons — (1) shield + infinity ribbon + arrow (primary logo, used),
  (2) a tangled-infinity shield on the office wall board, (3) an "S" shield on the navy banner — and two descriptors ("Business Advisory" on the primary logo and boards,
  "Business Solutions" on the wall board). The film uses (1) and "Business Advisory". The Arabic wordmark comes from board (3).
- Copy from the brand's own words: the three icon meanings (shield = protection/trust, infinity = partnership/continuity, arrow = growth/progress, from the identity board),
  the Arabic tagline «شريكك في الثقة والنمو المستدام» (wall board), the service areas (finance & governance, HR & talent, strategy & growth, operational excellence).
- Nothing invented: no clients, numbers, results, prices, phone or address (none supplied). CTA «احجز استشارتك» carries no contact details.
- The four "weights" (الحسابات · الفريق · المبيعات · القرارات) are a staged metaphor for what a founder carries; the four rows at 17.5–20 map them to the brand's service areas.

## Idea
The name means *support*. A founder's growth line is dragged down by four weights that land one per beat (night navy, thin, heavy). The ground rises under the line like a
dawn — the line becomes the horizon — and the weights float away light. The brand's icon is then built from its three meanings (shield → ثقة, ribbon → شراكة, arrow → نمو),
the four weights return as four calm service rows («اللي كان تقيل.. بقى مشترك»), and the lock-up lands with the brand's own tagline.
Psychological levers (honest ones): recognition of an unspoken load (loneliness at the top), relief (permission: «مش لازم»), safety (shield), belonging (partnership),
hope without hype (growth that is «مستدام.. بثبات»). Worlds: night navy → ivory dawn. One type family: Alexandria (Arabic + Latin).

| t (s) | bar | scene | beat |
|---|---|---|---|
| 0–2.5 | 1 | hook | the line climbs (arrow), «شايل شغلك كله لوحدك؟» |
| 2.5–5 | 2 | weights | four weights land on 2.5 / 3.125 / 3.75 / 4.375, the line sags, «والمسؤولية بتتراكم..», a breath at 4.85 |
| 5–7.5 | 3 | dawn | ivory ground rises along the line, weights float off, «مش لازم تشيل لوحدك.» |
| 7.5–10 | 4 | shield | outlines draw, halves lock (8.3), «معاك سند.» with the traced Arabic wordmark |
| 10–12.5 | 5 | trust | «ثقة» · a light runs round the shield |
| 12.5–15 | 6 | partnership | «شراكة» · a pen of light draws the infinity ribbon through the shield |
| 15–17.5 | 7 | growth | «نمو» · the arrow springs out (15.0), a gold trail climbs out of frame |
| 17.5–20 | 8 | shared | the icon climbs to the top; «اللي كان تقيل.. بقى مشترك.» + four service rows with checks |
| 20–25 | 9–10 | lock-up | SANAD wordmark letters, BUSINESS ADVISORY, hairline + diamond, tagline (22.5), CTA «احجز استشارتك» (23.3), hold 24–25 |

Music (original, `score.mjs`): 96 BPM (bar 2.5 s). Night: A minor, heartbeat, a hopeful rhodes arpeggio dragged down by four low thuds, E7 hanging; a breath; E7 → C major at
5.625 (deceptive resolution = relief); groove from 7.5 (C G | Am F, kick/clap/shaker, pluck 8ths, one hook that returns), builds with each meaning, lift on 15.0 (F G), warm and
lighter on the rows (Am F), arrival on the logo (C), final C rings under the hold. Not listened to (measured only).
