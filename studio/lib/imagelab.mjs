// Image lab: run canvas code inside headless Chromium to make plates (cut-outs, clean plates,
// logo extraction) with zero packages. The page gets helpers from imagelab-page.js; the job
// returns { name: dataURL } and every entry is written as a PNG.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

export async function runLab({ job, outDir, args = {} }) {
  const client = await launch({ width: 800, height: 600 });
  try {
    await client.goto(pathToFileURL(join(HERE, 'imagelab-page.html')).href);
    const src = readFileSync(job, 'utf8');
    const result = await client.eval(`(async () => { const job = ${src}; return await job(${JSON.stringify(args)}); })()`);
    mkdirSync(outDir, { recursive: true });
    const written = [];
    for (const [name, value] of Object.entries(result)) {
      if (typeof value === 'string' && value.startsWith('data:image/png;base64,')) {
        writeFileSync(join(outDir, `${name}.png`), Buffer.from(value.split(',')[1], 'base64'));
        written.push(`${name}.png`);
      } else {
        writeFileSync(join(outDir, `${name}.json`), JSON.stringify(value, null, 2));
        written.push(`${name}.json`);
      }
    }
    return written;
  } finally {
    await client.close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [job, outDir, argJson] = process.argv.slice(2);
  const written = await runLab({ job: resolve(job), outDir: resolve(outDir), args: argJson ? JSON.parse(argJson) : {} });
  console.log(written.join('\n'));
}
