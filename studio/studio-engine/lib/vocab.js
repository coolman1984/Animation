// Studio Engine — the spec's closed word lists, in ONE place (audit R1): the linter, the player, the score, the catalog and the
// MCP hints read them here, so a typo is an error with the allowed words instead of a silent fallback. DOM-free.
export const ELEMENTS = ['words', 'stack', 'extrude', 'lockup', 'storm', 'slice', 'cards', 'ring', 'pill', 'wipes', 'slab', 'hosts', 'mark', 'sparks', 'shape', 'path', 'icon', 'image', 'ribbon', 'cursor', 'painted', 'caption'];
export const SECTIONS = ['intro', 'verse', 'build', 'drop', 'chorus', 'drop2', 'finale', 'breath', 'hosts'];   // scene.music
export const TRANSITIONS = ['cut', 'fade', 'wipe', 'flash', 'smash'];
export const BACKGROUNDS = ['room', 'blue', 'ink', 'light'];                                                     // spec.background
export const CHORD_NAMES = ['Am', 'F', 'C', 'G', 'Dm', 'Em', 'E', 'D', 'Bb'];
export const HOOK_NAMES = ['pop332'];                                                                              // others use the automatic hook
