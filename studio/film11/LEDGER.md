# LEDGER — Film 11 AI × HR workshop showreel (25 s, 1080p60, one delivery). Takes in `studio/out/film11/` (not in git).

| time | issue | sev | fix | result |
|---|---|---|---|---|
| stills 1 | flip cards blank/misaligned (centred object inside a centred frame) | major | plain `div` cards at 0,0; header bar, bigger icons and text | fixed |
| stills 1 | storm/brain words collided («مجرد» vs Tool) | major | cx/size changed, duplicate line removed | fixed |
| stills 2 | end lock-up invisible: background appended after the 3D rig | major | `insertBefore(bg, firstChild)` | fixed |
| stills 2 | CTA mixed Arabic + Latin in one line: wrong bidi order, clipped | major | two lines (rtl / ltr), pill 1240 wide, size 56 | fixed |
| stills 3 | megaphone icon overlapped the "W"; wipe words cut at the edge; "aTraining" touching | minor | icon removed, sizes reduced, margin on ltr lines | fixed |
| score | mix −22 LUFS and a 0.8 s near-silent hole at 19.2–20.1 s (mega drop too deep) | major | tanh soft limiting before normalising; kick/bass/hats back from beat 45 | mix −15.8 LUFS raw, master trims to −14 |
