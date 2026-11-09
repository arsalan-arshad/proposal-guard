import type { Term } from './types.js';

/** Shared helpers. All pattern sources avoid nested quantifiers so matching stays linear. */

/** True if the regex matches anywhere. Safe for global regexes (ignores lastIndex). */
export function has(re: RegExp, s: string): boolean {
  return s.search(re) !== -1;
}

/** All non-overlapping matches of a regex, as terms relative to `s`. */
export function findAll(re: RegExp, s: string): Term[] {
  // Patterns are module-level and global; reuse them (resetting lastIndex) instead of rebuilding per call.
  const g = re.global ? re : new RegExp(re.source, re.flags + 'g');
  const out: Term[] = [];
  g.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = g.exec(s)) !== null) {
    if (m[0].length === 0) {
      g.lastIndex++;
      continue;
    }
    out.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  }
  g.lastIndex = 0;
  return out;
}

export interface Span {
  start: number;
  end: number;
}

export function overlaps(a: Span, b: Span): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Sorts spans and merges overlapping ones into disjoint spans. O(n log n). */
export function mergeSpans(spans: Span[]): Span[] {
  const sorted = spans.map((s) => ({ start: s.start, end: s.end })).sort((a, b) => a.start - b.start);
  const out: Span[] = [];
  for (const s of sorted) {
    const last = out[out.length - 1];
    if (last && s.start <= last.end) last.end = Math.max(last.end, s.end);
    else out.push(s);
  }
  return out;
}

/** True if `item` overlaps any span of `merged` (output of mergeSpans). O(log n). */
export function overlapsMerged(merged: Span[], item: Span): boolean {
  let lo = 0;
  let hi = merged.length - 1;
  let idx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if ((merged[mid] as Span).start < item.end) {
      idx = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return idx !== -1 && (merged[idx] as Span).end > item.start;
}

/** Removes items that overlap any blocker. Linear-ish, safe for very long sentences. */
export function dropOverlapping<T extends Span>(items: T[], blockers: Span[]): T[] {
  if (blockers.length === 0) return items;
  const merged = mergeSpans(blockers);
  return items.filter((it) => !overlapsMerged(merged, it));
}

/** Leftmost-longest selection of non-overlapping matches. Result is sorted by start. */
export function leftmostLongest<T extends Span>(items: T[]): T[] {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: T[] = [];
  let lastEnd = -1;
  for (const it of sorted) {
    if (it.start >= lastEnd) {
      out.push(it);
      lastEnd = it.end;
    }
  }
  return out;
}

const NUMBER_WORD =
  '(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|a\\s+single|once|twice)';

export const NUM = `(?:\\d+|${NUMBER_WORD})`;

const NUMBER_RE = new RegExp(`\\d|\\b${NUMBER_WORD}\\b|\\ba\\s+(?:week|day)\\b`, 'i');

/**
 * The shared number test. Digits, English number words (one to twelve, twenty,
 * thirty), "a single", "once", "twice", "a week", "a day". Bracketed
 * placeholders such as [N] or [N1] never count.
 */
export function hasNumber(s: string): boolean {
  return NUMBER_RE.test(s.replace(/\[[^\]]*\]/g, ' '));
}

/**
 * The shared pointer test. A reference to a named part of the document
 * ("as set out in Schedule 2", "per Appendix A", "follows Schedule 3")
 * suppresses a rule for that sentence. It trusts that the referenced text exists.
 */
export const POINTER_RE = new RegExp(
  '\\b(?:as\\s+(?:defined|set\\s+out|described|specified|detailed|outlined|listed)\\s+in' +
    '|(?:is|are)?\\s*(?:defined|set\\s+out|described|specified|detailed|outlined|listed)\\s+in' +
    '|per|according\\s+to|see|follows?|under|in\\s+accordance\\s+with|governed\\s+by)' +
    '\\s+(?:the\\s+)?(?:appendix|appendices|schedule|exhibit|section|annex)\\b',
  'i',
);

export function hasPointer(s: string): boolean {
  return POINTER_RE.test(s);
}
