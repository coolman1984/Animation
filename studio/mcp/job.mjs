#!/usr/bin/env node
// Background render job for the studio MCP server: runs one engine command, then appends "[exit N]" to its log.
//   node mcp/job.mjs <log> studio-engine/run.mjs <film> --stage=… (stdout/stderr already point at the log)
import { appendFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
const [log, ...args] = process.argv.slice(2);
const child = spawn(process.execPath, args, { stdio: ['ignore', 'inherit', 'inherit'], windowsHide: true });
child.on('error', (e) => { appendFileSync(log, `\n${e.message}\n[exit 1]\n`); process.exit(1); });
child.on('close', (code) => { appendFileSync(log, `\n[exit ${code ?? 1}]\n`); process.exit(code ?? 1); });
