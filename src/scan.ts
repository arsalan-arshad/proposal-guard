import { checkHost02 } from './rules/host02.js';
import { checkRevise04 } from './rules/revise04.js';
import { checkScope01 } from './rules/scope01.js';
import { checkTime03 } from './rules/time03.js';
import { segment } from './segment.js';
import type { Finding, RuleId, ScanOptions, ScanResult } from './types.js';

/** The short disclaimer from DISCLAIMER_TEXT.md. Show it wherever findings are shown. */
export const DISCLAIMER_SHORT =
  'Not legal advice. Proposal Guard flags wording that often leads to scope disputes. It does not check whether a clause is lawful, enforceable or complete, and "no findings" does not mean "no risk".';

export const DEFAULT_MAX_CHARS = 500_000;

/**
 * Scans a draft proposal or statement of work with the four v1 rules.
 *
 * Deterministic and offline: no network calls, no storage, no model. The input
 * is treated as untrusted text and is only ever matched against fixed patterns.
 */
export function scan(text: string, options: ScanOptions = {}): ScanResult {
  if (typeof text !== 'string') throw new TypeError('scan() expects a string');
  const max = options.maxChars ?? DEFAULT_MAX_CHARS;
  if (text.length > max) {
    throw new RangeError(`Input is ${text.length} characters; the limit is ${max}.`);
  }

  const sentences = segment(text);

  // REVISE-04 runs first: where it fires on a phrase, SCOPE-01 stays silent on it.
  const revise = checkRevise04(sentences);
  const claimed = revise.findings.flatMap((f) => f.terms);
  const scope = checkScope01(sentences, claimed);
  const time = checkTime03(
    sentences,
    new Set(revise.findings.filter((f) => f.part === 'a').map((f) => f.start)),
  );
  const host = checkHost02(sentences);

  const order: RuleId[] = ['SCOPE-01', 'TIME-03', 'HOST-02', 'REVISE-04'];
  const findings: Finding[] = [...scope.findings, ...time.findings, ...host.findings, ...revise.findings].sort(
    (a, b) => a.start - b.start || order.indexOf(a.ruleId) - order.indexOf(b.ruleId),
  );

  return {
    findings,
    status: {
      'SCOPE-01': scope.status,
      'TIME-03': time.status,
      'HOST-02': host.status,
      'REVISE-04': revise.status,
    },
    disclaimer: DISCLAIMER_SHORT,
  };
}
