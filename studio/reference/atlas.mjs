// Observable signatures permit several implementations. Confidence is supplied per observation.
export const TECHNIQUE_ATLAS = [
  ['dom-transform','Rigid translation/scale/rotation of flat elements','Timeline-based DOM transforms: GSAP, WAAPI, CSS or equivalent','kinetics.js + cinema.js',['Canvas transforms','composited footage']],
  ['svg-mask','A stable silhouette reveals another layer','SVG mask or clip-path reveal','transitions.js maskedReveal / fx.js',['raster alpha matte','editorial wipe']],
  ['canvas-particles','Many small sprites follow repeatable trajectories','Canvas procedural particles','particles.js',['WebGL particles','pre-rendered footage']],
  ['css-filter','Softness/glow/color varies over a flat layer','CSS filter or compositing pass','depth.js / fx.js',['lens optics','shader','postproduction']],
  ['layer-parallax','Foreground/background show different coherent motion rates','2.5D planes driven by a shared camera','depthScene + projectLayer',['physical 3D camera','independent 2D translations']],
  ['webgl-scene','Perspective, occlusion and changing specular surfaces','Three.js/WebGL or another 3D renderer','gpu.js; external engine only for required true 3D',['rendered 3D footage','careful 2.5D illusion']],
  ['shader-distortion','Continuous deformation of the image field','Shader-like displacement/refraction','gpu.js',['animated mesh','pre-rendered distortion']],
  ['procedural-gradient','Smooth evolving fields without photographic detail','Procedural gradients/noise','motion.js / kinetics.js fbm',['video texture','shader']],
  ['kinetic-type','Word/line/character units reveal with coherent timing','Masked/blur/translate/scale stagger','typography.js textBlock/reveal/counter',['motion graphics footage','SVG text paths']],
  ['motion-blur','Trailing directional smear increases with movement','Motion blur simulation or shutter integration','transitions.js cameraPass / fx.js',['optical shutter blur','frame blending']],
  ['animated-svg','Stroke/path evolves continuously','Animated SVG path/dash or morph','kinetics.js morphPath',['Canvas drawing','pre-rendered vector animation']],
  ['foreground-wipe','A foreground silhouette covers the cut while moving','Occlusion-based handoff','transitions.js foregroundWipe + depth.js',['editorial matte','single camera passing a real object']],
  ['depth-focus','Foreground/background blur changes while hero stays coherent','Depth-of-field / rack-focus simulation','cinema.js rackFocus + depthScene',['physical focus pull','masked CSS blur']],
  ['shadow-contact','A grounded shadow tracks a subject','Contact-plane shadow or composited shadow layer','depth.js contactShadow',['physical lighting','painted plate']],
  ['light-atmosphere','Veil/glow/particles change contrast and attention','Light overlays, grain, atmosphere or particles','depth.js atmosphere + particles.js + gpu.js',['real fog','practical lighting','video overlay']],
  ['reflection','A secondary image responds to the main subject','Reflection layer, shader or physical material','gpu.js; neutral graphic reflection',['photographed reflection','mirrored 2D layer']],
];
export const TRANSITION_FAMILIES = {
  'hard editorial cut':'cut', dissolve:'dissolve', 'foreground occlusion':'foregroundWipe', 'object wipe':'foregroundWipe',
  'mask wipe':'maskedReveal', 'shape transition':'shapeMatch', 'light wipe':'lightWipe', 'blur transition':'cameraPass',
  'focus handoff':'focusHandoff', 'zoom handoff':'zoomContinuation', 'directional continuation':'push',
  'match cut':'matchCut', 'camera pass':'cameraPass', 'graphic morph':'shapeMatch',
};
