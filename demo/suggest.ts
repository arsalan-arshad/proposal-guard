import { DISCLAIMER_SHORT, buildSuggestionRequest, formatSuggestionPrompt, numbersNotInTexts } from '../src/index.js';
import type { CompareFinding, SuggestionRequest } from '../src/index.js';

/**
 * Tab 3. Builds a prompt on this page and shows it. It sends nothing anywhere: this page has no key field, makes no
 * network request (its content-security policy forbids them) and stores nothing. The clipboard is written only when the
 * person clicks "Copy the prompt". Everything shown is written with textContent, never as HTML.
 */

const SAMPLE_BRIEF = [
  '# Job post: bakery website',
  '',
  'We need a modern, user-friendly website for our bakery, and delivery is expected within 6 weeks.',
  '',
  'Our owner reviews each page and we pay invoices within 30 days.',
  '',
  'The site will run on AWS and send order updates by SMS. We also want an online ordering page that customers love.',
].join('\n');

const SAMPLE_DRAFT = [
  '# Proposal',
  '',
  'I will build the website in 8 weeks. You have 5 business days to review each page and invoices are due net 14.',
  '',
  'Unlimited revisions are included.',
].join('\n');

const $ = <T extends HTMLElement>(id: string): T => {
  const e = document.getElementById(id);
  if (!e) throw new Error(`missing #${id}`);
  return e as T;
};

function el(tag: string, className?: string, text?: string): HTMLElement {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

let prepared: SuggestionRequest | undefined;
let preparedTexts: { brief: string; draft: string } | undefined;

function invalidate(): void {
  prepared = undefined;
  preparedTexts = undefined;
  $('prepared').hidden = true;
  $('numbers-box').hidden = true;
  $('copy-status').textContent = '';
}

function describe(f: CompareFinding): string {
  const who = f.source === 'reference' ? "Client's text" : 'Your draft';
  const what = f.check === 'RULES' ? (f.ruleId ?? '') : f.ruleId ? `${f.check} (${f.ruleId})` : f.check;
  return `${who} · ${what}${f.item ? ` · ${f.item}` : ''}${f.category ? ` · ${f.category}` : ''}`;
}

function renderFindings(findings: CompareFinding[]): void {
  const list = $('findings');
  list.replaceChildren();
  if (findings.length === 0) list.append(el('p', 'none', 'The fixed rules found nothing. That does not mean the text is free of risk.'));
  findings.forEach((f, i) => {
    const card = el('article', `card ${f.severity === 'High' ? 'high' : 'medium'}`);
    const head = el('h3', undefined, `${i + 1}. ${describe(f)}`);
    head.append(el('span', 'sev', f.severity));
    if (f.experimental) head.append(el('span', 'sev', 'experimental'));
    card.append(head, el('blockquote', undefined, f.sentence), el('p', undefined, f.why), el('p', 'sug', f.suggestion));
    if (f.caution) card.append(el('p', 'caution', f.caution));
    list.append(card);
  });
}

function prepare(): void {
  const brief = $<HTMLTextAreaElement>('brief').value;
  const draft = $<HTMLTextAreaElement>('draft').value;
  const err = $('error');
  err.textContent = '';
  invalidate();
  if (brief.trim() === '' || draft.trim() === '') {
    err.textContent = "Fill in both boxes: the client's text and your draft.";
    return;
  }
  try {
    const req = buildSuggestionRequest(brief, draft);
    prepared = req;
    preparedTexts = { brief, draft };
    renderFindings(req.findings);
    $('sent-summary').textContent = `${req.textChars} characters of your two texts plus the fixed instructions and the rule findings. Nothing has been sent anywhere.`;
    $('sent').textContent = formatSuggestionPrompt(req);
    $('prepared').hidden = false;
  } catch (e) {
    err.textContent = e instanceof RangeError ? e.message : 'Could not prepare the prompt.';
  }
}

function checkNumbers(): void {
  if (!preparedTexts) return;
  const reply = $<HTMLTextAreaElement>('reply').value;
  const list = $('numbers');
  list.replaceChildren();
  const seen = new Set<string>();
  for (const h of numbersNotInTexts(preparedTexts.brief, preparedTexts.draft, reply)) {
    if (seen.has(h.text)) continue;
    seen.add(h.text);
    list.append(el('li', undefined, h.text));
  }
  $('numbers-none').hidden = seen.size > 0;
  $('numbers-box').hidden = false;
}

$('prepare').addEventListener('click', prepare);
$('copy').addEventListener('click', () => {
  if (!prepared) return;
  // The clipboard is written only when the person clicks.
  void navigator.clipboard?.writeText(formatSuggestionPrompt(prepared)).then(
    () => ($('copy-status').textContent = 'Copied. Paste it into the assistant you choose.'),
    () => ($('copy-status').textContent = 'Copy failed; select the text above and copy it yourself.'),
  );
});
$('check-numbers').addEventListener('click', checkNumbers);
$('sample').addEventListener('click', () => {
  $<HTMLTextAreaElement>('brief').value = SAMPLE_BRIEF;
  $<HTMLTextAreaElement>('draft').value = SAMPLE_DRAFT;
  invalidate();
});
$('clear').addEventListener('click', () => {
  for (const id of ['brief', 'draft', 'reply']) $<HTMLTextAreaElement>(id).value = '';
  $('error').textContent = '';
  invalidate();
});
for (const id of ['brief', 'draft']) $(id).addEventListener('input', invalidate);
$('short-disclaimer').textContent = DISCLAIMER_SHORT;
