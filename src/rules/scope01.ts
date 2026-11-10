import { dropOverlapping, findAll, has, hasPointer, leftmostLongest, mergeSpans, overlapsMerged } from '../patterns.js';
import type { Finding, RuleOutcome, Sentence, Severity, Term } from '../types.js';

type Group = 'quality' | 'standards' | 'open' | 'subjective';

interface LexEntry {
  group: Group;
  severity: Severity;
  re: RegExp;
  /** Specific acceptance phrases are flagged even without a commitment verb or deliverable noun in the sentence. */
  noContext?: boolean;
}

const APOS = "['\\u2019]";

// Order does not matter: matches are resolved longest-first.
const LEXICON: LexEntry[] = [
  // Quality adjectives (Medium)
  { group: 'quality', severity: 'Medium', re: /\bseamless(?:ly)?\b/gi },
  { group: 'quality', severity: 'Medium', re: /\bintuitive(?:ly)?\b/gi },
  { group: 'quality', severity: 'Medium', re: /\buser[- ]friendly\b/gi },
  { group: 'quality', severity: 'Medium', re: /\beasy[- ]to[- ]use\b/gi },
  // "easily" only before an adjective-looking word
  { group: 'quality', severity: 'Medium', re: /\beasily(?=\s+(?:\w+(?:able|ible|ive|ous|ful|ic)|extensible|flexible)\b)/gi },
  { group: 'quality', severity: 'Medium', re: /\brobust(?:ly)?\b/gi },
  { group: 'quality', severity: 'Medium', re: /\bscalable\b/gi },
  { group: 'quality', severity: 'Medium', re: /\bperformant\b/gi },
  { group: 'quality', severity: 'Medium', re: /\bsmooth(?:ly)?\b/gi },
  { group: 'quality', severity: 'Medium', re: /\bpixel[- ]perfect\b/gi },
  { group: 'quality', severity: 'Medium', re: /\bsleek\b/gi },
  // Speed words (Medium)
  { group: 'quality', severity: 'Medium', re: /\bfast\b/gi },
  { group: 'quality', severity: 'Medium', re: /\bquick(?:ly)?\b/gi },
  { group: 'quality', severity: 'Medium', re: /\blightning[- ]fast\b/gi },
  { group: 'quality', severity: 'Medium', re: /\bblazing(?:ly)?(?:[- ]fast)?\b/gi },
  { group: 'quality', severity: 'Medium', re: /\breal[- ]time\b/gi },
  { group: 'quality', severity: 'Medium', re: /\binstant(?:ly)?\b/gi },
  { group: 'quality', severity: 'Medium', re: /\bresponsive\b/gi },
  // Quality labels (Medium)
  { group: 'quality', severity: 'Medium', re: /\bbest[- ]in[- ]class\b/gi },
  { group: 'quality', severity: 'Medium', re: /\bworld[- ]class\b/gi },
  { group: 'quality', severity: 'Medium', re: /\bstate[- ]of[- ]the[- ]art\b/gi },
  { group: 'quality', severity: 'Medium', re: /\bcutting[- ]edge\b/gi },
  { group: 'quality', severity: 'Medium', re: /\benterprise[- ]grade\b/gi },
  { group: 'quality', severity: 'Medium', re: /\bproduction[- ]ready\b/gi },
  { group: 'quality', severity: 'Medium', re: /\bhigh[- ]quality\b/gi },
  // Unreferenced standards (Medium)
  { group: 'standards', severity: 'Medium', re: /\b(?:industry\s+)?best\s+practices?\b/gi },
  { group: 'standards', severity: 'Medium', re: /\bindustry[- ]standards?\b/gi },
  // Open-ended scope (High)
  { group: 'open', severity: 'High', re: /\betc\./gi },
  { group: 'open', severity: 'High', re: /\band\s+so\s+on\b/gi },
  { group: 'open', severity: 'High', re: /\band\s+more\b/gi },
  { group: 'open', severity: 'High', re: /\band\s+the\s+like\b/gi },
  { group: 'open', severity: 'High', re: /\band\s+similar\b/gi },
  { group: 'open', severity: 'High', re: /\band\s+other(?:\s+related)?(?=\s+[A-Za-z])/gi },
  { group: 'open', severity: 'High', re: /\bincluding\s+but\s+not\s+limited\s+to\b/gi },
  { group: 'open', severity: 'High', re: /\bas\s+(?:needed|necessary)\b/gi },
  { group: 'open', severity: 'High', re: /\bas\s+required\b(?!\s+by\b)/gi },
  { group: 'open', severity: 'High', re: /\bwhere\s+appropriate\b/gi },
  { group: 'open', severity: 'High', re: /\bany\s+other\b/gi },
  { group: 'open', severity: 'High', re: /\ball\s+necessary\b/gi },
  // Subjective acceptance (High)
  { group: 'subjective', severity: 'High', noContext: true, re: new RegExp(`\\bto\\s+(?:your|the\\s+client${APOS}?s?)\\s+satisfaction\\b`, 'gi') },
  { group: 'subjective', severity: 'High', noContext: true, re: /\bto\s+the\s+satisfaction\s+of\b/gi },
  { group: 'subjective', severity: 'High', noContext: true, re: /\bsatisfactory\s+to\s+(?:you|the\s+client)\b/gi },
  { group: 'subjective', severity: 'High', re: /\bsatisfactory\b/gi },
  { group: 'subjective', severity: 'High', noContext: true, re: /\bas\s+the\s+client\s+sees\s+fit\b/gi },
];

/** Phrases that look like lexicon terms but are not (names and fixed phrases). */
const EXCLUSIONS: RegExp[] = [
  /\bfast[- ]follow\b/gi,
  /\bfast[- ]track\b/gi,
  /\bquick\s+(?:start|call|chat)\b/gi,
  /\bresponsive\s+(?:layout|design|web|mobile|app|application|site|website|ui|interface|pages?|front-?end|template|theme)\b/gi,
  /\bScalable\s+Vector\s+Graphics\b/gi,
  /\bFast(?:API|ify|lane)\b/g,
  /\bQuickBooks\b/g,
];

/** A measurable criterion or a named standard silences the sentence. */
const METRIC_RE = new RegExp(
  [
    '\\bp9[59]\\b',
    '\\d[\\d,]*(?:\\.\\d+)?\\s*(?:ms|milliseconds?|seconds?|secs?|%|percent|rps|mbps|gb|mb|tb|px|concurrent|users?|uptime)\\b',
    '\\d[\\d,]*(?:\\.\\d+)?\\s*(?:requests?|req)\\s*(?:/|per)\\s*(?:second|sec|s|minute|min)\\b',
    '\\b(?:at\\s+least|no\\s+more\\s+than|under|within)\\s+\\d',
    '\\buptime\\b.{0,20}\\d',
    '\\bWCAG\\s*\\d(?:\\.\\d)?',
    '\\bOWASP\\b',
    '\\bOAuth\\s*2(?:\\.0)?\\b',
    '\\bTLS\\s*1\\.\\d\\b',
    '\\bISO\\s*\\d{4,5}\\b',
    '\\bSOC\\s*2\\b',
    '\\bPCI[- ]DSS\\b',
    '\\bRFC\\s*\\d{3,5}\\b',
  ].join('|'),
  'i',
);

/** Deliverable context: a commitment verb or a deliverable noun. */
const CONTEXT_RE = new RegExp(
  '\\b(?:will|shall|must|should|deliver(?:s|ed|y|ables?)?|provid(?:e|es|ed|ing)|includ(?:e|es|ed|ing)' +
    '|ensur(?:e|es|ed|ing)|build|builds|built|develop(?:s|ed|ing)?|implement(?:s|ed|ing)?|creat(?:e|es|ed|ing)' +
    '|integrat(?:e|es|ed|ing|ion|ions)|deploy(?:s|ed|ing)?|launch(?:es|ed|ing)?' +
    '|scope|covers?|app|application|website|site|platform|system|API|dashboard|feature|module|backend|frontend|interface|pipeline|service)\\b',
  'i',
);

const WHY: Record<Group, string> = {
  quality: '“{term}” has no measurable meaning, so any result can be argued to miss it.',
  standards: '“{term}” points to standards without naming them, so which ones apply can be argued afterwards.',
  open: '“{term}” leaves the list of deliverables open, so extra work can be claimed as in scope.',
  subjective: "Acceptance depends on the client's opinion, with no test.",
};

const SUGGESTION: Record<Group, string> = {
  quality: 'Replace “{term}” with a measurable criterion: [metric] [threshold] measured by [method].',
  standards: 'Name the standard and version instead of “{term}”: [standard name and version], checked by [method].',
  open: 'List every item in scope: [list]. Add: anything not listed is out of scope.',
  subjective: 'Define acceptance as [criteria], reviewed within [N] business days (see TIME-03).',
};

const GROUP_ORDER: Group[] = ['subjective', 'open', 'standards', 'quality'];

type Resolved = Term & { group: Group; severity: Severity; noContext: boolean };

function resolveTerms(masked: string): Resolved[] {
  const candidates: Resolved[] = [];
  for (const entry of LEXICON) {
    for (const t of findAll(entry.re, masked)) {
      candidates.push({ ...t, group: entry.group, severity: entry.severity, noContext: entry.noContext === true });
    }
  }
  const excluded: Term[] = EXCLUSIONS.flatMap((re) => findAll(re, masked));
  // Drop excluded names and phrases, then keep leftmost-longest non-overlapping matches.
  return leftmostLongest(dropOverlapping(candidates, excluded));
}

/**
 * SCOPE-01: vague promise or open-ended scope.
 * `claimed` holds absolute spans that REVISE-04 already reported; SCOPE-01 stays silent on them.
 */
export function checkScope01(
  sentences: Sentence[],
  claimed: Array<{ start: number; end: number }>,
): RuleOutcome {
  const findings: Finding[] = [];
  let sawCue = false;
  const claimedMerged = mergeSpans(claimed);

  for (const s of sentences) {
    let terms = resolveTerms(s.masked);
    if (!has(CONTEXT_RE, s.masked)) terms = terms.filter((t) => t.noContext);
    if (terms.length === 0) continue;
    sawCue = true;
    terms = terms.filter((t) => !overlapsMerged(claimedMerged, { start: s.start + t.start, end: s.start + t.end }));
    if (terms.length === 0) continue;
    if (has(METRIC_RE, s.masked) || hasPointer(s.masked)) continue;

    const severity: Severity = terms.some((t) => t.severity === 'High') ? 'High' : 'Medium';
    const groups = GROUP_ORDER.filter((g) => terms.some((t) => t.group === g));
    const first = (g: Group): string => (terms.find((t) => t.group === g) as Term).text;
    findings.push({
      ruleId: 'SCOPE-01',
      severity,
      sentence: s.text,
      start: s.start,
      end: s.end,
      terms: terms.map((t) => ({ text: s.text.slice(t.start, t.end), start: s.start + t.start, end: s.start + t.end })),
      why: groups.map((g) => WHY[g].replace('{term}', first(g))).join(' '),
      suggestion: groups.map((g) => SUGGESTION[g].replace('{term}', first(g))).join(' '),
    });
  }

  return {
    findings,
    status: findings.length > 0 ? 'findings' : sawCue ? 'passed' : 'not applicable',
  };
}
