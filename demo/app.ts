import { DISCLAIMER_SHORT, RULE_INFO, compare, scan } from '../src/index.js';
import type { CompareFinding, CompareResult, Finding, ScanResult } from '../src/index.js';
import { toSegments } from './render.js';

/**
 * Browser demo. Everything runs on this page: no network request is made, nothing
 * is stored, and pasted text is only ever written to the page with textContent
 * (never as HTML).
 */

const SAMPLE = [
  '# Website project',
  '',
  'We will build a fast, seamless website with pages for About, Services and Contact, plus anything else needed.',
  '',
  'Each milestone is paid once the client approves it.',
  '',
  'The site will be hosted on Vercel and use an AI API for the chat widget.',
  '',
  'Unlimited revisions are included.',
].join('\n');

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
};

function el(tag: string, className?: string, text?: string): HTMLElement {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

const SAMPLE_CLIENT = [
  '# Job post: shop website',
  '',
  'We need a modern, user-friendly shop site, and delivery is expected within 6 weeks.',
  '',
  'Our team reviews each milestone and we pay invoices within 30 days.',
  '',
  'The site will run on AWS and send order updates by SMS.',
].join('\n');

const SAMPLE_PROPOSAL = [
  '# Proposal',
  '',
  'Delivery is in 8 weeks. You have 5 business days to review each milestone and invoices are due net 14.',
  '',
  'Two rounds of revisions are included.',
].join('\n');

/**
 * Writes `text` into the element with the given id, with the marked sentences highlighted. `numbers[i]` is the number
 * shown for `findings[i]` (so two boxes can share one numbering). Text only, never HTML.
 */
function renderDocument(boxId: string, text: string, findings: Array<{ start: number; end: number; ruleId?: string; check?: string }>, numbers?: number[]): void {
  const box = $(boxId);
  box.replaceChildren();
  for (const seg of toSegments(text, findings as Finding[])) {
    if (seg.findings.length === 0) {
      box.append(document.createTextNode(seg.text));
    } else {
      const mark = el('mark', 'hit', seg.text);
      mark.title = seg.findings.map((i) => findings[i]?.ruleId ?? findings[i]?.check ?? '').join(', ');
      mark.dataset['n'] = seg.findings.map((i) => numbers?.[i] ?? i + 1).join(',');
      box.append(mark);
    }
  }
}

function renderFindings(result: ScanResult): void {
  renderCards(result.findings, result.status);
}

function describe(f: Finding | CompareFinding): string {
  if ('source' in f) {
    const who = f.source === 'reference' ? "Client's text" : 'Your proposal';
    const what = f.check === 'RULES' ? (f.ruleId ?? '') : f.ruleId ? `${f.check} (${f.ruleId})` : f.check;
    return `${who} · ${what}${f.part ? ` (${f.part})` : ''}${f.category ? ` · ${f.category}` : ''}${f.item ? ` · ${f.item}` : ''}`;
  }
  return `${f.ruleId}${f.part ? ` (${f.part})` : ''}${f.category ? ` · ${f.category}` : ''}`;
}

function renderCards(findings: Array<Finding | CompareFinding>, status: Record<string, string>): void {
  const list = $('findings');
  list.replaceChildren();
  if (findings.length === 0) list.append(el('p', 'none', 'No findings. That does not mean the document is free of risk.'));
  findings.forEach((f, i) => {
    const card = el('article', `card ${f.severity === 'High' ? 'high' : 'medium'}`);
    const head = el('h3', undefined, `${i + 1}. ${describe(f)}`);
    head.append(el('span', 'sev', f.severity));
    if ('experimental' in f && f.experimental) head.append(el('span', 'sev', 'experimental'));
    const role = 'roleNote' in f ? el('p', 'role', f.roleNote) : undefined;
    const quote = el('blockquote', undefined, f.sentence);
    const nums =
      'values' in f && f.values
        ? el('p', 'role', `Numbers read from the texts: client's text ${f.values.reference.join(', ')}; proposal ${f.values.proposal.join(', ')} (${f.unit ?? ''}).`)
        : undefined;
    const why = el('p', undefined, f.why);
    const sug = el('p', 'sug', f.suggestion);
    const copy = el('button', 'copy', 'Copy suggestion') as HTMLButtonElement;
    copy.type = 'button';
    copy.addEventListener('click', () => {
      // The clipboard is written only when the person clicks; the suggestion is fixed text, not their document.
      void navigator.clipboard?.writeText(f.suggestion).then(
        () => (copy.textContent = 'Copied'),
        () => (copy.textContent = 'Copy failed'),
      );
    });
    const caution = f.caution ? el('p', 'caution', f.caution) : undefined;
    card.append(head, ...(role ? [role] : []), quote, ...(nums ? [nums] : []), why, sug, ...(caution ? [caution] : []), copy);
    list.append(card);
  });
  const statusList = $('status');
  statusList.replaceChildren();
  for (const [id, s] of Object.entries(status)) statusList.append(el('li', undefined, `${id}: ${s}`));
}

function renderCompare(reference: string, proposal: string, result: CompareResult): void {
  const refIdx: number[] = [];
  const propIdx: number[] = [];
  const refFindings: CompareFinding[] = [];
  const propFindings: CompareFinding[] = [];
  result.findings.forEach((f, i) => {
    if (f.source === 'reference') {
      refFindings.push(f);
      refIdx.push(i + 1);
    } else {
      propFindings.push(f);
      propIdx.push(i + 1);
    }
  });
  $('ref-block').hidden = false;
  $('doc-title').textContent = 'Your proposal, with marked sentences';
  $('status-title').textContent = 'Check status';
  renderDocument('ref-doc', reference, refFindings, refIdx);
  renderDocument('doc', proposal, propFindings, propIdx);
  const status: Record<string, string> = { ...result.status };
  for (const [id, s] of Object.entries(result.proposalStatus)) status[`${id} (on your proposal)`] = s;
  renderCards(result.findings, status);
}

function run(): void {
  const text = $<HTMLTextAreaElement>('input').value;
  const out = $('result');
  const err = $('error');
  err.textContent = '';
  const reference = $<HTMLTextAreaElement>('reference').value;
  try {
    if (reference.trim() === '') {
      // Client's box empty: exactly the single-document scan.
      const result = scan(text);
      $('ref-block').hidden = true;
      $('doc-title').textContent = 'Your text, with flagged sentences marked';
      $('status-title').textContent = 'Rule status';
      renderDocument('doc', text, result.findings);
      renderFindings(result);
    } else {
      renderCompare(reference, text, compare(reference, text));
    }
    out.hidden = false;
  } catch (e) {
    out.hidden = true;
    err.textContent = e instanceof RangeError ? e.message : 'Could not scan this text.';
  }
}

$('scan').addEventListener('click', run);
$('sample').addEventListener('click', () => {
  $<HTMLTextAreaElement>('reference').value = '';
  $<HTMLTextAreaElement>('input').value = SAMPLE;
  run();
});
$('sample-compare').addEventListener('click', () => {
  $<HTMLTextAreaElement>('reference').value = SAMPLE_CLIENT;
  $<HTMLTextAreaElement>('input').value = SAMPLE_PROPOSAL;
  run();
});
$('clear').addEventListener('click', () => {
  $<HTMLTextAreaElement>('input').value = '';
  $<HTMLTextAreaElement>('reference').value = '';
  $('result').hidden = true;
  $('error').textContent = '';
});
$('short-disclaimer').textContent = DISCLAIMER_SHORT;
$('rules').replaceChildren(...RULE_INFO.map((r) => el('li', undefined, `${r.id} — ${r.name}`)));
