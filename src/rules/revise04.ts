import { dropOverlapping, findAll, has, hasNumber, hasPointer, leftmostLongest } from '../patterns.js';
import type { Finding, RuleOutcome, Sentence, Severity, Term } from '../types.js';

const REVISION_CUE_RES: RegExp[] = [
  /\brounds?\s+of\s+(?:revisions?|changes?|feedback|edits?)\b/gi,
  /\b(?:minor|small|any|reasonable)\s+(?:changes|edits|tweaks|adjustments)\b/gi,
  /\brevisions?\b/gi,
  /\brevis(?:e|es|ed)\b/gi,
  /\brework(?:s|ed)?\b/gi,
  /\biterations?\b/gi,
  /\bedits\b/gi,
  /\btweaks\b/gi,
  /\bamendments?\b/gi,
  /\b(?:want|need|request|require)s?\s+(?:any\s+)?(?:changes|tweaks|edits|adjustments|amendments)\b/gi,
];

/** Version-history and scope-change senses that are not a promise of free revisions. */
const EXCLUSIONS: RegExp[] = [
  /\brevisions?\s+(?:history|number|control|\d+|[a-z]\b)/gi,
  /\b(?:revisions?|versions?)\s+of\s+(?:this|the)\s+(?:document|proposal|contract|agreement|sow|file)\b/gi,
  /\b(?:any|minor|small|reasonable)\s+changes?\s+(?:to|in|of)\s+(?:the\s+)?(?:scope|requirements?|specification|agreement|contract|timeline|schedule|budget|price)\b/gi,
];
const GIT_RE = /\b(?:git|version\s+history|revision\s+history)\b/i;

const UNLIMITED_RES: RegExp[] = [
  /\bunlimited\s+(?:[A-Za-z-]+\s+){0,2}(?:revisions?|iterations?|rounds?|changes|edits|tweaks|rework)\b/gi,
  /\buntil\b[^.]{0,40}?\b(?:you\s+are|you['’]re|the\s+(?:client|customer)\s+is)\s+(?:completely\s+|fully\s+|totally\s+)?(?:happy|satisfied|pleased)\b/gi,
  /\buntil\s+you\s+love\b/gi,
  /\buntil\b[^.]{0,30}\b(?:feels|looks|is)\s+right\b/gi,
  /\bas\s+many\s+times\s+as\s+(?:it\s+takes|needed|required|necessary|you\s+(?:like|want|need))\b/gi,
  /\bkeep\s+(?:tweaking|adjusting|revising|changing|refining|fixing|polishing)\b/gi,
  /\bas\s+many\s+(?:revisions?|rounds?|iterations?|changes|edits)\s+as\s+(?:needed|required|necessary)\b/gi,
];

const COMMITMENT_RE =
  /\b(?:includ(?:e|es|ed|ing)|offer(?:s|ed|ing)?|provid(?:e|es|ed|ing)|allow(?:s|ed|ing)?|will|free|unlimited|as\s+many|deliver(?:s|ed)?)\b/i;

const CHANGE_ORDER_RE = new RegExp(
  [
    'change[- ]orders?',
    'change\\s+requests?',
    'additional\\s+work\\s+(?:is|are|will\\s+be)\\s+(?:billed|charged|quoted)',
    'out[- ]of[- ]scope\\s+(?:work|requests?)\\s+(?:is|are|will\\s+be)\\s+(?:billed|quoted|charged)',
    'billable\\s+change',
    'billed\\s+as\\s+(?:a\\s+)?change',
    'quoted\\s+separately',
    '(?:additional|extra|further|beyond|after\\s+that)\\b[^.]{0,60}?\\b(?:cost|costs|billed|charged|priced|quoted)',
    '(?:treated|handled|scoped)\\s+as\\s+(?:a\\s+)?new\\s+(?:project|engagement|request|scope)',
    '(?:billed|charged|quoted)\\s+(?:separately|hourly|extra|at\\s+(?:our|the|an?)\\s+(?:standard\\s+)?(?:hourly\\s+)?rate)',
    'at\\s+(?:our|the)\\s+(?:standard\\s+)?hourly\\s+rate',
    '(?:extra|additional|further)\\s+(?:rounds?|revisions?|requests?|work)\\s+(?:are|is|will\\s+be)\\s+(?:billed|charged|quoted)',
  ]
    .map((p) => `\\b${p}\\b`)
    .join('|'),
  'i',
);

const WHY_A = 'With no number, or no limit, the amount of free rework is open-ended.';
const WHY_B = 'Nothing says how extra requests are priced, so extra work tends to be done unpaid.';
const SUGGESTION_A = 'State the number of included revision rounds: [N] rounds per [milestone].';
const SUGGESTION_B =
  'Add a change-order path: work beyond the included revisions is quoted and billed as a change order at [rate].';

/** Revision cues of one sentence, with excluded senses removed. */
function revisionCues(masked: string): Term[] {
  if (has(GIT_RE, masked)) return [];
  const excluded = EXCLUSIONS.flatMap((re) => findAll(re, masked));
  const all = dropOverlapping(
    REVISION_CUE_RES.flatMap((re) => findAll(re, masked)),
    excluded,
  );
  // Leftmost-longest, so "rounds of revisions" wins over "revisions".
  return leftmostLongest(all);
}

interface Word {
  s: number;
  e: number;
}

function tokenize(masked: string): Word[] {
  return [...masked.matchAll(/\S+/g)].map((m) => ({ s: m.index ?? 0, e: (m.index ?? 0) + m[0].length }));
}

/** True if a number appears within five words of the cue. `words` is tokenize(masked), computed once per sentence. */
function numberNear(masked: string, words: Word[], cue: Term): boolean {
  // First word that ends after the cue starts (binary search), last word that starts before the cue ends.
  let lo = 0;
  let hi = words.length - 1;
  let first = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if ((words[mid] as Word).e > cue.start) {
      first = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  if (first === -1) return false;
  let last = first;
  lo = first;
  hi = words.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if ((words[mid] as Word).s < cue.end) {
      last = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  const from = Math.max(0, first - 5);
  const to = Math.min(words.length - 1, last + 5);
  const window = masked.slice((words[from] as Word).s, (words[to] as Word).e);
  return hasNumber(window);
}

function toTerms(s: Sentence, terms: Term[]): Term[] {
  return terms.map((t) => ({ text: s.text.slice(t.start, t.end), start: s.start + t.start, end: s.start + t.end }));
}

/** REVISE-04: unnumbered or unlimited revisions (a), or revisions with no change-order path (b). */
export function checkRevise04(sentences: Sentence[]): RuleOutcome {
  const findings: Finding[] = [];
  const eligibleWithoutA: Sentence[] = [];
  let sawCue = false;
  let changeOrderPath = false;

  for (const s of sentences) {
    if (has(CHANGE_ORDER_RE, s.masked)) changeOrderPath = true;

    const cues = revisionCues(s.masked);
    const unlimited = has(GIT_RE, s.masked) ? [] : UNLIMITED_RES.flatMap((re) => findAll(re, s.masked));
    if (cues.length === 0 && unlimited.length === 0) continue;
    sawCue = true;
    if (hasPointer(s.masked)) continue;

    const committed = unlimited.length > 0 || has(COMMITMENT_RE, s.masked);
    if (!committed) continue;

    const words = tokenize(s.masked);
    const unnumbered = cues.filter((c) => !numberNear(s.masked, words, c));
    if (unlimited.length > 0 || unnumbered.length > 0) {
      const severity: Severity = unlimited.length > 0 ? 'High' : 'Medium';
      const terms = [...(unlimited.length > 0 ? cues : unnumbered), ...unlimited].sort((a, b) => a.start - b.start);
      findings.push({
        ruleId: 'REVISE-04',
        part: 'a',
        severity,
        sentence: s.text,
        start: s.start,
        end: s.end,
        terms: toTerms(s, terms),
        why: WHY_A,
        suggestion: SUGGESTION_A,
      });
    } else {
      eligibleWithoutA.push(s);
    }
  }

  // Part (b): revisions are promised somewhere, with a number, but nothing prices extra requests.
  const anchor = eligibleWithoutA[0];
  if (anchor && !changeOrderPath) {
    findings.push({
      ruleId: 'REVISE-04',
      part: 'b',
      severity: 'Medium',
      sentence: anchor.text,
      start: anchor.start,
      end: anchor.end,
      terms: toTerms(anchor, revisionCues(anchor.masked)),
      why: WHY_B,
      suggestion: SUGGESTION_B,
    });
  }

  findings.sort((x, y) => x.start - y.start);
  return {
    findings,
    status: findings.length > 0 ? 'findings' : sawCue ? 'passed' : 'not applicable',
  };
}
