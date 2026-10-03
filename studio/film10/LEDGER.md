# LEDGER — Film 7 Pixel Plus «من فكرة صغيرة… لأنظمة بتشتغل كل يوم» (3:00, YouTube 1920×1080, 30 fps, one delivery)
time → issue → severity → fix → result. Takes live in `studio/out/film10/` (not in git).

## Builder loop on stills (before any export; not counted as correction rounds)
| time | issue | sev | fix | result |
|---|---|---|---|---|
| 86–87, 130–132 | typed text showed "[object Object]" | blocker | `typeOn()` returns `{ text, … }`: use `.text` | "MB52" and the Arabic question type correctly |
| 4.6–9.4 | "Pixel Plus · عرض الشركة" rendered "Plus Pixel": textLine splits on every space (incl. NBSP) and RTL flex reverses Latin pairs | major | Arabic-only subtitle «عرض تقديمي للشركة» (the HUD carries the Latin brand) | reads correctly |
| 12–40 | keyword «العمل اليدوي» cut off at the left frame edge | minor | 270 → 215 px, centre x 640 → 680 | fits |
| 36–39.6 | reframe question overlapped the top problem windows | major | windows moved down 30–60 px, question y 214 → 172 | clear |
| HUD, chips | Arabic-Indic "٠٥" read as "·٥" (the Arabic zero is a dot) | minor | single digits: «٥ المشاريع», «مشروع ١», method «١…٥» | reads naturally |
| score | spectrogram showed heavy sub-bass (20–160 Hz) under an "elegant, low" brief | major (sound) | high-passes (strings 170, harp 160, bass 45, master 38 Hz), bass bus 0.9 → 0.45, piano/harp up | mixcheck clean: phone band −3.8 LU, mono −3.3 LU, no clipping; LRA ≈ 2 LU |
| 77–80 | «مصنع الموبايل» label overlapped the phone base late in the orbit | minor | label top follows the projected base (≥ base + 44 px) | clear at 79.5 |

## Art-direction pass (owner: "review and improve before you continue… GO ALL OUT")
| time | upgrade | why |
|---|---|---|
| 59–84 | 3D chapter: close low reveal that pulls back (59–64.5); live TV dashboard (KPI bars, a drawing line chart, a scanning dot) and live phone app (progress ring → check, rows ticking); a production line of screens and phones behind the products with fog depth | the showpiece chapter read as two static props; now it reads "factory" and shows real-time 3D craft |
| 80.8–84.2 | TV dashboard clears to plain brand blue and the centre pixel leaves during the dive; first project window starts on the matching centre-blue gradient | seamless match cut from 3D to 2D |
| 84–144 | project window swings in 3D (spring out-and-back on every project change) and floats with a slow drift | flat window looked like a slide |
| all slams | El Messiri variable weight 400 → 700 as the keyword lands ("inks in"), thins as it leaves | richer typographic motion than fade/scale alone |
| 50.2, 175.6 | light sweep across the traced logo, right → left (reading direction); dark letters lift more than blue/grey | premium logo moments |
| 6.0, 9.0 | heartbeat on the bar lines of the opening hold: pixel breath, thin ring, grid ripple | the 5 s headline hold felt still |

Deliberate (not defects):
- The pixel motif repeats film 6, because it is the same brand.
- Three implosions return to the pixel: that is the motif.
- The project chapters share one window template (the preflight warns "container morph ×3" on purpose).
- UI windows are illustrative mock-ups with no real data.
