# Decision ledger

2026-10-04: FORM / FUNCTION; spec-only film with reusable ribbon module. Per-face lighting/depth sorting; analytic independent-time geometry; CPU Canvas. Review pending.

## Acceptance — 2026-10-04
- Round 1: text boxes overlapped in type/choreography. Reduced sizes/spaced baselines; 24 stills and full text timeline now zero issues. Removed vignette; added motivated wipe and cursor/tile interaction.
- Proof: exported 0-8 s review take01; every gate PASS; actual 3.7-4.4 s wipe examined as a 20 fps strip.
- Final preflight: invalid craft layer name canvas rejected before capture. Corrected declared layers to 3d/ui; gates retained. Final output take02: 32.000 s, 1920x1080, 30 fps; -14 LUFS, TP -7.4 dBTP, LRA 2.1 LU; 11 export gates PASS; dense text zero issues.
- Separate judging pass after export: uniformly sampled full-film contact sheet, all seven boundaries and full-resolution payoff/type inspected. Hook, material hierarchy, reading windows, cursor causality and identity resolve accepted. Faceted surface is intentional procedural material, not a product photograph. Repeated locked-stage camera warning is intentional; object rotation supplies motion/depth. Motif overlap warnings with older films are lexical, not artwork reuse.
- No blocker/major remains. Listening and real-speed human viewing unavailable. Sync's 0/0 eligible hard-hit result is not audible alignment proof; picture and score share the spec clock.
- Final deliverable remains local under studio/out/studio-engine/b-form-function-youtube/take02/. Source committed on the integrated isolated branch; user edits/media in the original checkout preserved.


## Source review corrections — 2026-10-04
The code review identified a boundary defect missed by the earlier acceptance pass: the hard-cut entry ramp exposed the underlying world on the exact cut frame. Player source now enters cuts fully opaque and keeps backing scenes through wipes/fades. Shape morphs retain prior geometry/color; delivery cannot ignore failed text/sync checks or reuse stale takes. See studio/CODE_REVIEW_2026-10-04.md for evidence.
Focused engine/shared tests pass and the check-only package rebuild passes. Existing take02 MP4s are unchanged and predate these fixes; exported pixels/listening were not reverified. Source-level boundary and morph regression checks pass. No full render was run for this code-review request, as required by the repository testing policy.
