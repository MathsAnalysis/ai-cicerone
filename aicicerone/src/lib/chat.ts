// Client della chat con la guida: legge lo stream NDJSON prodotto da /api/chat
// (prima riga {sources}, poi {t} per ogni pezzo di testo, infine {done}).

export type Msg = { role: 'user' | 'assistant'; content: string };
export type ChatRequest = { dest: string; tour: string; guide: string; stop: string; seen: string[]; messages: Msg[] };
export type SourceRef = { title: string; url: string };

export class ChatError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function streamChat(
  req: ChatRequest,
  on: { text: (full: string) => void; sources?: (s: SourceRef[]) => void },
  signal?: AbortSignal,
): Promise<string> {
  const r = await fetch('/api/chat/', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(req),
    signal,
  });
  if (!r.ok || !r.body) throw new ChatError(r.status, `chat ${r.status}`);
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let out = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      const ev = JSON.parse(line);
      if (typeof ev.t === 'string') {
        out += ev.t;
        on.text(out);
      } else if (Array.isArray(ev.sources)) {
        on.sources?.(ev.sources);
      } else if (ev.error) {
        throw new ChatError(502, String(ev.error));
      }
    }
  }
  if (!out.trim()) throw new ChatError(502, 'empty reply');
  return out.trim();
}
