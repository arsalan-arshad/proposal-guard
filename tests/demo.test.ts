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
    const loaded = srcs.filter((s) => !/^https:\/\/(?:github\.com\/arsalan-arshad\/proposal-guard(?:\/blob\/main\/docs\/EVALUATION\.md)?|arsalandev\.studio(?:\/work\/proposal-guard)?)$/.test(s));
    expect(loaded.sort()).toEqual([
      'app.js',
      'assets/banner-1280.jpg',
      'assets/icon-180.png',
      'assets/icon-32.png',
      'assets/icon-64.png',
      'compare.html',
      'index.html',
      'style.css',
      'suggest.html',
    ].sort());
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

  const BANNED = ['XMLHttpRequest', 'sendBeacon', 'WebSocket', 'EventSource', 'localStorage', 'sessionStorage', 'indexedDB', 'document.cookie', 'innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'eval(', 'new Function'];
  const bundle = async (entry: string): Promise<string> => {
    const out = await build({ entryPoints: [`demo/${entry}`], bundle: true, format: 'iife', platform: 'browser', write: false, logLevel: 'silent' });
    return out.outputFiles[0]?.text ?? '';
  };

  it('none of the three pages has any network, storage or HTML-injection API', async () => {
    for (const entry of ['app.ts', 'compare.ts', 'suggest.ts']) {
      const code = await bundle(entry);
      for (const banned of [...BANNED, 'fetch(', 'googleapis', 'x-goog-api-key']) expect(code.includes(banned), `${entry}: ${banned}`).toBe(false);
      expect(code.match(/https?:\/\/[A-Za-z0-9.-]+/g) ?? [], entry).toEqual([]);
    }
  });

  it('the scan tab is the 0.2.0 page: it imports only scan, the rule list and the segment helper', () => {
    const app = readFileSync('demo/app.ts', 'utf8');
    expect(app).toContain("import { DISCLAIMER_SHORT, RULE_INFO, scan } from '../src/index.js';");
    expect(app).not.toMatch(/compare\(|\/compare|suggest\.js|\/suggest|gemini|reference/i);
    const h = readFileSync('demo/index.html', 'utf8');
    expect(h.match(/<textarea/g)).toHaveLength(1);
    expect(h).not.toMatch(/id="reference"|Client's job post or contract \(optional\)/);
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
    expect(report).toMatch(new RegExp(`it found ${found} of the ${expected} findings the labellers? expected`));
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
  type Rule = { source: string; headers: Array<{ key: string; value: string }> };
  const cfg = JSON.parse(readFileSync('demo/serve.json', 'utf8')) as { headers: Rule[] };
  const rules = (source: string): Record<string, string> => Object.fromEntries(cfg.headers.filter((h) => h.source === source).flatMap((h) => h.headers.map((x) => [x.key, x.value])));
  const common = rules('**');
  /** The policy a page gets from the header file: a rule for the page, else the catch-all rule. */
  const headerCsp = (page: string): string => rules(page)['Content-Security-Policy'] ?? common['Content-Security-Policy'] ?? '';
  const metaCsp = (page: string): string => /Content-Security-Policy" content="([^"]+)"/.exec(readFileSync(`demo/${page}`, 'utf8'))?.[1] ?? '';
  const dirs = (p: string): Map<string, string> => new Map(p.split(';').map((d) => d.trim()).filter(Boolean).map((d) => [d.split(' ')[0] as string, d]));

  it('is valid, applies to every path, and sets the expected headers', () => {
    for (const k of ['Content-Security-Policy', 'Strict-Transport-Security', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy', 'Cross-Origin-Opener-Policy', 'Cross-Origin-Resource-Policy']) {
      expect(common[k], k).toBeTruthy();
    }
    expect(common['X-Content-Type-Options']).toBe('nosniff');
    expect(common['X-Frame-Options']).toBe('DENY');
  });

  it('every page: the header policy matches its meta policy, adds frame blocking, and allows no unsafe source', () => {
    for (const page of ['index.html', 'compare.html', 'suggest.html']) {
      const h = dirs(headerCsp(page));
      for (const [name, value] of dirs(metaCsp(page))) expect(h.get(name), `${page} ${name}`).toBe(value);
      expect(h.get('frame-ancestors'), page).toBe("frame-ancestors 'none'");
      expect(headerCsp(page), page).not.toMatch(/unsafe-|\*/);
    }
  });

  it('all three pages forbid every connection, in the page and in the header file', () => {
    for (const page of ['index.html', 'compare.html', 'suggest.html']) {
      expect(dirs(metaCsp(page)).get('connect-src'), page).toBe("connect-src 'none'");
      expect(dirs(headerCsp(page)).get('connect-src'), page).toBe("connect-src 'none'");
    }
    expect(JSON.stringify(cfg)).not.toMatch(/googleapis|generativelanguage/);
  });

  it('each page loads only its own script, and every page has the same three tabs', () => {
    const scripts = { 'index.html': 'app.js', 'compare.html': 'compare.js', 'suggest.html': 'suggest.js' } as const;
    for (const [page, script] of Object.entries(scripts)) {
      const h = readFileSync(`demo/${page}`, 'utf8');
      expect([...h.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1])).toEqual([script]);
      expect(h).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/i);
      expect(h).not.toMatch(/\bon[a-z]+\s*=/i);
      for (const target of Object.keys(scripts)) expect(h).toContain(`href="${target}"`);
      expect(h.match(/aria-current="page"/g)).toHaveLength(1);
    }
  });

  it('the prompt page sends nothing, has no key field, and says what it adds and does not add', () => {
    const h = readFileSync('demo/suggest.html', 'utf8');
    expect(h).toMatch(/What leaves your device: nothing/);
    expect(h).toMatch(/Why not just use Gemini, ChatGPT or Claude directly/);
    expect(h).toMatch(/We do not claim better writing/);
    expect(h).toMatch(/When to skip this/);
    expect(h).toMatch(/Not legal advice/);
    expect(h).not.toMatch(/type="password"|api key|id="key"|id="send"|googleapis|generativelanguage/i);
    expect(h).not.toMatch(/\b(?:compliant|guaranteed?|protected)\b/i);
    expect(h).toMatch(/id="copy"/);
  });

  it('the demo build copies the pages and serve.json', () => {
    const b = readFileSync('demo/build.mjs', 'utf8');
    for (const f of ["'serve.json'", "'compare.html'", "'suggest.html'", "'compare.ts'", "'suggest.ts'"]) expect(b).toContain(f);
  });
});

describe('README evaluation section', () => {
  const readme = readFileSync('README.md', 'utf8');

  it('has exactly one results table (stale tables from earlier rounds must not accumulate)', () => {
    expect(readme.split('\n').filter((l) => l.startsWith('| All |'))).toHaveLength(1);
    expect(readme.split('\n').filter((l) => l.startsWith('| Rule | Reported findings'))).toHaveLength(1);
  });

  it('every table row is well formed (a stray separator would break the rendering)', () => {
    const table = readme.split('\n').filter((l) => l.startsWith('|'));
    for (const l of table) expect(l.endsWith('|'), l).toBe(true);
  });

  it('credits the author and links the case study', () => {
    expect(readme).toContain('https://arsalandev.studio/work/proposal-guard');
    expect(readFileSync('demo/index.html', 'utf8')).toContain('https://arsalandev.studio/work/proposal-guard');
  });
});

describe('README compare section', () => {
  const readme = readFileSync('README.md', 'utf8');
  const report = readFileSync('docs/EVALUATION.md', 'utf8');

  it('quotes the same compare figures as docs/EVALUATION.md', () => {
    // report rows: | CMP-01 | what | reported | correct (precision) | expected | found (recall) | bar |
    for (const [id, reported, correct, expected] of [['CMP-01', 19, 16, 22], ['CMP-02', 11, 6, 6], ['CMP-03', 7, 7, 7]] as const) {
      const row = report.split('\n').find((l) => l.startsWith(`| ${id} |`)) as string;
      expect(row, id).toContain(`| ${reported} | ${correct} (`);
      expect(row, id).toContain(`| ${expected} | ${correct} (`);
      expect(readme, id).toContain(`| ${correct} of ${reported} | ${correct} of ${expected} |`);
    }
  });

  it('the README table does not start with the single-document results header, so that table stays unique', () => {
    expect(readme.split('\n').filter((l) => l.startsWith('| Check | Reported findings'))).toHaveLength(1);
  });
});
