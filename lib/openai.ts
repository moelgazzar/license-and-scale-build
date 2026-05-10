import OpenAI from 'openai';
import { draftSchema, replyClassificationSchema, type DraftPayload, type ReplyClassificationPayload } from './schemas';
import { MARCUS_VOICE_GUIDE } from './voice-guide';
import type { ClosedLostLead } from './types';

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  // Throw lazily so build doesn't fail at import time.
  console.warn('[openai] OPENAI_API_KEY not set');
}

export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const FALLBACK_MODEL = 'gpt-4o-mini';

const client = new OpenAI({ apiKey: apiKey || 'missing' });

// Rough token cost map (per 1M tokens, as of 2026; safe rounded estimates).
// gpt-4.1-mini and gpt-4o-mini are in the same ballpark for this app.
const COST_PER_1M = {
  input: 0.15,
  output: 0.6,
};

function estimateCost(usage: { prompt_tokens?: number; completion_tokens?: number } | undefined): number | null {
  if (!usage) return null;
  const input = (usage.prompt_tokens ?? 0) / 1_000_000;
  const output = (usage.completion_tokens ?? 0) / 1_000_000;
  return Number((input * COST_PER_1M.input + output * COST_PER_1M.output).toFixed(6));
}

function formatLead(lead: ClosedLostLead): string {
  const monthsCold = lead.last_touchpoint_at
    ? Math.round((Date.now() - new Date(lead.last_touchpoint_at).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : null;
  const lines = [
    `Name: ${lead.first_name}${lead.last_name ? ' ' + lead.last_name : ''}`,
    lead.city ? `City: ${lead.city}` : null,
    lead.project_type ? `Original project: ${lead.project_type}` : null,
    lead.est_project_value ? `Estimated value: $${Math.round(lead.est_project_value).toLocaleString()}` : null,
    monthsCold !== null ? `Months since last touchpoint: ${monthsCold}` : null,
    lead.last_touchpoint_summary ? `Last touchpoint summary: ${lead.last_touchpoint_summary}` : null,
    lead.reason_lost ? `Reason lost: ${lead.reason_lost}` : null,
    lead.notes ? `Internal notes: ${lead.notes}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}

const DRAFT_SYSTEM_PROMPT = `${MARCUS_VOICE_GUIDE}

Output contract:
You MUST return a single JSON object with these fields and nothing else:
{
  "sms_draft": string (max 320 chars, conversational, opens with first name + project reference),
  "email_subject": string (5-9 words, personal-feeling, never generic),
  "email_body": string (3-5 sentences, plain text, no markdown, no signature line - the platform appends Marcus's name automatically),
  "call_opener": string (1-2 sentences for Marcus to say if he calls personally),
  "rationale": string (1-2 sentences: why this angle, recommended next step)
}

Do not wrap in code fences. Do not add prose outside the JSON.`;

const CLASSIFY_SYSTEM_PROMPT = `You classify inbound replies to outreach messages from a premium landscape design-build company.

Classifications:
- "hot": clear intent to move forward, asking about scheduling, asking for a new quote, ready to talk
- "warm": positive but not committal - asking general questions, considering, mentions thinking about it
- "not_interested": explicitly says no, says project is done, says they went with someone else, requests to be removed
- "manual_review": ambiguous, off-topic, contains a complaint, or is a question Marcus needs to answer personally

Output contract:
Return only a single JSON object:
{ "classification": "hot" | "warm" | "not_interested" | "manual_review", "reason": string (1-2 sentences) }

Do not wrap in code fences. Do not add prose outside the JSON.`;

async function callJson(
  system: string,
  user: string,
  model: string,
): Promise<{ raw: string; cost: number | null; modelUsed: string }> {
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.4,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  const raw = completion.choices[0]?.message?.content ?? '';
  const cost = estimateCost(completion.usage);
  return { raw, cost, modelUsed: model };
}

async function callJsonWithFallback(system: string, user: string) {
  try {
    return await callJson(system, user, OPENAI_MODEL);
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status;
    const code = err?.code ?? err?.error?.code;
    // If the configured model is invalid or not available, retry on fallback.
    if (status === 404 || code === 'model_not_found' || code === 'invalid_request_error') {
      console.warn(`[openai] model "${OPENAI_MODEL}" failed (${code ?? status}), retrying with ${FALLBACK_MODEL}`);
      return await callJson(system, user, FALLBACK_MODEL);
    }
    throw err;
  }
}

function validateOrNull<T>(raw: string, schema: { safeParse: (input: unknown) => { success: true; data: T } | { success: false; error: { message: string } } }): { ok: true; data: T } | { ok: false; reason: string } {
  const parsed = tryParse(raw);
  if (!parsed) return { ok: false, reason: 'unparseable response' };
  const result = schema.safeParse(parsed);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, reason: result.error.message };
}

export async function generateDraft(lead: ClosedLostLead): Promise<{
  payload: DraftPayload;
  cost: number | null;
  model: string;
}> {
  const userMessage = `Lead context:\n${formatLead(lead)}\n\nGenerate the JSON object now.`;
  const first = await callJsonWithFallback(DRAFT_SYSTEM_PROMPT, userMessage);
  let cost = first.cost;
  let modelUsed = first.modelUsed;

  const firstAttempt = validateOrNull(first.raw, draftSchema);
  if (firstAttempt.ok) {
    return { payload: firstAttempt.data, cost, model: modelUsed };
  }

  const retryUser = `${userMessage}\n\nYour previous response failed schema validation (${firstAttempt.reason.slice(0, 200)}). Output ONLY a valid JSON object matching the schema in the system prompt. No prose, no code fences.`;
  const retry = await callJsonWithFallback(DRAFT_SYSTEM_PROMPT, retryUser);
  cost = (cost ?? 0) + (retry.cost ?? 0);
  modelUsed = retry.modelUsed;

  const second = validateOrNull(retry.raw, draftSchema);
  if (!second.ok) {
    throw new Error(`Draft generation failed schema validation after retry: ${second.reason}`);
  }
  return { payload: second.data, cost, model: modelUsed };
}

export async function classifyReply(opts: {
  leadSummary: string;
  replyText: string;
}): Promise<{ payload: ReplyClassificationPayload; cost: number | null; model: string }> {
  const userMessage = `Lead summary:\n${opts.leadSummary}\n\nCustomer reply:\n"""\n${opts.replyText}\n"""\n\nClassify and return the JSON object.`;
  const first = await callJsonWithFallback(CLASSIFY_SYSTEM_PROMPT, userMessage);
  let cost = first.cost;
  let modelUsed = first.modelUsed;

  const firstAttempt = validateOrNull(first.raw, replyClassificationSchema);
  if (firstAttempt.ok) {
    return { payload: firstAttempt.data, cost, model: modelUsed };
  }

  const retry = await callJsonWithFallback(
    CLASSIFY_SYSTEM_PROMPT,
    `${userMessage}\n\nYour previous response failed schema validation (${firstAttempt.reason.slice(0, 200)}). Output ONLY the JSON object.`,
  );
  cost = (cost ?? 0) + (retry.cost ?? 0);
  modelUsed = retry.modelUsed;

  const second = validateOrNull(retry.raw, replyClassificationSchema);
  if (!second.ok) {
    throw new Error(`Reply classification failed schema validation after retry: ${second.reason}`);
  }
  return { payload: second.data, cost, model: modelUsed };
}

function tryParse(raw: string): unknown | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    // Strip code fences if the model added them
    const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    try {
      return JSON.parse(stripped);
    } catch {
      return null;
    }
  }
}
