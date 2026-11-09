import { NUM, dropOverlapping, findAll, has, hasPointer } from '../patterns.js';
import type { Finding, RuleOutcome, Sentence, Severity } from '../types.js';

const ACCEPT_CUE_RE =
  /\b(?:approv(?:al|e|es|ed|ing)|accept(?:s|ed|ance|ing)?|sign(?:s|ed)?[- ]off|sign(?:s|ed)?\s+off|client\s+review|review\s+by\s+the\s+client)\b/gi;

/** Senses of "accept"/"approval" that are not about the client approving work. */
const EXCLUDED_SENSE: RegExp[] = [
  /\baccept(?:s|ed|ing)?\s+(?:all\s+)?(?:major\s+)?(?:credit\s+cards?|debit\s+cards?|cards?|payments?|paypal|stripe|bank\s+transfers?|wire\s+transfers?|checks?|cheques?|crypto\w*)\b/gi,
  /\baccept(?:s|ed|ing)?\s+the\s+following\s+(?:payment|file|format)/gi,
  /\baccepted\s+(?:file\s+)?formats?\b/gi,
  /\bbudget\s+approval\b/gi,
  /\bpre[- ]approved\b/gi,
  /\bour\s+review\b/gi,
];

const MILESTONE_RE =
  /\b(?:milestones?|deliverables?|deliver(?:y|ed|s)?|phases?|stages?|payments?|invoic\w*|releas\w*|handover|completion|final)\b/i;

const PAYMENT_RE = /\b(?:payments?|invoic\w*|paid|released|funds?)\b/i;

const TIME_UNIT = '(?:calendar\\s+|business\\s+|working\\s+)?(?:hours?|days?|weeks?)';

/** A stated time window for the approval. Unfilled placeholders such as [N] do not count. */
const WINDOW_RE = new RegExp(
  [
    `\\bwithin\\s+(?:the\\s+)?(?:next\\s+)?${NUM}\\s*(?:\\(\\d+\\)\\s*)?${TIME_UNIT}\\b`,
    `\\b${NUM}\\s+${TIME_UNIT}\\s+(?:after|of|from)\\s+(?:the\\s+)?(?:delivery|receipt|submission|notice|review)\\b`,
    `\\b(?:review|approval|acceptance)\\s+(?:period|window)\\s+(?:of|is)\\s+${NUM}\\b`,
    `\\b${NUM}[- ](?:business[- ]|working[- ])?(?:day|hour|week)\\s+(?:review|approval|acceptance)\\b`,
  ].join('|'),
  'i',
);

const DEEMED_RE =
  /\b(?:deemed\s+(?:to\s+be\s+)?(?:accepted|approved)|automatically\s+(?:accepted|approved)|considered\s+(?:to\s+be\s+)?(?:accepted|approved)|(?:silence|no\s+response)\s+(?:counts?\s+as|means|is|constitutes)\s+(?:acceptance|approval))\b/i;

const WHY = 'Delivery or payment waits on an approval that has no deadline, so it can be delayed without limit.';
const SUGGESTION =
  'Add a review period and a default: the client reviews within [N] business days; with no written response, the milestone is deemed accepted.';

function handled(masked: string): boolean {
  return has(WINDOW_RE, masked) || has(DEEMED_RE, masked) || hasPointer(masked);
}

/** TIME-03: milestone, delivery or payment depends on approval with no time window. */
export function checkTime03(sentences: Sentence[]): RuleOutcome {
  const findings: Finding[] = [];
  let sawCue = false;

  sentences.forEach((s, i) => {
    const excluded = EXCLUDED_SENSE.flatMap((re) => findAll(re, s.masked));
    const cues = dropOverlapping(findAll(ACCEPT_CUE_RE, s.masked), excluded);
    if (cues.length === 0 || !has(MILESTONE_RE, s.masked)) return;
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
