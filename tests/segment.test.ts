import { describe, expect, it } from 'vitest';
import { segment } from '../src/index.js';

const texts = (s: string): string[] => segment(s).map((x) => x.text);

describe('segment', () => {
  it('splits on sentence punctuation followed by a capital', () => {
    expect(texts('First one. Second one! Third one?')).toEqual(['First one.', 'Second one!', 'Third one?']);
  });

  it('does not split on abbreviations, decimals or version numbers', () => {
    expect(texts('Use e.g. a form, i.e. a simple one. Version 1.2 ships in Q3.')).toEqual([
      'Use e.g. a form, i.e. a simple one.',
      'Version 1.2 ships in Q3.',
    ]);
  });

  it('keeps "etc." with its sentence only when no capital follows', () => {
    expect(texts('Login, payments, etc. and more are included.')).toEqual(['Login, payments, etc. and more are included.']);
    expect(texts('Login, payments, etc. The app is fast.')).toEqual(['Login, payments, etc.', 'The app is fast.']);
  });

  it('treats each bullet, heading and table cell as its own block', () => {
    const doc = ['# Scope', '', '- Login', '- Payments', '', '| Item | Note |', '| --- | --- |', '| Search | Fast |'].join('\n');
    expect(texts(doc)).toEqual(['Scope', 'Login', 'Payments', 'Item', 'Note', 'Search', 'Fast']);
  });

  it('joins soft-wrapped lines of one paragraph', () => {
    expect(texts('The app will be\nbuilt in two phases.')).toEqual(['The app will be\nbuilt in two phases.']);
  });

  it('keeps offsets pointing into the original text', () => {
    const doc = '  Intro line.\r\n\r\n- Bullet one.  Second sentence here.\n';
    for (const s of segment(doc)) {
      expect(doc.slice(s.start, s.end)).toBe(s.text);
      expect(s.masked).toHaveLength(s.text.length);
    }
  });

  it('masks fenced code, inline code, URLs, e-mail addresses and file names', () => {
    const doc = [
      'See `fast()` and https://seamless.example.com/robust. Mail fast@robust.example now.',
      '',
      '```',
      'robust seamless fast',
      '```',
      '',
      'Open report-final.pdf please.',
    ].join('\n');
    const masked = segment(doc).map((s) => s.masked).join(' ');
    for (const word of ['fast()', 'seamless', 'robust', 'report-final.pdf']) expect(masked).not.toContain(word);
    expect(masked).toContain('Open');
  });

  it('returns nothing for empty or symbol-only input', () => {
    expect(segment('')).toEqual([]);
    expect(segment('---\n***\n')).toEqual([]);
  });
});
