---
name: motion-forensics
description: Infer camera-like global movement, local object motion, possible depth/layers and perceptually equivalent easing from a reference film's measured motion and visually inspected frames.
---
# Motion forensics
Start with scientific-summary.json. Read only a justified time window of motion.json, then shots.json and the relevant transition strip; visually inspect motion playback and frames.
- Native fallback measures small grayscale translations and residual change. Optional OpenCV uses forward/backward LK features, RANSAC affine fitting, regional residuals and feature coverage. It is evidence, not automatic camera identification.
- Exclude pairs crossing cuts. Compare normalized displacement/second, acceleration, static holds, affine scale/rotation, inlier coverage and residuals. Invalid/weak tracking is unknown, not zero physical motion.
- A coherent global transform may be a push/pull/pan/truck, whole-composition scale/translation or composited footage. Local residuals may be moving objects, parallax, occlusion, changing light or tracking error. State alternatives.
- Look for coherent foreground/background rate differences, occluding masks, cut-outs, rack focus, contact shadows, atmosphere, particles, glow, grain, reflections and displacement. Record a probable layer stack only with evidence, confidence and reproduction instructions.
- Describe linear/ease-in/ease-out/smooth/overshoot/spring/damped/stepped/velocity-then-settle only when temporally supported. Exact easing or real 3D geometry cannot be recovered from these measurements.
- Classify transitions visually among the atlas families. Inspect before/during/after. A match cut requires correspondence in shape/framing/action; similar pixels alone do not establish intention.
- Study type roles/relative sizes/weight/alignment/RTL-LTR/line lengths/tracking/word-line-character staggering/reveal/exit timing and relationship to camera settling. No OCR/font identity claim from raw motion stats.
Map to cinema.js, kinetics.js, depth.js, transitions.js and typography.js first. Use a true 3D external engine only when an observed requirement makes native reproduction inefficient.
