# BRIEF — Film 16 «٤ أسئلة» · Hessa (حِصّة) · 25 s motion-graphics showreel-ad · ONE delivery: 16:9

Owner request 2026-10-08: "a world-class motion-graphics video for the Teachers program (Hessa), 25 seconds, dynamic, the kind of
piece that shows what an incredible motion designer you are — a résumé showreel about innovation in this topic. Go all out."
No placement named for a showreel → 1920×1080 @ 30 fps (`ownerRequest` hessa25), loudness −14 LUFS (online playback).
Language: Egyptian Arabic ad copy (the buyers are centre owners in Egypt), Latin only as the brand writes it (HESSA), never mixed in one line.

## The one idea
A centre owner asks four questions every evening: **مين حضر؟ مين دفع؟ مين عليه فلوس؟ والدرج فيه كام؟** — these are exactly the owner-approved
sales promise in `Teachers/LAUNCH_SCOPE.md` ("know who attended, who paid, who owes money, and what is in the drawer").
The film is those four questions answered by four pieces of real product behaviour, each as its own motion-design device,
chained by ONE hero object: **the amber dot** (the app's `--signal` colour). It is a ball, a student, a flood, a toggle, a coin, the logo tile.

## Shape (120 BPM, beat 0.5 s, bar 2 s) — all times shared with the score through `timing.js`
| t | chapter | motion device | product truth it stands on |
|---|---|---|---|
| 0–4 | **Hook** — the dot hops down four questions | squash/stretch ball, type born at each landing | the four questions (LAUNCH_SCOPE sales promise) |
| 4–8 | **مين حضر؟** | container morph (button → dot), seeded wave across a field of 119 students, count = lit dots | reception: search by card code, name or phone → «تسجيل الحضور» |
| 8–12 | **مين دفع؟** | amber flood from the dot, thermal receipts print out of a slot, the reversal prints beside it | fee collection with payment method; receipts are never deleted, only reversed |
| 12–15 | **مين عليه فلوس؟** | FLIP-sort of a list (rows spring to new places), total counts up, circle reveal from the moon toggle | «عليهم مستحقات» list; the real daylight/night theme toggle |
| 15–19 | **والدرج فيه كام؟** | night theme, denomination tiles count in, expected vs counted, the red difference falls to 0 | «إغلاق الوردية»: cash counted by denomination, expected, counted, difference |
| 19–25 | **Payoff** | four chips become the four tiles, collapse into the amber logo tile (whole, never assembled), tagline, CTA | headline, sub-line and CTA are copied from the owner's own posters (Teachers brand family); the app's in-product tagline «سنترك في سجل واضح» is not used |

## Copy (all of it, in order)
Questions: مين حضر؟ · مين دفع؟ · مين عليه فلوس؟ · والدرج فيه كام؟
Answers: «بكارت.. أو اسم.. أو رقم» · «الإيصال مبيتمسحش.. بيتعكس» · «بالاسم.. وبالمبلغ» · «والفرق قدّامك»
Payoff (the owner's own poster lines): حِصّة · سنترك كله قدام عينك · برنامج لإدارة السنتر · راسلني واحجز عرض البرنامج
Owner order 2026-10-08: **never say «يشتغل من غير إنترنت»** (or any offline-use claim) anywhere in this film.

## Truth (data-honesty)
- Every UI shown is rebuilt from the real product screens in `Teachers/docs/img` (tokens from `css/tokens.css`, the cap icon path from `js/core.js`).
  Names, numbers and amounts are fictional demo data; a small «بيانات تجريبية» footnote stays on screen through the UI chapters.
- No claim beyond the first-sale core (attendance, fees + receipts, dues, cash shift, reversal). Nothing about parents' links, AI, remote, exams or "never lose data".
- Payment-method names (نقدًا · فودافون كاش · إنستاباي · فوري) appear as plain text exactly as the product's own dropdown; no third-party logos.
- CTA «راسلني واحجز عرض البرنامج» is the owner's own poster CTA (a demo booking, not a price or trial promise). **No phone/URL on screen, exactly as on his posters.** (Public repo: no real numbers.)
- Poster language adopted from the owner's three posters (2026-10-08): dark navy + amber glow, «قدامك» voice, plane-icon CTA pill; the logo tile + «حِصّة» row sits at the top as on the posters.

## Direction
Palette: ink #070D1C · navy #13294B · amber #F2A900/#FFC23D · paper #EAF0F8 · white; green/red only as the app's trust colours (paid / owes).
Worlds change per chapter (ink → navy → amber → paper → night → navy), one motif holds it together (the dot). Two type families: **Alexandria** (display) + **IBM Plex Sans Arabic** (the UI inside cards).
Camera: slow push-ins on holds, impact shake only on the hook landings and the logo hit. Transitions are objects, never wipes: dot → ripple, dot → amber disc, receipt → portal, moon toggle → circle reveal, tiles → logo.
Score: original 120 BPM, A minor / C major. The four hops are four rising notes (the question motif, unresolved); the answers resolve it; the logo plays the whole motif on C. Effects only from the picture's own events.
