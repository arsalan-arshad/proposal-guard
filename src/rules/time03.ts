import { NUM, dropOverlapping, findAll, has, hasPointer } from '../patterns.js';
import type { Finding, RuleOutcome, Sentence, Severity } from '../types.js';

const ACCEPT_CUE_RE =
  /\b(?:approv(?:al|e|es|ed|ing)|accept(?:s|ed|ance|ing)?|sign(?:s|ed)?[- ]off|sign(?:s|ed)?\s+off|client\s+review|review\s+by\s+the\s+client|confirm(?:s|ed)?\s+in\s+writing|call\s+it\s+done|thumbs[- ]up|(?:happy|satisfied|pleased)\s+with|say\s+it(?:['\u2019]?s|\s+is)\s+(?:done|ready)|(?:your|the\s+client['\u2019]s)\s+(?:OK|okay)|confirm(?:s|ed)?\s+(?:that\s+)?(?:the\s+|it\s+|everything\s+)?(?:\w+\s+)?(?:is\s+working|works|meets|conforms|is\s+(?:correct|complete|ready|done)))\b/gi;
/** Phrases that are clearly about the client approving something, so a sequencing word is enough context. */
const STRONG_CUE_RE = /\b(?:approv(?:al|e|es|ed|ing)|sign(?:s|ed)?[- ]off|sign(?:s|ed)?\s+off|thumbs[- ]up|happy\s+with|satisfied\s+with|pleased\s+with|say\s+it(?:['\u2019]?s|\s+is)\s+(?:done|ready)|(?:your|the\s+client['\u2019]s)\s+(?:OK|okay)|call\s+it\s+done|confirm)/i;
/** The approver is the client side ("you", "the client"), not an internal team. */
const CLIENT_SIDE_RE = /\b(?:you|your|you['\u2019]re|client|customer)\b/i;
const SEQUENCING_RE = /\b(?:then|before|after|once|when|until|only|wait)\b/i;

/** Senses of "accept"/"approval" that are not about the client approving work. */
const EXCLUDED_SENSE: RegExp[] = [
  /\baccept(?:s|ed|ing)?\s+(?:all\s+)?(?:major\s+)?(?:credit\s+cards?|debit\s+cards?|cards?|payments?|paypal|stripe|bank\s+transfers?|wire\s+transfers?|checks?|cheques?|crypto\w*)\b/gi,
  /\baccept(?:s|ed|ing)?\s+the\s+following\s+(?:payment|file|format)/gi,
  /\baccepted\s+(?:file\s+)?formats?\b/gi,
  /\bbudget\s+approval\b/gi,
  /\bpre[- ]approved\b/gi,
  /\bour\s+review\b/gi,
  /\b\d+\s+approved\b/gi,
  // Approving an estimate, quote, proposal or contract is not accepting delivered work.
  /\b(?:approv\w+|accept\w*|sign\w*)\s+(?:of\s+)?(?:the\s+|a\s+|an\s+|this\s+|that\s+|any\s+)?(?:written\s+)?(?:estimate|quote|quotation|change\s+order|proposal|budget|statement\s+of\s+work|sow|contract|scope)\b/gi,
  /\b(?:estimate|quote|quotation|change\s+order|proposal|budget)\b[^.]{0,40}\b(?:approv\w+|accept\w*)\b/gi,
];

const MILESTONE_RE =
  /\b(?:milestones?|deliverables?|deliver(?:y|ed|s)?|phases?|stages?|payments?|invoic\w*|releas\w*|handover|completion|final|builds?|drafts?|layouts?|designs?|wireframes?|mock-?ups?|proofs?|versions?|flows?|prototypes?|go(?:es)?\s+live|launch\w*|instal+ments?|advance|deposit|balance|remaining|half)\b|\d+\s*%|\bpercent\b/i;

const PAYMENT_RE = /\b(?:payments?|invoic\w*|paid|released|funds?)\b/i;

const TIME_UNIT = '(?:calendar\\s+|business\\s+|working\\s+)?(?:hours?|days?|weeks?)';

/** A stated time window for the approval. Unfilled placeholders such as [N] do not count. */
const WINDOW_RE = new RegExp(
  [
    `\\bwithin\\s+(?:the\\s+|those\\s+|these\\s+|that\\s+)?(?:next\\s+|following\\s+)?${NUM}\\s*(?:\\(\\d+\\)\\s*)?${TIME_UNIT}\\b`,
    `\\b(?:has|have|gets?|given|allowed)\\s+${NUM}\\s+${TIME_UNIT}\\b`,
    `\\b${NUM}\\s+${TIME_UNIT}\\s+(?:after|of|from)\\s+(?:the\\s+)?(?:delivery|receipt|submission|notice|review)\\b`,
    `\\b${NUM}\\s+${TIME_UNIT}\\s+to\\s+[a-z]+\\b`,
    `\\b(?:review|approval|acceptance)\\s+(?:period|window)\\s+(?:of|is)\\s+${NUM}\\b`,
    `\\b${NUM}[- ](?:business[- ]|working[- ])?(?:day|hour|week)\\s+(?:review|approval|acceptance)\\b`,
  ].join('|'),
  'i',
);

const DEEMED_RE =
  /\b(?:deemed\s+(?:to\s+be\s+)?(?:accepted|approved)|automatically\s+(?:accepted|approved)|considered\s+(?:to\s+be\s+)?(?:accepted|approved)|(?:treated|taken|regarded)\s+as\s+(?:accepted|approved)|(?:silence|no\s+(?:response|reply|answer)|nothing)\b[^.]{0,50}\b(?:acceptance|accepted|approved|approval))\b/i;

const WHY = 'Delivery or payment waits on an approval that has no deadline, so it can be delayed without limit.';
const SUGGESTION =
  'Add a review period and a default: the client reviews within [N] business days; with no written response, the milestone is deemed accepted.';

function handled(masked: string): boolean {
  return has(WINDOW_RE, masked) || has(DEEMED_RE, masked) || hasPointer(masked);
}

/** TIME-03: milestone, delivery or payment depends on approval with no time window. */
/** `claimed` holds the start offsets of sentences REVISE-04 already reported; a revision promise is not also an approval clause. */
export function checkTime03(sentences: Sentence[], claimed: ReadonlySet<number> = new Set()): RuleOutcome {
  const findings: Finding[] = [];
  let sawCue = false;

  sentences.forEach((s, i) => {
    if (s.heading) return; // a title such as "Milestones and acceptance" is not a clause
    const excluded = EXCLUDED_SENSE.flatMap((re) => findAll(re, s.masked));
    const cues = dropOverlapping(findAll(ACCEPT_CUE_RE, s.masked), excluded);
    if (cues.length === 0) return;
    // A revision promise ("included until the client is happy with it") is REVISE-04's, not an approval clause; a real
    // sign-off in the same sentence still counts.
    if (claimed.has(s.start) && s.masked && cues.every((c) => /^(?:happy|satisfied|pleased)\s+with$/i.test(s.masked.slice(c.start, c.end)))) return;
    if (!has(MILESTONE_RE, s.masked) && !(has(STRONG_CUE_RE, s.masked) && has(SEQUENCING_RE, s.masked) && has(CLIENT_SIDE_RE, s.masked))) return;
    sawCue = true;

    const next = sentences[i + 1];
    const nextMasked = next && next.block === s.block ? next.masked : '';
    if (handled(s.masked) || (nextMasked !== '' && handled(nextMasked))) return;

    const severity: Severity = has(PAYMENT_RE, s.masked) ? 'High' : 'Medium';
    findings.push({
      ruleId: 'TIME-03',
      severity,
      sentence: s.text,
      start: s.start,
      end: s.end,
      terms: cues.map((c) => ({ text: s.text.slice(c.start, c.end), start: s.start + c.start, end: s.start + c.end })),
      why: WHY,
      suggestion: SUGGESTION,
    });
  });

  return {
    findings,
    status: findings.length > 0 ? 'findings' : sawCue ? 'passed' : 'not applicable',
  };
}
