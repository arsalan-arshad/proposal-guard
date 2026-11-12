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
  { group: 'quality', severity: 'Medium', re: /\bbest\s+possible\b/gi },
  { group: 'quality', severity: 'Medium', re: /\bhigh(?:est)?\s+standards?\b/gi },
  { group: 'quality', severity: 'Medium', re: /\bpolished\b/gi },
  { group: 'quality', severity: 'Medium', re: /\b(?:fully\s+)?optimi[sz]ed\b/gi },
  { group: 'quality', severity: 'Medium', re: /\bwide\s+range\s+of\b/gi },
  { group: 'quality', severity: 'Medium', re: /\bhighly\s+available\b/gi },
  // Unreferenced standards (Medium)
  { group: 'standards', severity: 'Medium', re: /\b(?:industry\s+)?best\s+practices?\b/gi },
  { group: 'standards', severity: 'Medium', re: /\bindustry[- ]standards?\b/gi },
  // Open-ended scope (High)
  { group: 'open', severity: 'High', re: /\betc\./gi },
  { group: 'open', severity: 'High', noContext: true, re: /\band\s+more\b/gi },
  { group: 'open', severity: 'High', re: /\band\s+the\s+like\b/gi },
  { group: 'open', severity: 'High', re: /\band\s+similar\b/gi },
  { group: 'open', severity: 'High', noContext: true, re: /\band\s+other(?:\s+related)?(?=\s+[A-Za-z])/gi },
  { group: 'open', severity: 'High', re: /\bincluding\s+but\s+not\s+limited\s+to\b/gi },
  { group: 'open', severity: 'High', re: /\bas\s+(?:needed|necessary)\b/gi },
  { group: 'open', severity: 'High', re: /\bas\s+required\b(?!\s+by\b)/gi },
  { group: 'open', severity: 'High', re: /\bwhere\s+appropriate\b/gi },
  { group: 'open', severity: 'High', re: /\bany\s+other\b/gi },
  { group: 'open', severity: 'High', re: /\ball\s+necessary\b/gi },
  { group: 'open', severity: 'High', noContext: true, re: /\bwhatever\s+it\s+takes\b/gi },
  { group: 'open', severity: 'High', re: /\banything\s+else\b/gi },
  { group: 'open', severity: 'High', noContext: true, re: /\bwhatever\s+(?:else|features?|is|makes?)\b/gi },
  { group: 'open', severity: 'High', noContext: true, re: /\banything\s+(?:that\s+)?comes\s+up\b/gi },
  { group: 'open', severity: 'High', re: /\bgoing\s+forward\b/gi },
  { group: 'open', severity: 'High', re: /\b(?:might|may)\s+need\b/gi },
  { group: 'open', severity: 'High', re: /\bwhere\s+(?:required|needed|necessary)\b/gi },
  { group: 'open', severity: 'High', noContext: true, re: /\band\s+so\s+on\b/gi },
  { group: 'open', severity: 'High', noContext: true, re: /\bongoing\s+optimi[sz]ation\b/gi },
  { group: 'open', severity: 'High', re: /\bany\s+additional\b/gi },
  { group: 'open', severity: 'High', noContext: true, re: /\bas\s+(?:the\s+\w+\s+)?may\s+(?:reasonably\s+)?(?:be\s+)?(?:required|agreed|needed|necessary|require)\b/gi },
  { group: 'open', severity: 'High', re: /\bfrom\s+time\s+to\s+time\b/gi },
  { group: 'open', severity: 'High', noContext: true, re: /\bongoing\s+(?:support|maintenance|updates|bug\s+fixes|improvements)\b/gi },
  { group: 'open', severity: 'High', noContext: true, re: /\b(?:support|maintenance|updates|bug\s+fixes)\s+ongoing\b/gi },
  // Subjective acceptance (High)
  { group: 'subjective', severity: 'High', noContext: true, re: new RegExp(`\\bto\\s+(?:your|the\\s+client${APOS}?s?)\\s+satisfaction\\b`, 'gi') },
  { group: 'subjective', severity: 'High', noContext: true, re: /\bto\s+the\s+satisfaction\s+of\b/gi },
  { group: 'subjective', severity: 'High', noContext: true, re: /\bsatisfactory\s+to\s+(?:you|the\s+client)\b/gi },
  { group: 'subjective', severity: 'High', re: /\bsatisfactory\b/gi },
  { group: 'subjective', severity: 'High', noContext: true, re: /\bas\s+the\s+client\s+sees\s+fit\b/gi },
];


/**
 * Soft quality adjectives. On their own they are too common to flag ("secure payment", "professional services"), so
 * a soft adjective counts only when it follows a predicate frame ("will be secure", "looks professional", "sounds
 * great") or when the sentence has at least two quality terms ("accurate, helpful and engaging").
 */
const SOFT_RE =
  /\b(?:secure|reliable|accurate|clean|modern|professional|great|nice|good|perfect|premium|delightful|engaging|compelling|persuasive|cohesive|comprehensive|friendly|on-brand|natural-sounding|helpful|warm|attractive|beautiful|stunning|amazing|easy)\b/gi;
/** Adjectives that describe a thing, so "will be secure" is a promise about the deliverable. Others can describe a person ("will be professional"). */
const THING_ADJ_RE = /^(?:secure|reliable|accurate|clean|modern|premium|perfect|comprehensive|cohesive|attractive|beautiful|stunning|natural-sounding|easy)$/i;
const APPEARANCE_FRAME_RE = /\b(?:look|looks|feel|feels|sound|sounds|read|reads|come\s+out|so\s+(?:it|that))\s+(?:\w+ly\s+|really\s+|very\s+|super\s+)?$/i;
const BE_FRAME_RE = /\b(?:be|is|are)\s+(?:\w+ly\s+|really\s+|very\s+|super\s+)?$/i;

/** A promise frame directly before the adjective: "looks/sounds/feels ..." for any soft adjective, "will be ..." only for adjectives about things; never a wish ("would be great"). */
function hasPromiseFrame(before: string, adjective: string): boolean {
  const wish = (idx: number): boolean => /\b(?:would|could|might|may|can)\s*$/i.test(before.slice(0, idx));
  const look = APPEARANCE_FRAME_RE.exec(before);
  if (look !== null && !wish(look.index)) return true;
  const be = BE_FRAME_RE.exec(before);
  return be !== null && THING_ADJ_RE.test(adjective) && !wish(be.index);
}

/** Phrases that look like lexicon terms but are not (names and fixed phrases). */
const EXCLUSIONS: RegExp[] = [
  /\bfast[- ]follow\b/gi,
  /\bfast[- ]track\b/gi,
  /\bquick\s+(?:start|call|chat)\b/gi,
  /\bresponsive\s+(?:layout|design|web|mobile|app|application|site|website|ui|interface|pages?|front-?end|template|theme)\b/gi,
  /\bScalable\s+Vector\s+Graphics\b/gi,
  /\bFast(?:API|ify|lane)\b/g,
  /\bQuickBooks\b/g,
  // A capitalised cue word followed by another capitalised word, after a lower-case word, is a name ("to Fast Lane Couriers").
  /(?<=[a-z,]\s)(?:Fast|Quick|Instant|Smooth|Robust|Responsive|Seamless)\s+[A-Z][a-z]+/g,
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

const FIRST_PERSON_RE = /\b(?:I|we|you)['\u2019]ll\b/i;
const CHANGE_ORDER_SENTENCE_RE = /\bchange[- ]orders?\b/i;

/** Deliverable context: a commitment verb or a deliverable noun. */
const CONTEXT_RE = new RegExp(
  '\\b(?:will|shall|must|should|make\\s+sure|works?\\s+(?:well|smoothly|seamlessly|on|across|with)|experience|deliver(?:s|ed|y|ables?)?|provid(?:e|es|ed|ing)|includ(?:e|es|ed|ing)' +
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
  const regular = leftmostLongest(dropOverlapping(candidates, excluded));
  const softCandidates = dropOverlapping(dropOverlapping(findAll(SOFT_RE, masked), excluded), regular);
  const soft: Resolved[] = softCandidates
    .filter((t) => regular.length + softCandidates.length >= 2 || hasPromiseFrame(masked.slice(Math.max(0, t.start - 30), t.start), masked.slice(t.start, t.end)))
    .map((t) => ({ ...t, group: 'quality' as Group, severity: 'Medium' as Severity, noContext: false }));
  return [...regular, ...soft].sort((a, b) => a.start - b.start);
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
    if (!has(CONTEXT_RE, s.masked)) {
      // "I'll make it feel premium": a first-person promise is context for the terms after it, not before it
      // ("Quick overview of what I'll do" is a title, not a promise).
      const promise = FIRST_PERSON_RE.exec(s.masked);
      const after = promise ? terms.filter((t) => t.start > promise.index) : [];
      terms = after.length > 0 ? after.concat(terms.filter((t) => t.noContext && !after.includes(t))) : terms.filter((t) => t.noContext);
    }
    if (terms.length === 0) continue;
    sawCue = true;
    terms = terms.filter((t) => !overlapsMerged(claimedMerged, { start: s.start + t.start, end: s.start + t.end }));
    if (terms.length === 0) continue;
    // A sentence that sets up a written change order is closing the scope, not opening it.
    if (has(METRIC_RE, s.masked) || hasPointer(s.masked) || has(CHANGE_ORDER_SENTENCE_RE, s.masked)) continue;

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
