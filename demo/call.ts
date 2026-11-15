import { geminiRequestBody, geminiUrl, parseGeminiResponse } from '../src/index.js';
import type { GeminiReply, SuggestionRequest } from '../src/index.js';

/** The one request the suggest tab makes. `fetchImpl` is passed in so the exact call can be tested without a network. */
export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal; credentials: 'omit'; referrerPolicy: 'no-referrer' }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export interface SuggestionOutcome {
  status: number;
  reply: GeminiReply;
}

/** POSTs the prepared request to Google's Gemini API with the person's own key. The key goes only in the `x-goog-api-key` header. */
export async function requestSuggestion(fetchImpl: FetchLike, req: SuggestionRequest, model: string, key: string, signal: AbortSignal): Promise<SuggestionOutcome> {
  const res = await fetchImpl(geminiUrl(model.trim()), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key.trim() },
    body: JSON.stringify(geminiRequestBody(req)),
    signal,
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  const parsed = parseGeminiResponse(json);
  // A body that looks like text but came with an error status is still an error.
  if (parsed.ok && !res.ok) return { status: res.status, reply: { ok: false, error: `Google answered with status ${res.status}.` } };
  return { status: res.status, reply: parsed };
}
