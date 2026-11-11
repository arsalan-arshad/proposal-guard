import { readFileSync, statSync } from 'node:fs';
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

  it('page loads only its own script, stylesheet and bundled images', () => {
    const srcs = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)].map((m) => m[1] as string);
    const loaded = srcs.filter((s) => !/^https:\/\/(?:github\.com\/arsalan-arshad\/proposal-guard(?:\/blob\/main\/docs\/EVALUATION\.md)?|arsalandev\.studio)$/.test(s));
    expect(loaded.sort()).toEqual([
      'app.js',
      'assets/banner-1280.jpg',
      'assets/icon-180.png',
      'assets/icon-32.png',
      'assets/icon-64.png',
      'style.css',
    ]);
    for (const s of loaded) expect(s).not.toMatch(/^[a-z]+:|^\/\//i);
  });

  it('every referenced image exists, is a modest size, and images are only allowed from the page itself', () => {
    expect(html).toMatch(/img-src 'self'/);
    for (const m of html.matchAll(/\bsrc="(assets\/[^"]+)"/g)) {
      expect(statSync(`demo/${m[1]}`).size, m[1]).toBeLessThan(200_000);
    }
  });

  it('images have alt text that makes no safety or accuracy claim', () => {
    const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
    expect(imgs.length).toBeGreaterThan(0);
    for (const img of imgs) expect(img).toMatch(/\balt="/);
    expect(html.match(/<img class="hero"[^>]*alt="([^"]*)"/)?.[1] ?? '').not.toMatch(/\b(?:safe|compliant|protected|guarantee|verified|accurate)/i);
  });

  it('bundle does not use network, storage or HTML-injection APIs', async () => {
    const out = await build({ entryPoints: ['demo/app.ts'], bundle: true, format: 'iife', platform: 'browser', write: false, logLevel: 'silent' });
    const code = out.outputFiles[0]?.text ?? '';
    for (const banned of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'EventSource', 'localStorage', 'sessionStorage', 'indexedDB', 'document.cookie', 'innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'eval(', 'new Function']) {
      expect(code.includes(banned), banned).toBe(false);
    }
  });
});

describe('quoted evaluation figures match the report', () => {
  const html = readFileSync('demo/index.html', 'utf8');
  const report = readFileSync('docs/EVALUATION.md', 'utf8');
  const readme = readFileSync('README.md', 'utf8');

  it('the demo page quotes the same headline figures as docs/EVALUATION.md', () => {
    const m = /(\d+) of the (\d+) findings it reported were correct, and it found (\d+) of the (\d+) findings/.exec(html);
    expect(m).not.toBeNull();
    const [, tp, reported, found, expected] = m as RegExpExecArray;
    expect(tp).toBe(found);
    expect(report).toContain(`${tp} of the ${reported} findings the tool reported were correct`);
    expect(report).toContain(`it found ${found} of the ${expected} findings the labeller expected`);
  });

  it('the README table total matches the same figures', () => {
    const m = /(\d+) of the (\d+) findings it reported were correct, and it found (\d+) of the (\d+) findings/.exec(html) as RegExpExecArray;
    expect(readme).toContain(`| All | ${m[1]} of ${m[2]} | ${m[3]} of ${m[4]} |`);
  });
});

describe('light theme', () => {
  const css = readFileSync('demo/style.css', 'utf8');

  it('is light for everyone: no dark-mode override, and the page declares a light colour scheme', () => {
    expect(css).not.toMatch(/prefers-color-scheme/);
    expect(css).toMatch(/color-scheme:\s*light/);
    expect(css).toMatch(/--bg:\s*#fff(?:fff)?\b/i);
  });

  it('text and accent colours keep at least WCAG AA contrast on the white and card backgrounds', () => {
    const vars = Object.fromEntries([...css.matchAll(/--([a-z]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2] as string]));
    const lum = (hex: string): number => {
      const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * (c[0] as number) + 0.7152 * (c[1] as number) + 0.0722 * (c[2] as number);
    };
    const ratio = (a: string, b: string): number => {
      const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m) as [number, number];
      return (x + 0.05) / (y + 0.05);
    };
    for (const fg of ['fg', 'muted', 'accent', 'high', 'med']) {
      for (const bg of ['bg', 'card']) expect(ratio(vars[fg] as string, vars[bg] as string), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
    expect(ratio('#ffffff', vars['accent'] as string)).toBeGreaterThanOrEqual(4.5); // white button text on the accent
  });
});

describe('security headers (serve.json)', () => {
  const cfg = JSON.parse(readFileSync('demo/serve.json', 'utf8')) as { headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }> };
  const all = Object.fromEntries((cfg.headers.find((h) => h.source === '**')?.headers ?? []).map((h) => [h.key, h.value]));

  it('is valid, applies to every path, and sets the expected headers', () => {
    for (const k of ['Content-Security-Policy', 'Strict-Transport-Security', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy', 'Cross-Origin-Opener-Policy', 'Cross-Origin-Resource-Policy']) {
      expect(all[k], k).toBeTruthy();
    }
    expect(all['X-Content-Type-Options']).toBe('nosniff');
    expect(all['X-Frame-Options']).toBe('DENY');
  });

  it('the header policy is at least as strict as the page meta policy and blocks framing', () => {
    const html = readFileSync('demo/index.html', 'utf8');
    const meta = /Content-Security-Policy" content="([^"]+)"/.exec(html)?.[1] ?? '';
    const header = all['Content-Security-Policy'] ?? '';
    const dirs = (p: string): Map<string, string> => new Map(p.split(';').map((d) => d.trim()).filter(Boolean).map((d) => [d.split(' ')[0] as string, d]));
    const h = dirs(header);
    for (const [name, value] of dirs(meta)) expect(h.get(name), name).toBe(value);
    expect(h.get('frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(header).not.toMatch(/unsafe-|\*/);
  });

  it('the demo build copies serve.json next to the page', () => {
    expect(readFileSync('demo/build.mjs', 'utf8')).toContain("'serve.json'");
  });
});
