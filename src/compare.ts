import { CHANGE_ORDER_RE } from './rules/revise04.js';
import { CATEGORIES, HOST02_CAUTION, analyseHost02, hostCovers, suggestion as hostSuggestion } from './rules/host02.js';
import { findAll, has } from './patterns.js';
import { DEFAULT_MAX_CHARS, DISCLAIMER_SHORT, scanSentences } from './scan.js';
import { segment } from './segment.js';
import type {
  CompareCheckId,
  CompareFinding,
  CompareItem,
  CompareOptions,
  CompareResult,
  Finding,
  RuleId,
  RuleStatus,
  Sentence,
  Severity,
  Source,
  Term,
} from './types.js';

/**
 * Compare mode: the client's text ("reference") next to your proposal.
 *
 * Deterministic and offline, like `scan()`. Both texts are untrusted data and are only matched against fixed
 * patterns. Marks are highlights on sentences; there is no score. The checks are defined in RULES_SPEC.md (CMP-01 to CMP-03).
 */
export const DEFAULT_MAX_TOTAL_CHARS = 1_000_000;

/**
 * `experimental` until a check passes the shipping bar fixed before the held-out run (docs/EVALUATION.md):
 * precision of at least 60% on held-out pairs, with at least 8 reported findings.
 */
export const COMPARE_MATURITY: Record<CompareCheckId, 'experimental' | 'stable'> = {
  'CMP-01': 'experimental',
  'CMP-02': 'experimental',
  'CMP-03': 'experimental',
};

export const ROLE_NOTE: Record<Source, string> = {
  reference: "From the client's text: wording you would be accepting if you sign it.",
  proposal: 'From your proposal: wording you are offering.',
};

const RULE_ORDER: RuleId[] = ['SCOPE-01', 'TIME-03', 'HOST-02', 'REVISE-04'];

function tag(f: Finding, source: Source, check: CompareFinding['check']): CompareFinding {
  const out: CompareFinding = { ...f, source, check, roleNote: ROLE_NOTE[source] };
  if (check !== 'RULES' && COMPARE_MATURITY[check] === 'experimental') out.experimental = true;
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// CMP-03: number mismatch on a short fixed list

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  fourteen: 14, fifteen: 15, twenty: 20, thirty: 30,
};
const WORD_ALT = 'one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fourteen|fifteen|twenty|thirty';
const NUM_TOKEN = `(\\d{1,4}|a\\s+single|${WORD_ALT})`;
/** An optional "(3)" or "(three)" after a number. */
const PAREN = `(?:\\s*\\((?:\\d{1,4}|${WORD_ALT})\\))?`;
/** Not the tail of a longer figure or a range ("1,000", "2.5", "$50", "14-30", "twenty-five"). */
const NOT_AFTER_FIGURE = '(?<![\\d.,$€£\\-–—])';

function parseNumber(token: string): number | undefined {
  const t = token.toLowerCase().replace(/\s+/g, ' ');
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  if (t === 'a single') return 1;
  return NUMBER_WORDS[t];
}

const REVISION_RES: RegExp[] = [
  new RegExp(
    `${NOT_AFTER_FIGURE}\\b${NUM_TOKEN}${PAREN}\\s+(?:(?:included|free|standard|minor|major|complimentary)\\s+)?(?:revision\\s+rounds?|feedback\\s+rounds?|rounds?\\s+of\\s+(?:\\w+\\s+)?(?:revisions?|changes|edits|feedback|amendments)|revisions?)\\b`,
    'gi',
  ),
  // Term-sheet form: "Revisions: 2", "| Revision rounds | three |". A number followed by a unit or a longer word is not a count.
  new RegExp(
    `\\b(?:revision\\s+rounds?|revisions?|rounds?\\s+of\\s+revisions?)\\s*[:|=]\\s*(?:\\|\\s*)?${NUM_TOKEN}\\b(?!\\s*(?:days?|weeks?|hours?|months?|%|usd|eur|gbp|\\w))`,
    'gi',
  ),
];
const PAID_EXTRA_RE = /\b(?:extra|additional|further|beyond|more|after)\b/i;
const PER_AFTER_RE = /\b(?:per|each|every)\s+(?!(?:additional|extra|further|other|subsequent)\b)(\w+)/i;
const LABEL_BEFORE_RE = /\b(?:round|version|phase|release|rev|draft|stage|sprint|iteration|step|chapter|section|page|v)\.?\s*$/i;
const FLOOR_BEFORE_RE = /\b(?:at\s+least|minimum(?:\s+of)?|no\s+fewer\s+than|no\s+less\s+than)\s*$/i;
const HISTORY_RE = /\b(?:git|version\s+history|version\s+control|revision\s+history)\b/i;
const RANGE_BEFORE_RE = /(?:\d|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve))\s*(?:to|or)\s*$/i;

const INTRO = 'within|in|inside|after|of|has|have|gets?|given|allowed';
const DURATION_RE = new RegExp(
  `(?:\\b(${INTRO})\\s+(?:the\\s+(?:next\\s+|first\\s+)?|those\\s+|these\\s+|that\\s+)?)?${NOT_AFTER_FIGURE}\\b${NUM_TOKEN}${PAREN}([- ])(?:(calendar|business|working)[- ])?(hours?|days?|weeks?)\\b`,
  'gi',
);
const NET_RE = /\bnet[\s-]+(\d{1,3})\b(?!\s*(?:%|weeks?|months?|hours?))/gi;
const BOUND_BEFORE_RE =
  /\b(?:at\s+least|at\s+most|minimum|maximum|up\s+to|no\s+more\s+than|no\s+less\s+than|no\s+later\s+than|over|under|about|approximately|around|roughly|nearly|almost)\s*$/i;

const CLAUSE_BREAK_RE = /;|,|\s(?:and|but|then|while|or)\s|\s[—–]\s|—/gi;
/** After a duration, the clause ends at an anchor word: "within 5 days of project approval" is about the 5 days, not the approval. */
const ANCHOR_RE = /\b(?:of|after|from|following|since|upon|once|when)\b/i;
const CLAUSE_SPAN = 100;
const PAYMENT_CUE_RE = /\b(?:invoice\w*|payments?|payable|pay|pays|paying|paid|balance|deposit|remit\w*|settle\w*)\b/i;
const REVIEW_CUE_RE = /\b(?:review\w*|approv\w*|accept(?:s|ed|ing|ance)?|sign[- ]?off|feedback|proofs?|confirm\w*)\b/i;
const DELIVERY_CUE_RE = /\b(?:delivery|delivered|delivers?|launch\w*|go(?:es)?\s+live|completion|handover|deadline|turnaround|finish\w*|complete[ds]?)\b/i;
/** "complete" is a delivery cue unless what is completed is a form-like client task ("complete the intake form"). */
const CLIENT_TASK_RE = /\bcomplet\w*\s+(?:the\s+|an?\s+|our\s+|your\s+)?(?:\w+\s+){0,2}?(?:forms?|surveys?|questionnaires?|checklists?|paperwork|onboarding|registrations?|applications?\s+forms?)\b/i;
const MILESTONE_WORD_RE =
  /\b(?:first|initial|drafts?|prototypes?|mock-?ups?|wireframes?|phases?|milestones?|stages?|rounds?|sprints?|beta|demos?|previews?|each|per|every)\b/i;
/** Other senses of a duration: warranty, interest, offer validity, discounts. The sentence is skipped. */
const OTHER_SENSE_RE =
  /\b(?:warrant\w*|guarantee\w*|interest|penalt\w*|late\s+fees?|expire\w*|valid(?:ity)?|bug[- ]?fix\w*|support\s+period|maintenance\s+period|retain\w*|retention|accru\w*|discounts?|early|(?:this|the|our|my)\s+(?:quote|quotation|proposal|offer|estimate))\b/i;
/** The freelancer answering feedback is not the client's review window. */
const OWN_FEEDBACK_RE = /\b(?:answer|respond(?:s)?\s+to|incorporat\w*|implement\w*|address\w*|act(?:s)?\s+on|appl(?:y|ies))\b[^.;,]{0,25}\bfeedback\b/i;
const DEPOSIT_RE = /\b(?:deposit|advance|retainer|up-?front|down\s*payment)\b/i;
const FINAL_RE = /\b(?:balance|final|remaining|last)\b/i;

export interface Mention {
  item: CompareItem;
  /** Unit or scope key: `hour`, `day`, `business-day`, `week` (durations, payment may add `:deposit` or `:final`); `total` or `per:<noun>` (revisions). */
  unit: string;
  value: number;
  sentence: Sentence;
  term: Term;
}

/** The clause around a duration: back to the nearest break, forward to the nearest break or anchor word (at most 100 characters each side). */
function clauseAround(masked: string, start: number, end: number, inRow: boolean): string {
  const before = masked.slice(Math.max(0, start - CLAUSE_SPAN), start);
  let from = 0;
  for (const m of findAll(CLAUSE_BREAK_RE, before)) from = m.end;
  if (inRow) {
    // In a table row the clause is the duration's own cell and the cell before it.
    const pipes = [...before.matchAll(/\|/g)].map((m) => m.index ?? 0);
    if (pipes.length >= 2) from = Math.max(from, (pipes[pipes.length - 2] as number) + 1);
  }
  let after = masked.slice(end, end + CLAUSE_SPAN);
  const cut = [findAll(CLAUSE_BREAK_RE, after)[0]?.start, after.search(ANCHOR_RE), inRow ? after.indexOf('|') : -1]
    .filter((n): n is number => n !== undefined && n >= 0)
    .sort((a, b) => a - b)[0];
  if (cut !== undefined) after = after.slice(0, cut);
  return before.slice(from) + masked.slice(start, end) + after;
}

function durationItem(clause: string, hasMilestoneWord: () => boolean): CompareItem | undefined {
  if (OWN_FEEDBACK_RE.test(clause)) return undefined;
  if (PAYMENT_CUE_RE.test(clause)) return 'payment';
  if (REVIEW_CUE_RE.test(clause)) return 'review';
  if (DELIVERY_CUE_RE.test(clause.replace(CLIENT_TASK_RE, ' ')) && !hasMilestoneWord()) return 'delivery';
  return undefined;
}

function unitKey(qualifier: string | undefined, unit: string): string {
  const u = unit.toLowerCase().replace(/s$/, '');
  if (u === 'day' && qualifier && /^(?:business|working)$/i.test(qualifier)) return 'business-day';
  return u;
}

function paymentSub(clause: string): string {
  return DEPOSIT_RE.test(clause) ? ':deposit' : FINAL_RE.test(clause) ? ':final' : '';
}

/**
 * Table rows are read as one unit: the cells of a row joined with their pipes, quoted as the whole row (so offsets
 * stay valid). Everything else is one unit per sentence.
 */
function readingUnits(sentences: Sentence[], text: string): Array<{ s: Sentence; inRow: boolean }> {
  const out: Array<{ s: Sentence; inRow: boolean }> = [];
  let i = 0;
  while (i < sentences.length) {
    const first = sentences[i] as Sentence;
    if (first.row === undefined) {
      out.push({ s: first, inRow: false });
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < sentences.length && (sentences[j + 1] as Sentence).row === first.row) j++;
    const last = sentences[j] as Sentence;
    const chars = text.slice(first.start, last.end).split('');
    for (let k = i; k <= j; k++) {
      const c = sentences[k] as Sentence;
      for (let p = 0; p < c.masked.length; p++) chars[c.start - first.start + p] = c.masked.charAt(p);
    }
    out.push({
      s: { ...first, text: text.slice(first.start, last.end), masked: chars.join(''), start: first.start, end: last.end, heading: false },
      inRow: true,
    });
    i = j + 1;
  }
  return out;
}

/** Everything CMP-03 can read from one text. `text` is the original input the sentences came from. */
export function extractMentions(sentences: Sentence[], text?: string): Mention[] {
  const out: Mention[] = [];
  const units = text === undefined ? sentences.map((s) => ({ s, inRow: false })) : readingUnits(sentences, text);
  for (const { s, inRow } of units) {
    if (s.heading) continue;
    const m = s.masked;
    const history = HISTORY_RE.test(m);
    let milestone: boolean | undefined; // computed at most once per sentence: it scans the whole sentence
    const hasMilestoneWord = (): boolean => (milestone ??= MILESTONE_WORD_RE.test(m));
    for (const re of REVISION_RES) {
      if (history) break;
      for (const hit of matchesWithGroups(re, m)) {
        const token = hit.groups[0];
        const value = token === undefined ? undefined : parseNumber(token);
        if (value === undefined) continue;
        const numStart = hit.start + hit.text.search(/\S/);
        const before = m.slice(Math.max(0, numStart - 25), numStart);
        if (PAID_EXTRA_RE.test(before)) continue;
        if (RANGE_BEFORE_RE.test(m.slice(Math.max(0, numStart - 12), numStart))) continue;
        if (LABEL_BEFORE_RE.test(m.slice(Math.max(0, numStart - 12), numStart))) continue;
        if (FLOOR_BEFORE_RE.test(m.slice(Math.max(0, numStart - 20), numStart))) continue;
        const after = PER_AFTER_RE.exec(m.slice(hit.end, hit.end + 40)) ?? PER_AFTER_RE.exec(m.slice(Math.max(0, numStart - 25), numStart));
        const unit = after?.[1] ? `per:${after[1].toLowerCase().replace(/s$/, '')}` : 'total';
        out.push({ item: 'revisions', unit, value, sentence: s, term: { text: hit.text, start: hit.start, end: hit.end } });
      }
    }
    if (OTHER_SENSE_RE.test(m)) continue;
    for (const hit of matchesWithGroups(DURATION_RE, m)) {
      const [intro, token, sep, qualifier, unit] = hit.groups;
      if (token === undefined || unit === undefined) continue;
      // Needs "within 5 days" or "5-day"; in a table row a duration that starts its own cell needs no introducer.
      if (intro === undefined && sep !== '-' && !(inRow && /\|\s*$/.test(m.slice(0, hit.start)))) continue;
      if (BOUND_BEFORE_RE.test(m.slice(Math.max(0, hit.start - 20), hit.start))) continue;
      const value = parseNumber(token);
      if (value === undefined) continue;
      const clause = clauseAround(m, hit.start, hit.end, inRow);
      const item = durationItem(clause, hasMilestoneWord);
      if (item === undefined) continue;
      out.push({
        item,
        unit: unitKey(qualifier, unit) + (item === 'payment' ? paymentSub(clause) : ''),
        value,
        sentence: s,
        term: { text: hit.text, start: hit.start, end: hit.end },
      });
    }
    for (const hit of matchesWithGroups(NET_RE, m)) {
      const value = parseNumber(hit.groups[0] ?? '');
      if (value === undefined) continue;
      out.push({ item: 'payment', unit: 'day' + paymentSub(clauseAround(m, hit.start, hit.end, inRow)), value, sentence: s, term: { text: hit.text, start: hit.start, end: hit.end } });
    }
  }
  return out;
}

interface Hit {
  text: string;
  start: number;
  end: number;
  groups: Array<string | undefined>;
}

function matchesWithGroups(re: RegExp, s: string): Hit[] {
  const g = re.global ? re : new RegExp(re.source, re.flags + 'g');
  g.lastIndex = 0;
  const out: Hit[] = [];
  let m: RegExpExecArray | null;
  while ((m = g.exec(s)) !== null) {
    if (m[0].length === 0) {
      g.lastIndex++;
      continue;
    }
    out.push({ text: m[0], start: m.index, end: m.index + m[0].length, groups: m.slice(1) });
  }
  g.lastIndex = 0;
  return out;
}

const WHY_MISMATCH = 'The two documents give different numbers for the same term, so it is unclear which one governs.';
const MISMATCH_SUGGESTION: Record<CompareItem, string> = {
  revisions: 'Make both documents state the same number of included revision rounds: [N] rounds per [milestone or project].',
  review: 'Agree one review window and write it into the proposal: the client reviews within [N] business days.',
  payment: 'Agree one payment term and state it once: invoices are due within [N] days of the invoice date.',
  delivery: 'Agree one delivery time and state it once: delivery within [N] weeks of [start event].',
};
const MISMATCH_SEVERITY: Record<CompareItem, Severity> = { revisions: 'Medium', review: 'Medium', payment: 'High', delivery: 'Medium' };

function checkNumberMismatch(refSentences: Sentence[], propSentences: Sentence[], refText: string, propText: string): { findings: CompareFinding[]; status: RuleStatus } {
  const ref = extractMentions(refSentences, refText);
  const prop = extractMentions(propSentences, propText);
  const keys = new Set<string>();
  const keyOf = (m: Mention): string => `${m.item}|${m.unit}`;
  for (const m of ref) keys.add(keyOf(m));
  const findings: CompareFinding[] = [];
  let compared = false;
  for (const key of [...keys].sort()) {
    const r = ref.filter((m) => keyOf(m) === key);
    const p = prop.filter((m) => keyOf(m) === key);
    if (r.length === 0 || p.length === 0) continue;
    compared = true;
    const rv = [...new Set(r.map((m) => m.value))].sort((a, b) => a - b);
    const pv = [...new Set(p.map((m) => m.value))].sort((a, b) => a - b);
    if (rv.some((v) => pv.includes(v))) continue;
    const item = (r[0] as Mention).item;
    const unit = (r[0] as Mention).unit;
    const group = `CMP-03:${item}:${unit}`;
    for (const [source, mentions] of [['reference', r], ['proposal', p]] as const) {
      const first = (mentions[0] as Mention).sentence;
      const inFirst = mentions.filter((m) => m.sentence === first);
      const f: CompareFinding = {
        source,
        check: 'CMP-03',
        severity: MISMATCH_SEVERITY[item],
        sentence: first.text,
        start: first.start,
        end: first.end,
        terms: inFirst.map((m) => ({ text: first.text.slice(m.term.start, m.term.end), start: first.start + m.term.start, end: first.start + m.term.end })),
        why: WHY_MISMATCH,
        suggestion: MISMATCH_SUGGESTION[item],
        roleNote: ROLE_NOTE[source],
        item,
        unit,
        values: { reference: rv, proposal: pv },
        group,
      };
      if (COMPARE_MATURITY['CMP-03'] === 'experimental') f.experimental = true;
      findings.push(f);
    }
  }
  return { findings, status: findings.length > 0 ? 'findings' : compared ? 'passed' : 'not applicable' };
}

// ---------------------------------------------------------------------------------------------------------------
// CMP-02: a paid service named in the client's text, no payer stated in either text

const WHY_COST =
  "The client's text names a paid third-party service and neither document says who pays for that kind of cost, so the cost can land on you.";

function checkCostWithoutPayer(refSentences: Sentence[], propSentences: Sentence[]): { findings: CompareFinding[]; status: RuleStatus } {
  const refInfo = analyseHost02(refSentences);
  const propInfo = analyseHost02(propSentences);
  const findings: CompareFinding[] = [];
  let sawCue = false;
  for (const cat of CATEGORIES) {
    const first = refInfo.find((p) => p.byCategory.has(cat.id));
    if (!first) continue;
    sawCue = true;
    if (hostCovers(refInfo, cat.id) || hostCovers(propInfo, cat.id)) continue;
    const terms = first.byCategory.get(cat.id) as Term[];
    const f: CompareFinding = {
      source: 'reference',
      check: 'CMP-02',
      ruleId: 'HOST-02',
      severity: cat.severity,
      sentence: first.s.text,
      start: first.s.start,
      end: first.s.end,
      terms: terms.map((t) => ({ text: first.s.text.slice(t.start, t.end), start: first.s.start + t.start, end: first.s.start + t.end })),
      why: WHY_COST,
      suggestion: hostSuggestion(cat.label),
      roleNote: ROLE_NOTE.reference,
      category: cat.id,
      caution: HOST02_CAUTION,
    };
    if (COMPARE_MATURITY['CMP-02'] === 'experimental') f.experimental = true;
    findings.push(f);
  }
  return { findings, status: findings.length > 0 ? 'findings' : sawCue ? 'passed' : 'not applicable' };
}

// ---------------------------------------------------------------------------------------------------------------

/** Empty, or only whitespace and invisible characters (zero-width space and joiners, byte-order mark). */
function isEmptyText(s: string): boolean {
  return /^[\s\u200b-\u200d\u2060\ufeff]*$/.test(s);
}

const NOT_APPLICABLE: Record<CompareCheckId, RuleStatus> = { 'CMP-01': 'not applicable', 'CMP-02': 'not applicable', 'CMP-03': 'not applicable' };

/**
 * Compares the client's text with your proposal. With an empty client's text the result is the plain scan of the
 * proposal (every finding tagged `proposal`, check `RULES`) and all compare checks are `not applicable`.
 */
export function compare(reference: string, proposal: string, options: CompareOptions = {}): CompareResult {
  if (typeof reference !== 'string' || typeof proposal !== 'string') throw new TypeError('compare() expects two strings');
  const max = options.maxChars ?? DEFAULT_MAX_CHARS;
  const maxTotal = options.maxTotalChars ?? DEFAULT_MAX_TOTAL_CHARS;
  for (const [name, text] of [['The client\'s text', reference], ['The proposal', proposal]] as const) {
    if (text.length > max) throw new RangeError(`${name} is ${text.length} characters; the limit is ${max} per text.`);
  }
  if (reference.length + proposal.length > maxTotal) {
    throw new RangeError(`The two texts are ${reference.length + proposal.length} characters together; the limit is ${maxTotal}.`);
  }

  const propSentences = segment(proposal);
  const propScan = scanSentences(propSentences);
  const proposalFindings = propScan.findings.map((f) => tag(f, 'proposal', 'RULES'));

  if (isEmptyText(reference)) {
    return { findings: proposalFindings, status: { ...NOT_APPLICABLE }, proposalStatus: propScan.status, hasReference: false, disclaimer: DISCLAIMER_SHORT };
  }

  const refSentences = segment(reference);
  const refScan = scanSentences(refSentences);

  // CMP-01: SCOPE-01, TIME-03 and REVISE-04 on the client's text. HOST-02 is CMP-02's job. REVISE-04 part (b) is only
  // worth marking if the proposal does not itself price extra work.
  const proposalHasChangeOrder = propSentences.some((s) => has(CHANGE_ORDER_RE, s.masked));
  const cmp01 = refScan.findings
    .filter((f) => f.ruleId !== 'HOST-02' && !(f.ruleId === 'REVISE-04' && f.part === 'b' && proposalHasChangeOrder))
    .map((f) => tag(f, 'reference', 'CMP-01'));
  const cmp01Status: RuleStatus =
    cmp01.length > 0
      ? 'findings'
      : (['SCOPE-01', 'TIME-03', 'REVISE-04'] as const).some((r) => refScan.status[r] !== 'not applicable')
        ? 'passed'
        : 'not applicable';

  const cmp02 = checkCostWithoutPayer(refSentences, propSentences);
  const cmp03 = checkNumberMismatch(refSentences, propSentences, reference, proposal);

  const sourceRank = (f: CompareFinding): number => (f.source === 'reference' ? 0 : 1);
  const checkRank = (f: CompareFinding): number => ['CMP-01', 'CMP-02', 'CMP-03', 'RULES'].indexOf(f.check);
  const findings = [...cmp01, ...cmp02.findings, ...cmp03.findings, ...proposalFindings].sort(
    (a, b) =>
      sourceRank(a) - sourceRank(b) ||
      a.start - b.start ||
      checkRank(a) - checkRank(b) ||
      RULE_ORDER.indexOf(a.ruleId ?? 'SCOPE-01') - RULE_ORDER.indexOf(b.ruleId ?? 'SCOPE-01'),
  );

  return {
    findings,
    status: { 'CMP-01': cmp01Status, 'CMP-02': cmp02.status, 'CMP-03': cmp03.status },
    proposalStatus: propScan.status,
    hasReference: true,
    disclaimer: DISCLAIMER_SHORT,
  };
}
