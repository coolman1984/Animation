# Film 1 — Idea lab (30 cards)

Subject (default, see BRIEF.md §1): **Ruknak / ركنك** — a small, real, working neighbourhood-shop
ordering app built inside this repo as the studio's first "set". Customer orders on a phone; the
shop runs a desktop dashboard; a courier delivers. Brand and name are placeholders.

Card fields: **Hook** (first 2 s) · **Promise** (the one thing) · **Proof shot** (what the real app
shows, read back from the API) · **Payoff** · **CTA** · **Platform** · **Length**.

## A. Problem → proof demo
| # | Title | Hook | Promise | Proof shot | Payoff | CTA | Platform | Len |
|---|---|---|---|---|---|---|---|---|
| A1 | One order, two screens | Phone already on screen; "new order #1027" notification lands on frame 1 | An order goes from the customer's phone to the shop counter to the door with no phone calls | Order #1027 followed phone → dashboard → courier → delivered, each step read back | Delivered stamp + shop's day total rolling up | Try the demo | 16:9 hero + 9:16 + bumper | 50 s |
| A2 | Zero lost orders | Chat bubbles pile up and blur out | Every order is logged, none forgotten | 3 orders placed at once all land on the dashboard; count = API | "3/3 received" counter | Try the demo | 9:16 | 30 s |
| A3 | Accept in one tap | Giant finger tap on a pulsing card | Accepting an order is one tap | Tap on dashboard → customer phone flips to "accepted" | Both screens agree, side by side | Try the demo | 9:16, 1:1 | 15 s |
| A4 | Stock never lies | "Sold out" sticker slaps onto a product | Out-of-stock disappears from customers instantly | Shop toggles stock → item greys out on phone | No wrong order possible | Try the demo | 9:16 | 20 s |
| A5 | Close the day in 10 s | Clock hits 22:00 | End-of-day totals are ready, not counted by hand | Dashboard day summary = sum of seeded orders | Counter lands on the exact total | Try the demo | 1:1 | 20 s |

## B. Day in the life
| # | Title | Hook | Promise | Proof shot | Payoff | CTA | Platform | Len |
|---|---|---|---|---|---|---|---|---|
| B1 | A day at the corner shop | Shutter opens at 08:00 (studio clock) | The app quietly runs the whole day | Clock skips; orders tick in through the day | Calm owner screen at 22:00 | Try the demo | 16:9 | 60 s |
| B2 | The courier's route | Courier phone buzzes | Couriers get clear jobs, no calls | Courier view: pick-up → delivered | Delivered stamp | Try the demo | 9:16 | 30 s |
| B3 | Rush hour, 19:00 | 10 cards cascade in | Peak hour stays calm | 10 orders in 2 min (time-compressed), queue sorted | Queue empties to zero | Try the demo | 16:9 | 40 s |
| B4 | Friday shopping list | Hand types "milk, bread…" | Shopping without leaving home | Customer builds a 6-item cart | Doorbell + delivered | Try the demo | 9:16 | 30 s |
| B5 | Owner on holiday | Beach-blue gradient, phone dashboard | Run the shop from anywhere | Owner's phone view accepts an order | Day total on phone | Try the demo | 9:16 | 25 s |

## C. Before / after
| # | Title | Hook | Promise | Proof shot | Payoff | CTA | Platform | Len |
|---|---|---|---|---|---|---|---|---|
| C1 | Notebook vs app | Split screen: paper list (staged) vs dashboard | From scribbles to a clean queue | Right half is the real dashboard | Left fades out | Try the demo | 16:9, 1:1 | 30 s |
| C2 | Ringing vs silent queue | Ringing phone icon (staged sound) | Orders arrive without calls | Silent card slides into queue | Phone icon dissolves | Try the demo | 9:16 | 20 s |
| C3 | Wrong change vs exact total | Coins scatter | Totals computed, not guessed | Cart total = backend total | "to the piastre" stamp | Try the demo | 9:16 | 20 s |
| C4 | Five apps vs one | Five tiles collapse | One place for orders | Single dashboard | One tile remains | Try the demo | 1:1 | 15 s |
| C5 | Missed vs notified | Grey "missed" card | Every order makes noise | Notification + dashboard card | Green tick | Try the demo | 9:16 | 15 s |

## D. Myth-buster
| # | Title | Hook | Promise | Proof shot | Payoff | CTA | Platform | Len |
|---|---|---|---|---|---|---|---|---|
| D1 | "Apps are for big chains" | Myth in quotes, struck through | Small shops can run it | One-shop setup, real screens | Struck-through myth | Try the demo | 9:16 | 25 s |
| D2 | "Setup takes weeks" | Calendar pages flying | Add products in minutes | Add 3 products live; count read back | Products appear on the phone | Try the demo | 16:9 | 40 s |
| D3 | "My customers won't use apps" | Question on screen | Ordering is 3 taps | Tap count from event log | "3 taps" counter | Try the demo | 9:16 | 20 s |
| D4 | "Delivery needs a phone call" | Ringing icon crossed | Status updates itself | Phone status moves by itself | Delivered | Try the demo | 9:16 | 20 s |
| D5 | "Commissions eat profit" | Coin stack | — needs pricing claims we don't have | — | — | — | — | ✗ blocked (claim) |

## E. Numbers story
| # | Title | Hook | Promise | Proof shot | Payoff | CTA | Platform | Len |
|---|---|---|---|---|---|---|---|---|
| E1 | 1 order · 7 steps · 0 calls | Three numbers stamp in, number-first | The whole journey, counted | Steps counted from the event log | Counters lock | Try the demo | 16:9 + 9:16 | 30 s |
| E2 | Exact to the piastre | "185.50" rolls in | Totals are exact | Cart total = API total = receipt | Three equal numbers | Try the demo | 9:16 | 15 s |
| E3 | Door to door in N minutes | Stopwatch | Track every minute | Studio-clock duration, labelled "time compressed" | N min stamp | Try the demo | 9:16 | 20 s — risky: reads as a speed promise |
| E4 | Today in numbers | Dashboard KPIs count up | The day at a glance | Summary = seeded orders | KPIs lock | Try the demo | 1:1 | 15 s |
| E5 | 3 taps to accept | "3" fills the frame | Accepting is effortless | Tap count from event log | Phone flips to accepted | Try the demo | 6 s bumper / 9:16 | 6–15 s |

## F. Behind the scenes
| # | Title | Hook | Promise | Proof shot | Payoff | CTA | Platform | Len |
|---|---|---|---|---|---|---|---|---|
| F1 | X-ray of an order | Screen turns to blueprint lines | See how an order travels | API events overlaid on real screens | All lines light up | Try the demo | 16:9 | 40 s |
| F2 | Making of this film | Terminal "make" command | The studio films real apps | Shoot timelapse | Final frame | Order a film | 16:9 | 45 s |
| F3 | A shop opens in 2 minutes | Empty dashboard | Setup is quick | Create shop + 3 products, read back | First order arrives | Try the demo | 16:9 | 45 s |
| F4 | What the courier sees | Courier phone close-up | Clear jobs | Courier list | Delivered | Try the demo | 9:16 | 20 s |
| F5 | Closing time | Lights dim on the dashboard | Done for the day | Summary screen | Shutter closes | Try the demo | 1:1 | 15 s |

## Scoring (1–5; production cost: 5 = cheapest)
| # | Clarity in 3 s | Proof | Emotion | Cost | Reuse | **Total** |
|---|---|---|---|---|---|---|
| **A1** | 5 | 5 | 4 | 3 | 5 | **22** |
| **E1** | 5 | 5 | 3 | 4 | 4 | **21** |
| **E5** | 5 | 5 | 2 | 5 | 4 | **21** |
| A3 | 5 | 4 | 2 | 5 | 4 | 20 |
| A2 | 4 | 5 | 3 | 3 | 4 | 19 |
| B1 | 4 | 4 | 5 | 2 | 4 | 19 |
| C1 | 5 | 3 | 4 | 3 | 4 | 19 |
| D2 | 4 | 5 | 3 | 3 | 4 | 19 |
| F3 | 4 | 5 | 3 | 3 | 4 | 19 |
| A4 | 4 | 5 | 3 | 3 | 3 | 18 |
| B3 | 4 | 4 | 4 | 2 | 4 | 18 |
| C2 | 4 | 3 | 4 | 4 | 3 | 18 |
| C3 | 4 | 4 | 3 | 4 | 3 | 18 |
| D1 | 4 | 4 | 3 | 4 | 3 | 18 |
| D4 | 4 | 4 | 3 | 4 | 3 | 18 |
| E2 | 4 | 5 | 2 | 4 | 3 | 18 |
| E4 | 4 | 4 | 2 | 4 | 4 | 18 |
| F2 | 3 | 4 | 3 | 3 | 5 | 18 |
| C5 | 4 | 3 | 4 | 3 | 3 | 17 |
| E3 | 4 | 4 | 3 | 3 | 3 | 17 |
| F1 | 3 | 5 | 2 | 3 | 4 | 17 |
| F5 | 3 | 3 | 4 | 4 | 3 | 17 |
| A5 | 3 | 4 | 2 | 4 | 3 | 16 |
| B4 | 3 | 3 | 4 | 3 | 3 | 16 |
| D3 | 3 | 3 | 4 | 3 | 3 | 16 |
| B2 | 3 | 3 | 4 | 2 | 3 | 15 |
| B5 | 3 | 3 | 4 | 2 | 3 | 15 |
| C4 | 3 | 2 | 3 | 4 | 3 | 15 |
| F4 | 3 | 3 | 3 | 3 | 3 | 15 |
| D5 | 3 | 1 | 3 | 4 | 2 | 13 ✗ |

## Recommendation
1. **A1 — One order, two screens** (build now). Highest proof and reuse: one shoot yields the hero,
   the 9:16 cut-down and the bumper. It exercises every studio part (two devices, studio clock,
   camera, counters, RTL).
2. **E5 — 3 taps to accept** — becomes the 6 s bumper cut from the same A1 footage (no new shoot).
3. **F3 — A shop opens in 2 minutes** — the next film; reuses the same set with a different seed.
