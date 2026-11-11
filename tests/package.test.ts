import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { run } from '../src/cli.js';
import { VERSION } from '../src/version.js';

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as Record<string, any>;

describe('package metadata', () => {
  it('the version the CLI and MCP server report is the package.json version', () => {
    expect(VERSION).toBe(pkg['version']);
    let out = '';
    expect(run(['--version'], { stdout: (s) => (out += s), stderr: () => undefined, readStdin: () => '' })).toBe(0);
    expect(out.trim()).toBe(pkg['version']);
  });

  it('is ready to publish: public, MIT, repository set, only dist and docs shipped', () => {
    expect(pkg['private']).toBeUndefined();
    expect(pkg['license']).toBe('MIT');
    expect(pkg['repository']?.url).toContain('github.com/arsalan-arshad/proposal-guard');
    expect(pkg['files']).toEqual(['dist', 'LICENSE', 'README.md']);
    expect(pkg['version']).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('the scanner has no runtime dependencies; the MCP packages are optional peers', () => {
    expect(pkg['dependencies']).toBeUndefined();
    expect(Object.keys(pkg['peerDependencies']).sort()).toEqual(['@modelcontextprotocol/server', 'zod']);
    for (const k of Object.keys(pkg['peerDependencies'])) expect(pkg['peerDependenciesMeta'][k].optional).toBe(true);
  });

  it('every bin entry points into dist and has a source file', () => {
    for (const target of Object.values(pkg['bin'] as Record<string, string>)) {
      const m = /^(?:\.\/)?dist\/(.+)\.js$/.exec(target);
      expect(m, target).not.toBeNull();
      expect(() => readFileSync(`src/${(m as RegExpExecArray)[1]}.ts`, 'utf8'), target).not.toThrow();
    }
  });

  it('the prepublish script runs typecheck, tests and build', () => {
    expect(pkg['scripts']['prepublishOnly']).toBe('npm run typecheck && npm test && npm run build');
  });
});
