import { build } from 'esbuild';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';

rmSync('demo-dist', { recursive: true, force: true });
mkdirSync('demo-dist', { recursive: true });
await build({
  entryPoints: ['demo/app.ts'],
  bundle: true,
  format: 'iife',
  target: 'es2022',
  platform: 'browser',
  outfile: 'demo-dist/app.js',
  legalComments: 'none',
  logLevel: 'info',
});
for (const f of ['index.html', 'style.css']) copyFileSync(`demo/${f}`, `demo-dist/${f}`);
