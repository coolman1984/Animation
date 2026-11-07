import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const tools = JSON.parse(readFileSync(new URL('./research-upstreams.json', import.meta.url)));
const [id, destination] = process.argv.slice(2);
if (!id || id === 'list') {
  console.table(tools);
} else {
  const tool = tools.find(entry => entry.id === id);
  if (!tool || !destination) throw new Error('Usage: node studio/toolkit/research-upstreams.mjs <id> <new-directory>');
  const directory = resolve(destination);
  if (existsSync(directory)) throw new Error('Choose a new directory outside the production repository.');
  const git = args => execFileSync('git', args, { stdio: 'inherit', timeout: 180000 });
  git(['init', directory]);
  git(['-C', directory, 'fetch', '--depth=1', '--no-tags', tool.url, tool.commit]);
  git(['-C', directory, 'checkout', '--detach', tool.commit]);
}
