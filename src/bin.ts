#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { run } from './cli.js';

const code = run(process.argv.slice(2), {
  stdout: (s) => process.stdout.write(s),
  stderr: (s) => process.stderr.write(s),
  readStdin: () => readFileSync(0, 'utf8'),
});
process.exitCode = code;
