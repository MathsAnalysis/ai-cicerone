export const prerender = false;

import type { APIRoute } from 'astro';
import { DEST, TOURS } from '../../data/tours';
import { acquire, clientIp, env, json, limited, readJson, sameOrigin, str, thinks } from '../../lib/api';
import { parseMessages } from '../../lib/messages';
import { systemPrompt, userTurn } from '../../lib/prompt';
import { retrieve } from '../../lib/retrieve';

const MAX_PARALLEL = 2;
const LLM_TIMEOUT = 180_000;
const NDJSON = { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store' };

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

  const release = acquire('chat', MAX_PARALLEL);
  if (!release) return json(429, { error: 'busy' });
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(LLM_TIMEOUT)]);
  signal.addEventListener('abort', release, { once: true });

  const question = messages[messages.length - 1].content;
  const sources = await retrieve(question, dest.lang, tour.city, signal);
  const system = systemPrompt(dest.lang, tour, guide, stop, seen);
  const model = env.model;
  const noThink = /qwen3/i.test(model) ? ' /no_think' : '';
  const outgoing = [...messages.slice(0, -1), { role: 'user' as const, content: userTurn(dest.lang, question, sources) + noThink }];

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
        options: { temperature: 0.2, num_predict: 400, num_ctx: 8192 },
        messages: [{ role: 'system', content: system }, ...outgoing],
      }),
      signal,
    });
  } catch (e) {
    release();
    console.error('chat: LLM non raggiungibile', env.llmUrl, e instanceof Error ? e.message : e);
    return json(502, { error: 'llm_unreachable' });
  }
  if (!upstream.ok || !upstream.body) {
    release();
    console.error('chat: LLM', upstream.status, await upstream.text().catch(() => ''));
    return json(502, { error: 'llm_error' });
  }

  const enc = new TextEncoder();
  const dec = new TextDecoder();
  let buf = '';
  let thinking = false;
  const line = (o: unknown) => enc.encode(JSON.stringify(o) + '\n');
  const visible = (t: string): string => {
    let out = '';
    let rest = t;
    while (rest) {
      if (thinking) {
        const end = rest.indexOf('</think>');
        if (end < 0) return out;
        thinking = false;
        rest = rest.slice(end + 8);
      } else {
        const start = rest.indexOf('<think>');
        if (start < 0) { out += rest; break; }
        out += rest.slice(0, start);
        thinking = true;
        rest = rest.slice(start + 7);
      }
    }
    return out;
  };
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
          const t = j.message?.content ? visible(String(j.message.content)) : '';
          if (t) ctrl.enqueue(line({ t }));
        } catch {
        }
      }
    },
    flush(ctrl) {
      release();
      ctrl.enqueue(line({ done: true }));
    },
  });
  return new Response(upstream.body.pipeThrough(out), { headers: NDJSON });
};
