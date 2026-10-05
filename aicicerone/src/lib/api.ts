const read = (k: string): string => process.env[k] ?? (import.meta as { env?: Record<string, string | undefined> }).env?.[k] ?? '';
export const env = {
  get llmUrl() { return (read('LLM_URL') || 'http://localhost:11434').replace(/\/$/, ''); },
  get model() { return read('CHAT_MODEL') || 'qwen3:1.7b'; },
  get searxng() { return read('SEARXNG_URL').replace(/\/$/, ''); },
  get smtpUrl() { return read('SMTP_URL'); },
  get reportFrom() { return read('REPORT_FROM') || 'AiCicerone <no-reply@aicicerone.com>'; },
  get reportTo() { return read('REPORT_TO').split(',').map((s) => s.trim()).filter(Boolean); },
};

export const thinks = (model: string): boolean => /qwen3|deepseek-r1|gpt-oss|magistral/i.test(model);

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

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

const inflight = new Map<string, number>();
export function acquire(scope: string, max: number): (() => void) | null {
  const n = inflight.get(scope) ?? 0;
  if (n >= max) return null;
  inflight.set(scope, n + 1);
  let done = false;
  return () => {
    if (done) return;
    done = true;
    inflight.set(scope, Math.max(0, (inflight.get(scope) ?? 1) - 1));
  };
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
