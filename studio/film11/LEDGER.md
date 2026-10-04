# LEDGER — Film 11 AI × HR workshop showreel (25 s, 1080p60, one delivery). Takes in `studio/out/film11/` (not in git).

| time | issue | sev | fix | result |
|---|---|---|---|---|
| stills 1 | flip cards blank/misaligned (centred object inside a centred frame) | major | plain `div` cards at 0,0; header bar, bigger icons and text | fixed |
| stills 1 | storm/brain words collided («مجرد» vs Tool) | major | cx/size changed, duplicate line removed | fixed |
| stills 2 | end lock-up invisible: background appended after the 3D rig | major | `insertBefore(bg, firstChild)` | fixed |
| stills 2 | CTA mixed Arabic + Latin in one line: wrong bidi order, clipped | major | two lines (rtl / ltr), pill 1240 wide, size 56 | fixed |
| stills 3 | megaphone icon overlapped the "W"; wipe words cut at the edge; "aTraining" touching | minor | icon removed, sizes reduced, margin on ltr lines | fixed |
| score | mix −22 LUFS and a 0.8 s near-silent hole at 19.2–20.1 s (mega drop too deep) | major | tanh soft limiting before normalising; kick/bass/hats back from beat 45 | mix −15.8 LUFS raw, master trims to −14 |
| take01–03 | render stopped three times: `Page.captureScreenshot did not answer` at the title chapter (6.7–7.0 s); bisected with 1-worker range renders | blocker | title type: 20/16 layers (step 5.8/6) instead of 34/28, reflection 5/4 layers and hidden while invisible, glow moved from a `drop-shadow` filter on the face to a `text-shadow` on the layer behind | 6.7–7.3 s renders; look unchanged in stills |
| take04 | slice 0 (0–8.3 s) still stalled around frame 380–420 after hundreds of heavy frames in one page, while the same range in a fresh page rendered | blocker | `lib/render.mjs`: on a stalled capture the worker reopens the page (max 3 times per slice) and continues the slice; frames are pure functions of t | take05 |
| take05 | 60 fps full render restarted from zero after the render-tool change (~16 min); owner asked for the video immediately | — | stopped, switched config/production to 30 fps | take06 |
| take06 | 1920×1080, 30 fps, 25.000 s, −14.1 LUFS, TP −4.8, LRA 3.7, no freeze/black, share 38.8 MB PASS; text gate FAIL 185 (slammed words measured during entry overshoot) | gate | not fixed: delivered on the owner's order; "aTraining" spacing visible | delivered (24 MB re-encode for chat) |

Builder look at a 25-frame sheet of the share copy: all chapters read; flip-card labels are small at phone size. Not verified: listening, real-speed viewing, a fresh reviewer. 1 of 2 correction rounds used (render stability).
| v2 owner note | "client can't read anything; cards too fast, blank mid-turn; hosts' names too short; music catchier" | major | 120 BPM / 44 s; cards 2.5 s, text always on the card, backgrounds per card (base frame hidden); hosts chapter 12–16 + names under the CTA; score rebuilt (house bounce, 3-3-2 hook, 4/8/16/32 snare build) | stills OK at 12.4–20.2, 30, 37.3, 40–44 |
| take07 | 1920×1080, 30 fps, 44.000 s, −14.1 LUFS, TP −3.0, LRA 3.1, no freeze/black, share 28.4 MB PASS; text gate FAIL 367 (overshoot/overlap of slammed words) | gate | not fixed (same cause as v1; frames look clean on a 22-frame sheet) | delivered |
