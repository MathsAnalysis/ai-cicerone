import { useEffect, useRef, useState } from 'preact/hooks';
import { CHAT, CHIPS, REPLY, type Guide } from '../../data/tours';
import type { Dict } from '../../i18n';
import { streamChat, type Msg, type SourceRef } from '../../lib/chat';
import type { StopItem } from '../../lib/stops';
import Sheet from './Sheet';

type Props = {
  open: boolean;
  onClose: () => void;
  dest: string;
  tourId: string;
  guide: Guide;
  stop: StopItem;
  seen: string[];
  T: Dict;
  onSnack: (m: string) => void;
};

type Bubble = { role: 'user' | 'assistant' | 'intro'; text: string; sources?: SourceRef[] };

export default function ChatSheet({ open, onClose, dest, tourId, guide, stop, seen, T, onSnack }: Props) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const history = useRef<Msg[]>([]);
  const body = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) { abort.current?.abort(); return; }
    history.current = [];
    setBubbles([{ role: 'intro', text: CHAT[guide.id]?.[0] ?? '' }, { role: 'intro', text: `${T.chatHere} ${stop.t}. ${T.chatAsk}` }]);
    setInput('');
    setBusy(false);
  }, [open]);

  useEffect(() => {
    const el = body.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [bubbles]);

  const patchLast = (f: (b: Bubble) => Bubble) => setBubbles((bs) => bs.map((b, i) => (i === bs.length - 1 ? f(b) : b)));

  async function say(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setInput('');
    setBusy(true);
    history.current.push({ role: 'user', content: q });
    setBubbles((bs) => [...bs, { role: 'user', text: q }, { role: 'assistant', text: '…' }]);
    abort.current = new AbortController();
    try {
      const reply = await streamChat(
        { dest, tour: tourId, guide: guide.id, stop: stop.num, seen, messages: history.current.slice(-12) },
        { text: (full) => patchLast((b) => ({ ...b, text: full })), sources: (s) => patchLast((b) => ({ ...b, sources: s })) },
        abort.current.signal,
      );
      history.current.push({ role: 'assistant', content: reply });
    } catch (e) {
      history.current.pop();
      if ((e as Error).name === 'AbortError') return;
      // IA non raggiungibile: risposta dimostrativa, e lo diciamo.
      const canned = REPLY[guide.id] ?? [];
      patchLast((b) => ({ ...b, text: canned[Math.floor(Math.random() * canned.length)] ?? T.chatErr, sources: undefined }));
      onSnack(T.chatOffline);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={guide.name}
      footer={
        <form
          class="flex items-center gap-[9px] border-t border-line px-[22px] pt-3 pb-5"
          onSubmit={(e) => { e.preventDefault(); void say(input); }}
        >
          <input
            class="min-h-11 flex-1 rounded-full border-0 bg-beige px-4 text-[14.5px] text-ink outline-none"
            placeholder={T.chatPh}
            value={input}
            onInput={(e) => setInput((e.target as HTMLInputElement).value)}
            disabled={!open}
          />
          <button type="submit" class="btn-send" aria-label="Send" disabled={busy}>→</button>
        </form>
      }
    >
      <div ref={body} class="flex flex-col gap-2.5">
        {bubbles.map((b, i) => (
          <div key={i} class={`msg ${b.role === 'user' ? 'msg-u' : 'msg-g'}`}>
            {b.text}
            {b.sources && b.sources.length > 0 && b.text !== '…' && (
              <div class="mt-2 flex flex-wrap gap-1.5 text-[11px] leading-tight">
                {b.sources.slice(0, 5).map((s) => (
                  <a key={s.url} href={s.url} target="_blank" rel="noopener" class="rounded-full bg-white/70 px-2 py-0.5 text-blu no-underline">{s.title.replace(/^Wikipedia · /, 'W · ')}</a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div class="mt-3.5 flex flex-wrap gap-[7px]">
        {(CHIPS[guide.id] ?? []).map((c) => (
          <button type="button" key={c} class="btn-chip" onClick={() => void say(c)} disabled={busy}>{c}</button>
        ))}
      </div>
    </Sheet>
  );
}
