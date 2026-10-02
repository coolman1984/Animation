---
name: reference-ingest
description: Acquire and sample authorized local videos, direct media URLs or normally playable webpage videos into a compact timestamped reference evidence pack.
---
# Reference ingest
Use `studio/reference.mjs analyze`. FFmpeg is primary for local/direct decodable media; Chromium/CDP is for HTML video playback. No protected stream extraction, DRM decryption, session-cookie export, access-control bypass or invented source evidence.
- Start from a supplied file/URL, or a previous rendered film file. For web players use `--browser`, optional `--selector=video` and `--frame=<iframe-url-fragment>`. A normal page may need an explicit player click; use `--play-selector` only for the supplied page's playback control.
- Browser ingest records video duration, native size, seekable ranges and actual currentTime/mediaTime. requestVideoFrameCallback is best effort; fallback timestamps are labelled. Canvas captures use native pixels when allowed; cross-origin taint falls back to the visible video element and records possible overlays.
- Stop for mediaKeys/encrypted media, missing access, nonseekable/live video, unsupported custom/canvas players or unresolved selection. Ask for an authorized local file only when necessary; do not fetch/decrypt protected manifests.
- Inspect job.json for DONE_MACHINE_PACK/BLOCKED. Limits: 300s reference, 128 MB URL download, 72 frame requests, <=12 detailed shots by default; machine analysis is low resolution, not model vision. Increase explicit budgets only for a justified request.
- Compare FFmpeg boundary candidates to strips: lighting/motion can false-trigger. `--scene-engine=python` uses optional PySceneDetect AdaptiveDetector; missing dependencies are explicit failures when requested, automatic motion has a labelled native fallback.
- Read evidence-pack.json first, contact sheets second, individual frames only where useful. Deduplication reuses visually redundant images in compact vision packs while retaining requested/decoded timestamps.
- Refine one <=2s region with `--reason` and 2–12 samples. Preserve prior evidence; never overwrite a reference pack.
