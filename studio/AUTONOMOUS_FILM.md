# Owner goal: one request → one finished video

The owner explicitly delegates the entire production to Claude Code / their chosen Opus host.
The owner supplies the subject/assets/reference (if relevant), duration and desired placement/size
in normal language. The agent handles all internal work. Do not ask the owner to fill JSON, inspect
frames, choose from concepts, approve proofs, review curves, pick music or run commands.
This policy supersedes older approval/owner-review wording for ordinary creative decisions.

## Agent responsibilities, end to end

1. Read the current request and STATUS; infer missing audience, CTA and creative choices from the
   provided subject. Record reasonable assumptions internally. Pick one direction autonomously.
2. Translate the placement into one delivery. These are studio defaults, not official platform specs:

| Owner placement | Working canvas |
|---|---|
| Facebook / Instagram Reels or YouTube Shorts | 1080×1920, 9:16 |
| Normal YouTube video | 1920×1080, 16:9 |
| Facebook portrait feed | 1080×1350, 4:5 |
| Square post/video | 1080×1080, 1:1 |

Use explicit owner dimensions/duration/fps when supplied; otherwise default 30 fps. Adapt composition
for that canvas; do not letterbox a landscape layout into a portrait request. Leave safe spacing for
UI overlays using the studio's placement guidance and disclosed limitations, not an invented guarantee.
3. The AGENT writes BRIEF, config, production plan and asset/rights records. New film configs use
   ownerRequest: {delivery, w, h, duration, fps}. buildOptions validates the exact target and selects
   that one delivery automatically, including final; extra or mismatched deliveries are refused.
4. If a reference exists, analyze it; open actual suggested evidence/playback, complete the prepared
   private review draft, use one observation per important decision with multiple topics, author the
   original-direction brief and apply review/direct. All this paperwork is the agent's responsibility.
   No reference supplied: skip reference analysis entirely.
5. Choose original assets/composition, create hook/proof/payoff frames and the short proof internally.
   Approve the direction yourself against the brief; do not stop for ordinary creative sign-off.
6. Build and inspect picture and sound. Measure duration/canvas/fps/readability/audio AND inspect
   actual exported frames/playback/listen when available. Numerical gates alone cannot establish taste.
7. Perform one separate judging pass; use a fresh reviewer if the host supports it. At most two total
   correction rounds for reproducible blockers/major issues, targeted to changed ranges.
8. Export one full final delivery, update status/ledger/docs, and give the owner ONE video link,
   with a short Arabic completion message. Drafts, evidence, reports, internal master/share variants,
   thumbnails and logs remain internal. Choose the suitable final/share file; never mislabel a preview.

Only a genuinely essential unavailable input or dependency may block work. Use truthful graphic
staging when a flat photo cannot support a new viewpoint. Never fabricate product facts or declare
unseen/unheard work verified. Exhaust available authorized tool options before reporting a blocker;
do not replace an unfinished film with a checklist for the owner.

## Host/model boundary

This repository is the production toolkit and instructions used BY the owner's Claude Code agent.
It does not invoke or switch an Opus model on its own. The host supplies the model, reasoning and
viewing/audio tools. Do not claim the repository has launched Opus or completed a film unless the
actual host run/render/export proves it. The owner must not be asked to operate internal production
steps; model/tool availability limits must be reported truthfully if they prevent completion.
