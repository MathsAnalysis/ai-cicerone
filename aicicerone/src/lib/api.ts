// Helper condivisi dagli endpoint server (Node). Confine di fiducia: tutto ciò che arriva dal client
// viene validato qui o nell'endpoint, mai passato oltre così com'è.

// Variabili lette a runtime (process.env in produzione; in `astro dev` arrivano dal file .env via Vite).
const read = (k: string): string => process.env[k] ?? (import.meta as { env?: Record<string, string | undefined> }).env?.[k] ?? '';
export const env = {
  get llmUrl() { return (read('LLM_URL') || 'http://localhost:11434').replace(/\/$/, ''); },
  get model() { return read('CHAT_MODEL') || 'qwen3:1.7b'; },
  get searxng() { return read('SEARXNG_URL').replace(/\/$/, ''); },
  get smtpUrl() { return read('SMTP_URL'); },
  get reportFrom() { return read('REPORT_FROM') || 'AiCicerone <no-reply@aicicerone.com>'; },
  get reportTo() { return read('REPORT_TO').split(',').map((s) => s.trim()).filter(Boolean); },
};

// Modelli con "ragionamento" esplicito: lo spegniamo, serve una risposta rapida in strada.
export const thinks = (model: string): boolean => /qwen3|deepseek-r1|gpt-oss|magistral/i.test(model);

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

// Accettiamo POST solo dal nostro stesso host (dietro reverse proxy vale X-Forwarded-Host).
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? new URL(request.url).host;
  try {
    return new URL(origin).host === host.split(',')[0].trim();
  } catch {
    return false;
  }
}

export function clientIp(request: Request, fallback?: string): string {
  const xff = request.headers.get('x-forwarded-for');
  return xff?.split(',')[0].trim() || fallback || 'local';
}

// ponytail: contatori in memoria del processo; con più istanze passare a Redis.
const buckets = new Map<string, { n: number; reset: number }>();
export function limited(scope: string, ip: string, limit: number, windowMs = 60_000): boolean {
  const now = Date.now();
  const key = `${scope}:${ip}`;
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
    buckets.set(key, { n: 1, reset: now + windowMs });
    return false;
  }
  b.n++;
  return b.n > limit;
}

export async function readJson(request: Request, max: number): Promise<Record<string, unknown> | null> {
  const len = Number(request.headers.get('content-length') ?? 0);
  if (len > max) return null;
  try {
    const text = await request.text();
    if (text.length > max) return null;
    const v = JSON.parse(text);
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function str(v: unknown, max: number, min = 1): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s.length >= min && s.length <= max ? s : null;
}
