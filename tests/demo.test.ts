import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import { describe, expect, it } from 'vitest';
import { scan } from '../src/index.js';
import { toSegments } from '../demo/render.js';

describe('demo rendering', () => {
  it('segments cover the whole text exactly, in order', () => {
    const text = 'Intro line.\n\nThe app will be fast and seamless.\n\nUnlimited revisions are included.\n';
    const r = scan(text);
    const segs = toSegments(text, r.findings);
    expect(segs.map((s) => s.text).join('')).toBe(text);
    expect(segs.some((s) => s.findings.length > 0)).toBe(true);
    for (const s of segs.filter((x) => x.findings.length > 0)) {
      for (const i of s.findings) expect(r.findings[i]?.sentence ?? '').toContain(s.text.trim().slice(0, 5));
    }
  });

  it('returns one plain segment when there are no findings, and handles empty text', () => {
    expect(toSegments('Hello.', [])).toEqual([{ text: 'Hello.', findings: [] }]);
    expect(toSegments('', [])).toEqual([]);
  });

  it('merges findings that share or overlap a sentence', () => {
    const text = 'We will build it fast, with unlimited revisions as needed.';
    const r = scan(text);
    const segs = toSegments(text, r.findings);
    expect(segs.map((s) => s.text).join('')).toBe(text);
  });
});

describe('demo makes no outside requests and stores nothing', () => {
  const html = readFileSync('demo/index.html', 'utf8');

  it('page has a content-security-policy that blocks connections and inline script', () => {
    expect(html).toMatch(/Content-Security-Policy/);
    expect(html).toMatch(/default-src 'none'/);
    expect(html).toMatch(/connect-src 'none'/);
    expect(html).toMatch(/script-src 'self'/);
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/i);
    expect(html).not.toMatch(/\bon[a-z]+\s*=/i);
  });

  it('page loads only its own script and stylesheet', () => {
    const srcs = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)].map((m) => m[1] as string);
    const loaded = srcs.filter((s) => !/^https:\/\/(?:github\.com\/arsalan-arshad\/proposal-guard|arsalandev\.studio)$/.test(s));
    expect(loaded.sort()).toEqual(['app.js', 'style.css']);
  });

  it('bundle does not use network, storage or HTML-injection APIs', async () => {
    const out = await build({ entryPoints: ['demo/app.ts'], bundle: true, format: 'iife', platform: 'browser', write: false, logLevel: 'silent' });
    const code = out.outputFiles[0]?.text ?? '';
    for (const banned of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'EventSource', 'localStorage', 'sessionStorage', 'indexedDB', 'document.cookie', 'innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'eval(', 'new Function']) {
      expect(code.includes(banned), banned).toBe(false);
    }
  });
});
