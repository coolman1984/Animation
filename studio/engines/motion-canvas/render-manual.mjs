#!/usr/bin/env node
// Studio adapter, not a Motion Canvas command. 3.17.2 ships no headless renderer.
// Prints the editor steps and exits 2 so a film build cannot pretend a video was written.
import { motionCanvasManual } from '../../lib/engines.mjs';

const arg = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : '';
};
const variant = arg('variant') || 'landscape';
console.log(motionCanvasManual(variant).join('\n'));
console.log(`\nRequested output (not written): ${arg('out') || '(none)'}  ${arg('w') || '?'}x${arg('h') || '?'} @ ${arg('fps') || '?'} fps for ${arg('duration') || '?'} s`);
process.exit(2);
