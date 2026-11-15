import { build } from 'esbuild';
import { cpSync, copyFileSync, mkdirSync, rmSync } from 'node:fs';

rmSync('demo-dist', { recursive: true, force: true });
mkdirSync('demo-dist', { recursive: true });
// Three pages (tabs): index = scan as in 0.2.0, compare, suggest. Separate pages so that the first two keep a policy that forbids all network access.
for (const [entry, out] of [['app.ts', 'app.js'], ['compare.ts', 'compare.js'], ['suggest.ts', 'suggest.js']]) {
  await build({
    entryPoints: [`demo/${entry}`],
    bundle: true,
    format: 'iife',
    target: 'es2022',
    platform: 'browser',
    outfile: `demo-dist/${out}`,
    legalComments: 'none',
    logLevel: 'info',
  });
}
for (const f of ['index.html', 'compare.html', 'suggest.html', 'style.css', 'serve.json']) copyFileSync(`demo/${f}`, `demo-dist/${f}`);
cpSync('demo/assets', 'demo-dist/assets', { recursive: true });
