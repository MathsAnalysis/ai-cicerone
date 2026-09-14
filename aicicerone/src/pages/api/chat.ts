export const prerender = false;

import type { APIRoute } from 'astro';
import { DEST, TOURS } from '../../data/tours';
import { clientIp, env, json, limited, readJson, sameOrigin, str } from '../../lib/api';
import { systemPrompt } from '../../lib/prompt';
import { retrieve } from '../../lib/retrieve';

const MAX_MESSAGES = 12;
const MAX_MESSAGE = 1500;
const NDJSON = { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store' };

type Msg = { role: 'user' | 'assistant'; content: string };

// Storico breve, ruoli alternati, ultimo turno dell'utente.
function parseMessages(v: unknown): Msg[] | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > MAX_MESSAGES) return null;
  const out: Msg[] = [];
  for (const m of v) {
    const role = m?.role === 'user' || m?.role === 'assistant' ? m.role : null;
    const content = str(m?.content, MAX_MESSAGE);
    if (!role || !content) return null;
    if (out.length && out[out.length - 1].role === role) return null;
    out.push({ role, content });
  }
  return out[0].role === 'user' && out[out.length - 1].role === 'user' ? out : null;
}

// Modelli con "ragionamento" esplicito: lo spegniamo, serve una risposta rapida in strada.
const thinks = (model: string) => /qwen3|deepseek-r1|gpt-oss|magistral/i.test(model);

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!sameOrigin(request)) return json(403, { error: 'forbidden' });
  if (limited('chat', clientIp(request, clientAddress), 30)) return json(429, { error: 'rate_limited' });

  const body = await readJson(request, 24_000);
  if (!body) return json(400, { error: 'bad_request' });
  const destId = str(body.dest, 40);
  const tourId = str(body.tour, 40);
  const guideId = str(body.guide, 40);
  const stop = str(body.stop, 4);
  const dest = destId ? DEST[destId] : undefined;
  const tour = tourId ? TOURS[tourId] : undefined;
  const guide = tour?.guides.find((g) => g.id === guideId && !g.soon);
  const messages = parseMessages(body.messages);
  if (!dest || !tourId || !tour || !guide || !stop || !messages || !dest.tours.includes(tourId)) {
    return json(400, { error: 'bad_request' });
  }
  const seen = Array.isArray(body.seen) ? body.seen.filter((s): s is string => typeof s === 'string' && s.length <= 4).slice(0, 40) : [];

  const sources = await retrieve(messages[messages.length - 1].content, dest.lang, tour.city);
  const system = systemPrompt(dest.lang, tour, guide, stop, seen, sources);
  const model = env.model;

  let upstream: Response;
  try {
    upstream = await fetch(`${env.llmUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: true,
        keep_alive: '30m',
        ...(thinks(model) ? { think: false } : {}),
        // num_ctx esplicito: il default di Ollama (4096) troncherebbe il system prompt con i testi del tour.
        options: { temperature: 0.4, num_predict: 400, num_ctx: 8192 },
        messages: [{ role: 'system', content: system }, ...messages],
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (e) {
    console.error('chat: LLM non raggiungibile', env.llmUrl, e instanceof Error ? e.message : e);
    return json(502, { error: 'llm_unreachable' });
  }
  if (!upstream.ok || !upstream.body) {
    console.error('chat: LLM', upstream.status, await upstream.text().catch(() => ''));
    return json(502, { error: 'llm_error' });
  }

  // Ollama emette NDJSON {message:{content}, done}; al client passiamo {sources}, {t}, {done}.
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  let buf = '';
  const line = (o: unknown) => enc.encode(JSON.stringify(o) + '\n');
  const out = new TransformStream<Uint8Array, Uint8Array>({
    start(ctrl) {
      ctrl.enqueue(line({ sources: sources.map((s) => ({ title: s.title, url: s.url })) }));
    },
    transform(chunk, ctrl) {
      buf += dec.decode(chunk, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const l of lines) {
        if (!l.trim()) continue;
        try {
          const j = JSON.parse(l);
          if (j.error) ctrl.enqueue(line({ error: String(j.error) }));
          const t = j.message?.content;
          if (t) ctrl.enqueue(line({ t }));
        } catch {
          // riga incompleta o non JSON: ignorata
        }
      }
    },
    flush(ctrl) {
      ctrl.enqueue(line({ done: true }));
    },
  });
  return new Response(upstream.body.pipeThrough(out), { headers: NDJSON });
};
