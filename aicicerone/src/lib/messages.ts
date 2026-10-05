import { str } from './api.ts';

export type Msg = { role: 'user' | 'assistant'; content: string };

const MAX_MESSAGES = 12;
const MAX_MESSAGE = 1500;
const MAX_TOTAL = 5000;

export function parseMessages(v: unknown): Msg[] | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > MAX_MESSAGES) return null;
  const out: Msg[] = [];
  for (const m of v) {
    const role = m?.role === 'user' || m?.role === 'assistant' ? m.role : null;
    const content = str(m?.content, MAX_MESSAGE);
    if (!role || !content) return null;
    if (out.length && out[out.length - 1].role === role) return null;
    out.push({ role, content });
  }
  if (out[0].role !== 'user' || out[out.length - 1].role !== 'user') return null;
  let total = out.reduce((n, m) => n + m.content.length, 0);
  while (out.length > 1 && total > MAX_TOTAL) {
    total -= out[0].content.length + out[1].content.length;
    out.splice(0, 2);
  }
  return out;
}
