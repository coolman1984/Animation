# BRIEF — Film 1 "One order, two screens" (طلب واحد، شاشتين)

**Status:** Phase 0 done · ⛔ **Gate A — waiting for owner approval** of the inputs (§1) and storyboard (§5).

---

## 1. Inputs (owner left them empty → defaults chosen; change any at Gate A)

| Field | Default chosen | Why |
|---|---|---|
| Product / subject | **Ruknak / ركنك** — a small *real, working* shop-ordering app the studio builds as its first set: customer phone app + shop desktop dashboard + courier step, with a real backend and API. Name is a placeholder. | No product exists in the repo. The film rules forbid mock-ups, so the studio needs a real app to film. Swap for your own product (URL or repo) at Gate A and the same pipeline applies. |
| Viewer | Neighbourhood shop owner in Egypt, 30–55, watching on a **phone in a feed, sound off**; hero version also on YouTube / a website with sound on | Most demanding case: must read with no sound on a small screen |
| One action afterwards | "جرّب الديمو" — try the demo (placeholder; becomes your link/WhatsApp at Gate A) | — |
| Languages | **Arabic RTL** on screen and in the app (light Egyptian), Arabic SRT/VTT + English SRT/VTT | Real RTL shaping is part of the quality bar |
| Numbers | **Arabic-Indic digits** (١٢٣) everywhere on screen, consistently | Matches Egyptian shop signage and receipts |
| Brand | Invented neutral system: ink `#0E1525`, sand `#F4EDE2`, saffron accent `#F5A524`, mint success `#2BB673`, slate text `#5B6475`. Type: **IBM Plex Sans Arabic** (Bold display / Regular body) + **Inter** for Latin; both SIL OFL, licence recorded in ASSETS.md. Logo: a code-drawn corner mark. All in one config file — nothing hard-coded. | — |
| Length / platforms | Hero **16:9 1920×1080, 60 fps, ~50 s** · cut-down **9:16 1080×1920, 30 fps, ≤ 30 s** · bumper **6 s** (16:9 + 9:16, silent-friendly) · share copy ≤ 27 MB · 3 thumbnails · SRT/VTT | — |
| Never claimed / shown | No real company, brand, person, face or voice. No user counts, ratings, savings, speed promises, prices of a real service, or "secure/guaranteed" claims. No delivery-time number as a headline (reads as a promise). Customer and courier names are invented and labelled. | Truth-first rule |
| Machine | 4 CPU cores · 15.7 GB RAM · **no GPU** (x264 on CPU) · internet: GitHub + npm reachable, many sites blocked | From the doctor (§2) |

## 2. Doctor (run `node lib/doctor.mjs`)

| Check | Result |
|---|---|
| Node ≥ 22 with global WebSocket | ✅ 22.22.0 |
| Chromium (CDP) | ✅ 141.0.7390.37 at `/opt/pw-browsers/chromium` |
| Device-scale gate | ✅ `--force-device-scale-factor=2` → css 500 px → PNG 1000 px |
| ffmpeg / ffprobe | ✅ 6.1.1 |
| x264, x265, AAC, Opus, VP9, WebP | ✅ |
| loudnorm, alimiter, ebur128, freezedetect, blackdetect, tile, subtitles (libass), palettegen | ✅ |
| GPU encoder | ❌ none usable → CPU x264 (fine at 1080p) |
| Arabic fonts installed | ⚠️ only DejaVu/FreeSerif (weak Arabic) → vendor IBM Plex Sans Arabic + Inter into `assets/fonts/` (download from github.com/google/fonts verified reachable) |
| Cores / RAM / disk | 4 → 4 render workers · 15.7 GB · 30 GB free |

Optional accelerators (HyperFrames / Remotion from the earlier `PLAN.md`) are **not needed** for this film; the studio's own `renderAt(t)` composer covers it with zero packages.

## 3. The film in one sentence
We follow **one real order** from a customer's phone, to the shop's screen, to the courier, to the
door — every number on screen read back from the app — so a shop owner thinks *"that's my shop,
without the phone calls."*

## 4. Proof list (each must be read back from the API/DOM; the cut refuses to build on mismatch)
| # | Shown on screen | Source of truth |
|---|---|---|
| P1 | Order number (e.g. #١٠٢٧) | `POST /api/orders` response, then `GET /api/orders/:id` |
| P2 | Cart item count and order total (e.g. ١٨٥٫٥٠ ج.م) | backend-computed total vs. phone DOM vs. dashboard DOM — all three must match |
| P3 | Order appears on the shop dashboard | dashboard DOM card with the same id, timestamp in event log |
| P4 | Status steps: placed → accepted → packed → out for delivery → delivered | `GET /api/orders/:id/history` |
| P5 | Taps the shop needed to accept | counted from the stage event log |
| P6 | Day summary (orders today, revenue today) | `GET /api/summary?date=` vs. dashboard DOM |
| P7 | Studio-clock times shown in the app | clock offset file; labelled "time compressed" |

## 5. Storyboard (hero 16:9, 50 s, 60 fps) — persistent actor: **order #1027**, visible in the side rail with 5 steps ticking off

| # | t (s) | Purpose | On screen | Proven | On-screen words (≤ 7/line) | Sound | Dur | Transition in |
|---|---|---|---|---|---|---|---|---|
| 1 | 0.0–2.5 | **Hook** (pattern-break, finished frame 1) | Phone already centred on a glow plate; real "new order" notification slides down | P1 (id) | "طلب جديد #١٠٢٧" (from the app) · title: "طلب واحد" / "من الموبايل لباب البيت" | riser into a soft hit; notification chime | 2.5 | none (opening is a finished composition) |
| 2 | 2.5–5.5 | Name the pain (question hook) | Phone dims and pushes back; kinetic type, word-staggered | — (text only, no claim) | "لسه بتاخد الطلبات" / "على التليفون؟" | pad enters; swell | 3.0 | type entrance over phone exit |
| 3 | 5.5–12.5 | Customer builds the order | Real customer app on phone; finger taps 3 products; cart total rolls up; camera follows (≤ 1.16×) | P2 | rail: "١ · الطلب" · caption "العميل بيختار… والحساب لوحده" | taps, counter roll; groove enters | 7.0 | cut on action |
| 4 | 12.5–16.5 | Order placed — first proof | Tap "اطلب"; confirmation screen; camera **look** on the order card (1.24×); stamp in its own zone | P1, P2 | stamp "الطلب اتسجّل ✓" | chime | 4.0 | J-cut (chime starts under tap) |
| 5 | 16.5–21.5 | Same order, other screen | Whoosh: phone slides left, laptop enters with perspective (rotateX ≤ 15°); the real dashboard shows the new card arriving | P3 | "في نفس اللحظة… عند المحل" | stereo whoosh ≥ 200 Hz | 5.0 | device change (foreground is the transition) |
| 6 | 21.5–27.5 | Shop accepts and packs | Cursor clicks "قبول", item checklist ticks one by one; camera follows (≤ 1.4×) | P4 (accepted, packed), P5 | rail: "٢ · المحل" · "قبول بلمسة واحدة" | clicks, typing ticks, chime per step | 6.0 | cut on action |
| 7 | 27.5–31.5 | Hand to courier + time skip | Pick courier "كريم (اسم تجريبي)"; studio clock skips; pill "الوقت مضغوط" | P4 (out for delivery), P7 | rail: "٣ · التوصيل" · "الطيار في السكة" | soft swell (chapter) | 4.0 | L-cut (swell carries over) |
| 8 | 31.5–36.5 | Customer sees it live | Back to phone (both devices visible, phone foreground); status line fills by itself | P4 | "العميل شايف كل خطوة" | whoosh reversed, low pad | 5.0 | device change |
| 9 | 36.5–40.5 | **Payoff proof** — delivered | Status = delivered; rail completes all 5 steps; stamp | P4 (delivered), P1 | stamp "اتسلّم ✓" | chime + counter-roll | 4.0 | cut on action |
| 10 | 40.5–45.5 | Owner's view of the day | Dashboard summary; two rolling counters; pill "بيانات تجريبية" | P6 | "النهاردة: ١٢ طلب" / "٢٬٣٤٠ ج.م" (values come from the API, these are examples) | counter rolls, groove resolves | 5.0 | push-in from dashboard |
| 11 | 45.5–50.0 | End card + CTA | Corner logo lockup, product line, CTA; one fade at the very end | — | "ركنك" / "طلبات محلك في مكان واحد" / "جرّب الديمو" · pill "منتج تجريبي" | soft hit, pad tail | 4.5 | overlap with beat 10 exit |

**Rhythm map (beat starts, s):** 0 · 2.5 · 5.5 · 12.5 · 16.5 · 21.5 · 27.5 · 31.5 · 36.5 · 40.5 · 45.5 · end 50.0. No shot > 8 s without a change in motion or framing (longest beat 7 s). Every proven number dwells ≥ 1.8 s.

**Cut-down 9:16 (≈ 26 s):** beats 1 → 3 (short) → 4 → 5 → 9 → 11, phone-first framing, captions burned in.
**Bumper 6 s (idea E5):** "طلب جديد" notification → one tap "قبول" → stamp "اتسلّم ✓" → logo. Works muted.

## 6. Motion & look (locked once, applied everywhere)
- Entrances: ease-out-expo 0.9 s · exits: ease-in-out-cubic 0.5 s · back-out only for stamps/ticks · word stagger 60 ms.
- Never two big moves at once; nothing appears without an entrance or leaves without an exit.
- Camera: phone ≤ 1.16× follow, desktop ≤ 1.4× follow, look shots ≥ 1.24×, Gaussian σ 0.5 s, ≤ 0.4 % breathing drift.
- Devices: real bezels, soft shadow, glow plate, vignette, fine grain (anti-banding). No lens flares, shakes or spinning logos.
- Type sizes at 1080p: key words ≥ 40 px (titles 72–96 px), captions ≥ 24 px, contrast ≥ 4.5 : 1.
- HUD rail on the left of frame in RTL order (right edge = start): chapter, kinetic title, order #, 5-step line, one stamp zone — never over the product UI.

## 7. Sound
Code-synthesised (no licences): warm pad + plucked arpeggio + small-room reverb + soft groove from beat 3. Riser into beat 1, soft hit on end card. SFX locked to the event log. Targets: −16 LUFS integrated (hero), −14 LUFS (9:16/bumper), true peak ≤ −1.5 dBTP, LRA < 8. No voice-over (captions-first).

## 8. Honesty list (what the viewer is told)
| Thing | Label on screen |
|---|---|
| The app and brand are a demo made by the studio | pill "منتج تجريبي" on end card + first appearance |
| Customer, courier, shop names | "اسم تجريبي" on first appearance |
| Time between steps | pill "الوقت مضغوط" when the clock skips |
| Day-summary figures come from seeded demo orders | pill "بيانات تجريبية" |

## 9. Deliverables
Master (x264 CRF 14) · share copy ≤ 27 MB (2-pass) · music-only WAV/AAC · 9:16 cut-down · 6 s bumper ×2 · contact sheet · `measure.json` · 3 thumbnails (≤ 4 words) · poster frame · Arabic + English SRT/VTT · one rebuild command: `node make.mjs film1`.
