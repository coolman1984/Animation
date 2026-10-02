# BRIEF — Film 6 · PIXEL Plus «عندك فكرة حلوة عايزها تتشاف؟» (20 s, 9:16 Reels, one delivery)

**Owner request (2026-10-02):** a 20 s Reels ad for our agency **PIXEL Plus** (this studio, now an ad agency), in the same
style and rhythm as an owner-supplied screen recording of a SaaS promo; a character like the one in it; natural, refined
Egyptian Arabic voice; very beautiful Arabic fonts. Reverse-engineer the video first.

**Reference (private pack `references/pixelplus-ref/`, not in git):** 15.4 s, 872×496 @ 60 fps screen recording, 123 BPM,
A minor/Phrygian house groove, no voice. Grammar learned (not copied): white / ink / electric-blue fields; a friendly 3-D
mascot rendered as a dithered dot texture; bold grotesk headline + ONE handwritten italic accent word in blue with a drawn
underline; tiny HUD labels («// 01 — hook») and a running timecode; product cards; a blue dot that grows from the question
mark; a lateral push; a whip-blur word flash and a cursor click; a dashboard that fills and a stamp («Handled.»); a black iris
into a dark line («You create. We handle the flow.»); a white bloom into the logo lock-up with the mascot behind the logo.
Player chrome and the reference's brand, copy, mascot design and music are not reused.

**For whom:** Egyptian business owners and marketers scrolling Reels. **Promise:** one agency makes the whole film — idea to
delivery — and makes it to be seen. **Evidence:** the film itself (made end-to-end by the studio); the board lists only steps
the studio really does. **CTA:** «ابدأ مشروعك — ابعتلنا رسالة» (no phone number, URL or statistics are invented).

**Direction:** our own mascot (curly hair, round glasses, «+» patch) modelled as a signed-distance 3-D figure and
ordered-dithered into 4 px square screen pixels — the agency's name is the motif; transitions dissolve in 12 px pixels.
Type: Alexandria 800 headlines (Egyptian designer Mohamed Gaber, OFL) + Aref Ruqaa Bold blue accent word + Space Mono /
IBM Plex Sans Arabic HUD. 120 BPM (bar 2 s, 10 bars).

| t (s) | shot | on screen | voiceover (script.json) |
|---|---|---|---|
| 0–3 | hook | «عندك فكرة حلوة / عايزها **تتشاف؟**», mascot pops up delighted | عندك فكرة حلوة… عايزها تتشاف؟ |
| 3–6 | services | blue; «كل اللي محتاجه»; cards إعلانات / موشن جرافيك / أفلام منتجات with dithered 3-D objects | إعلانات، موشن جرافيك، وأفلام لمنتجك. |
| 6–9 | result | «بيكسل بلس بتحوّلها لـ / فيلم / يتشاف **ويتفتكر.**», phone playing a mini reel with a heart | بيكسل بلس بتحوّلها لفيلم… يتشاف ويتفتكر. |
| 9–10 | whip | «فكرة. / صورة. / صوت.» on 1/8 notes, cursor clicks «ابدأ» which grows into the board | — |
| 10–13 | board | السيناريو ✓ · على الهوا · ١٢٠ BPM · الحركة والصوت ✓ · المقاسات · التسليم ٪١٠٠ ✓, stamp **«اتظبط.»** | من السيناريو، للحركة، للصوت… لحد التسليم. |
| 13–16 | dark | «إنت عليك **الفكرة.** / وإحنا علينا **الباقي.**», mascot winks | إنت عليك الفكرة… وإحنا علينا الباقي. |
| 16–20 | brand | PIXEL *Plus* resolves from pixels, mascot behind it, «وكالة إعلانات بتخلّي فكرتك **تتشاف.**», CTA pill, held 1.7 s | بيكسل بلس. ابدأ مشروعك… وخلّي فكرتك تتشاف. |

**Voice:** `ar-EG-ShakirNeural` (Microsoft Edge neural Egyptian voice) through `tools/tts_edge.py` / `node film6/voice.mjs`.
In this session the voice host (`speech.platform.bing.com`) is denied by the environment's network policy, so the film was
built with music + SFX and on-screen copy that carries the full message sound-off. Dropping `voice/l1…l6.mp3` in and
rebuilding mixes the voice and ducks the music automatically.
