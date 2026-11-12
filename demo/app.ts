import { DISCLAIMER_SHORT, RULE_INFO, scan } from '../src/index.js';
import type { Finding, ScanResult } from '../src/index.js';
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

function renderDocument(text: string, findings: Finding[]): void {
  const box = $('doc');
  box.replaceChildren();
  for (const seg of toSegments(text, findings)) {
    if (seg.findings.length === 0) {
      box.append(document.createTextNode(seg.text));
    } else {
      const mark = el('mark', 'hit', seg.text);
      mark.title = seg.findings.map((i) => findings[i]?.ruleId ?? '').join(', ');
      mark.dataset['n'] = seg.findings.map((i) => i + 1).join(',');
      box.append(mark);
    }
  }
}

function renderFindings(result: ScanResult): void {
  const list = $('findings');
  list.replaceChildren();
  if (result.findings.length === 0) list.append(el('p', 'none', 'No findings. That does not mean the document is free of risk.'));
  result.findings.forEach((f, i) => {
    const card = el('article', `card ${f.severity === 'High' ? 'high' : 'medium'}`);
    const head = el('h3', undefined, `${i + 1}. ${f.ruleId}${f.part ? ` (${f.part})` : ''}${f.category ? ` · ${f.category}` : ''}`);
    head.append(el('span', 'sev', f.severity));
    const quote = el('blockquote', undefined, f.sentence);
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
    card.append(head, quote, why, sug, ...(caution ? [caution] : []), copy);
    list.append(card);
  });
  const status = $('status');
  status.replaceChildren();
  for (const [id, s] of Object.entries(result.status)) status.append(el('li', undefined, `${id}: ${s}`));
}

function run(): void {
  const text = $<HTMLTextAreaElement>('input').value;
  const out = $('result');
  const err = $('error');
  err.textContent = '';
  try {
    const result = scan(text);
    renderDocument(text, result.findings);
    renderFindings(result);
    out.hidden = false;
  } catch (e) {
    out.hidden = true;
    err.textContent = e instanceof RangeError ? e.message : 'Could not scan this text.';
  }
}

$('scan').addEventListener('click', run);
$('sample').addEventListener('click', () => {
  $<HTMLTextAreaElement>('input').value = SAMPLE;
  run();
});
$('clear').addEventListener('click', () => {
  $<HTMLTextAreaElement>('input').value = '';
  $('result').hidden = true;
  $('error').textContent = '';
});
$('short-disclaimer').textContent = DISCLAIMER_SHORT;
$('rules').replaceChildren(...RULE_INFO.map((r) => el('li', undefined, `${r.id} — ${r.name}`)));
