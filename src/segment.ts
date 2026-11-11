import type { Sentence } from './types.js';

/**
 * Splits a document into sentences without changing offsets.
 *
 * Skip zones (fenced code, inline code, URLs, e-mail addresses, file names) are
 * blanked with spaces in `masked`, so rules never see them but offsets still
 * line up with the original text.
 */

const FILE_EXT =
  'pdf|docx?|xlsx?|pptx?|csv|md|txt|json|ya?ml|png|jpe?g|gif|svg|zip|html?|css|jsx?|tsx?|py|sql|sh';

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"'`)\]]*[^\s<>"'`)\].,;:!?]/gi;
const EMAIL_RE = /(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;
// At most 16 dotted segments before the extension: unbounded repetition made long dotted chains quadratic.
const FILE_RE = new RegExp(`\\b[A-Za-z0-9_-]+(?:\\.[A-Za-z0-9_-]+){0,16}\\.(?:${FILE_EXT})\\b`, 'gi');
const INLINE_CODE_RE = /`[^`\n]+`/g;

function blank(s: string, re: RegExp): string {
  return s.replace(re, (m) => m.replace(/[^\n]/g, ' '));
}

function maskFences(text: string): string {
  const out: string[] = [];
  let inFence = false;
  let fenceMark = '';
  for (const line of text.split('\n')) {
    const t = line.trimStart();
    const m = /^(```|~~~)/.exec(t);
    if (!inFence && m) {
      inFence = true;
      fenceMark = m[1] as string;
      out.push(line.replace(/[^\r]/g, ' '));
    } else if (inFence) {
      if (t.startsWith(fenceMark)) inFence = false;
      out.push(line.replace(/[^\r]/g, ' '));
    } else {
      out.push(line);
    }
  }
  return out.join('\n');
}

/** Returns a string of identical length with skip zones replaced by spaces. */
export function maskSkipZones(text: string): string {
  let s = maskFences(text);
  s = blank(s, INLINE_CODE_RE);
  s = blank(s, URL_RE);
  s = blank(s, EMAIL_RE);
  s = blank(s, FILE_RE);
  return s;
}

// Words that end in "." without ending a sentence (lower case, without the final dot).
const ABBREVIATIONS = new Set([
  'e.g', 'i.e', 'vs', 'mr', 'mrs', 'ms', 'dr', 'prof', 'inc', 'ltd', 'co', 'approx',
  'fig', 'u.s', 'cf', 'ca', 'est', 'min', 'max',
]);

interface Range {
  start: number;
  end: number;
  /** Table cells: the index of the line (row) they sit on. */
  row?: number;
  /** The block is a markdown heading. */
  heading?: boolean;
}

// Also multi-level clause numbers ("1.1 The ...", "2.2 25% on ..."), only when a capital letter or a percentage follows, so "1.5 million users" stays text.
const BULLET_RE = /^(\s*)(?:[-*+•]|\d{1,3}[.)]|\d{1,3}(?:\.\d{1,3})+(?=\s+(?:[A-Z(\[]|\d+\s*%)))\s+/;
const KEY_VALUE_RE = /^\s*[A-Z][A-Za-z\/& -]{1,24}:\s+\S/;
const HEADING_RE = /^(\s{0,3})#{1,6}\s+/;
const TABLE_SEP_CELL_RE = /^\s*:?-{2,}:?\s*$/;

/** Splits the document into blocks: paragraphs, bullets, headings, table cells. */
function findBlocks(masked: string): Range[] {
  const blocks: Range[] = [];
  let current: Range | null = null;
  const flush = (): void => {
    if (current) blocks.push(current);
    current = null;
  };

  let offset = 0;
  let prevLine = '';
  let lineNo = -1;
  for (const line of masked.split('\n')) {
    lineNo++;
    const lineStart = offset;
    const lineEnd = offset + line.length;
    offset = lineEnd + 1;

    if (line.trim() === '') {
      flush();
      prevLine = '';
      continue;
    }

    if (line.trimStart().startsWith('|')) {
      flush();
      prevLine = '';
      let cellStart = lineStart;
      const cells = line.split('|');
      for (const cell of cells) {
        const cellEnd = cellStart + cell.length;
        if (cell.trim() !== '' && !TABLE_SEP_CELL_RE.test(cell)) {
          blocks.push({ start: cellStart, end: cellEnd, row: lineNo });
        }
        cellStart = cellEnd + 1;
      }
      continue;
    }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      flush();
      prevLine = '';
      blocks.push({ start: lineStart + heading[0].length, end: lineEnd, heading: true });
      continue;
    }

    const bullet = BULLET_RE.exec(line);
    if (bullet) {
      flush();
      prevLine = line;
      current = { start: lineStart + bullet[0].length, end: lineEnd };
      continue;
    }

    // A short line with no closing punctuation, followed by a line that starts with a capital or digit, is a
    // list-like line (plain-text address block, term sheet), not a wrapped sentence. Wrapped prose lines are longer.
    const prev = prevLine.trim();
    // A "Key: value" line after another line is its own item (term sheets), whatever the length of the previous line.
    const keyValue = prev !== '' && KEY_VALUE_RE.test(line);
    const listLike = keyValue || (prev !== '' && prev.length <= 50 && !/[.!?:;,\-\u2013\u2014]$/.test(prev) && /^\s*[A-Z0-9]/.test(line));
    if (current && !listLike) {
      current.end = lineEnd;
    } else {
      flush();
      current = { start: lineStart, end: lineEnd };
    }
    prevLine = line;
  }
  flush();
  return blocks;
}

/** Finds sentence boundaries inside one block of masked text. Returns ranges relative to the document. */
function splitBlock(masked: string, block: Range): Range[] {
  const segment = masked.slice(block.start, block.end);
  const ranges: Range[] = [];
  let from = 0;
  const re = /(?<![.!?])[.!?]+["'’”)\]*_]*(?=\s)/g; // lookbehind: start only at the beginning of a punctuation run (avoids quadratic retries)
  let m: RegExpExecArray | null;
  while ((m = re.exec(segment)) !== null) {
    const end = m.index + m[0].length;
    // Next non-space character decides whether a new sentence starts.
    let k = end;
    while (k < segment.length && /\s/.test(segment[k] as string)) k++;
    const next = k < segment.length ? (segment[k] as string) : '';
    // A writer who starts sentences in lower case (chat style) also continues them in lower case.
    const current = segment.slice(from).trimStart()[0] ?? '';
    const startsSentence = next === '' || /[A-Z0-9"'“‘([]/.test(next) || (/[a-z]/.test(current) && /[a-z]/.test(next));
    if (!startsSentence) continue;

    if (m[0].startsWith('.')) {
      const before = segment.slice(Math.max(0, m.index - 24), m.index);
      const w = /([A-Za-z][A-Za-z.]*)$/.exec(before);
      if (w) {
        const word = (w[1] as string).toLowerCase();
        if (ABBREVIATIONS.has(word)) continue;
        if (word === 'no' && /[0-9]/.test(next)) continue;
        if (word === 'etc' && !/[A-Z]/.test(next) && next !== '') continue;
      }
    }
    ranges.push({ start: block.start + from, end: block.start + end });
    from = end;
  }
  if (from < segment.length) ranges.push({ start: block.start + from, end: block.end });
  return ranges;
}

/** Splits `text` into sentences. Offsets refer to the original string. */
export function segment(text: string): Sentence[] {
  const masked = maskSkipZones(text);
  const sentences: Sentence[] = [];
  const blocks = findBlocks(masked);
  blocks.forEach((block, blockIndex) => {
    for (const r of splitBlock(masked, block)) {
      let s = r.start;
      let e = r.end;
      while (s < e && /\s/.test(text[s] as string)) s++;
      while (e > s && /\s/.test(text[e - 1] as string)) e--;
      if (e <= s) continue;
      const maskedPart = masked.slice(s, e);
      if (!/[A-Za-z0-9]/.test(maskedPart)) continue;
      sentences.push({
        index: sentences.length,
        block: blockIndex,
        ...(block.row !== undefined ? { row: block.row } : {}),
        ...(block.heading ? { heading: true } : {}),
        text: text.slice(s, e),
        masked: maskedPart,
        start: s,
        end: e,
      });
    }
  });
  return sentences;
}
