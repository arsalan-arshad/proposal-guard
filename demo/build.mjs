import { build } from 'esbuild';
import { cpSync, copyFileSync, mkdirSync, rmSync } from 'node:fs';

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
for (const f of ['index.html', 'style.css', 'serve.json']) copyFileSync(`demo/${f}`, `demo-dist/${f}`);
cpSync('demo/assets', 'demo-dist/assets', { recursive: true });
