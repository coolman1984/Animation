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
