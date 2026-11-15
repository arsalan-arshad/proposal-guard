import {
  DEFAULT_GEMINI_MODEL,
  DISCLAIMER_SHORT,
  GEMINI_ORIGIN,
  buildSuggestionRequest,
  geminiUrl,
  numbersNotInTexts,
} from '../src/index.js';
import type { CompareFinding, SuggestionRequest } from '../src/index.js';
import { requestSuggestion } from './call.js';

/**
 * Tab 3. The fixed rules run on this page first. Only when the person clicks "Send to Gemini", with their own key and after
 * ticking the box, one request goes to Google's Gemini API. This is the only file in the demo that calls fetch; the page's
 * content-security-policy allows that one address and nothing else. Nothing is stored. Everything shown is written with
 * textContent, never as HTML. The key lives only in the input field and in the one request header.
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
let inFlight: AbortController | undefined;

function canSend(): boolean {
  return prepared !== undefined && $<HTMLInputElement>('ack').checked && $<HTMLInputElement>('key').value.trim() !== '' && inFlight === undefined;
}
function refreshSend(): void {
  $<HTMLButtonElement>('send').disabled = !canSend();
}

function invalidate(): void {
  prepared = undefined;
  preparedTexts = undefined;
  $('prepared').hidden = true;
  $('answer').hidden = true;
  $<HTMLInputElement>('ack').checked = false;
  $('status').textContent = '';
  refreshSend();
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
    $('sent-summary').textContent = `${req.textChars} characters of your two texts, plus the fixed instructions and the rule findings below, would go to ${GEMINI_ORIGIN}. The instructions are sent as a separate system instruction.`;
    $('sent').textContent = `=== INSTRUCTIONS ===\n${req.systemInstruction}\n\n=== MESSAGE ===\n${req.userText}`;
    $<HTMLInputElement>('model').value ||= DEFAULT_GEMINI_MODEL;
    $('prepared').hidden = false;
    refreshSend();
  } catch (e) {
    err.textContent = e instanceof RangeError ? e.message : 'Could not prepare the request.';
  }
}

function showReply(text: string): void {
  $('reply').textContent = text;
  const list = $('numbers');
  list.replaceChildren();
  const hits = preparedTexts ? numbersNotInTexts(preparedTexts.brief, preparedTexts.draft, text) : [];
  const seen = new Set<string>();
  for (const h of hits) {
    if (seen.has(h.text)) continue;
    seen.add(h.text);
    list.append(el('li', undefined, h.text));
  }
  $('numbers-box').hidden = hits.length === 0;
  $('answer').hidden = false;
}

async function send(): Promise<void> {
  if (!prepared || !canSend()) return;
  const status = $('status');
  const err = $('error');
  err.textContent = '';
  try {
    geminiUrl($<HTMLInputElement>('model').value.trim());
  } catch (e) {
    err.textContent = e instanceof RangeError ? e.message : 'Bad model id.';
    return;
  }
  const ctrl = new AbortController();
  inFlight = ctrl;
  const timer = setTimeout(() => ctrl.abort(), 60_000);
  refreshSend();
  status.textContent = 'Sending to Google...';
  $('answer').hidden = true;
  try {
    const { reply } = await requestSuggestion((u, i) => fetch(u, i), prepared, $<HTMLInputElement>('model').value, $<HTMLInputElement>('key').value, ctrl.signal);
    if (reply.ok) {
      showReply(reply.text);
      status.textContent = 'Done. Nothing was stored.';
    } else {
      status.textContent = '';
      err.textContent = reply.error;
    }
  } catch (e) {
    status.textContent = '';
    err.textContent = ctrl.signal.aborted ? 'No answer within 60 seconds; stopped.' : 'The request failed (no connection, or the browser blocked it).';
  } finally {
    clearTimeout(timer);
    inFlight = undefined;
    refreshSend();
  }
}

$('prepare').addEventListener('click', prepare);
$('send').addEventListener('click', () => void send());
$('forget').addEventListener('click', () => {
  $<HTMLInputElement>('key').value = '';
  $<HTMLInputElement>('ack').checked = false;
  refreshSend();
});
$('sample').addEventListener('click', () => {
  $<HTMLTextAreaElement>('brief').value = SAMPLE_BRIEF;
  $<HTMLTextAreaElement>('draft').value = SAMPLE_DRAFT;
  invalidate();
});
$('clear').addEventListener('click', () => {
  for (const id of ['brief', 'draft', 'key']) (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement).value = '';
  $('error').textContent = '';
  invalidate();
});
for (const id of ['brief', 'draft']) $(id).addEventListener('input', invalidate);
for (const id of ['key', 'ack']) $(id).addEventListener('input', refreshSend);
$('ack').addEventListener('change', refreshSend);
$('short-disclaimer').textContent = DISCLAIMER_SHORT;
