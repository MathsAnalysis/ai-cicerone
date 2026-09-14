import { useEffect, useState } from 'preact/hooks';
import type { Dict } from '../../i18n';
import type { Fix } from '../../lib/geo';
import { APP_VERSION, sendReport } from '../../lib/report';
import type { StopItem } from '../../lib/stops';
import Sheet from './Sheet';

type Props = {
  open: boolean;
  onClose: () => void;
  dest: string;
  tourId: string;
  guideId: string;
  lang: string;
  stops: StopItem[];
  current: number;
  pos: Fix | null;
  T: Dict;
  onSnack: (m: string, ms?: number) => void;
};

// Le segnalazioni arrivano via email alla redazione (destinatari in REPORT_TO sul server).
export default function FlagSheet({ open, onClose, dest, tourId, guideId, lang, stops, current, pos, T, onSnack }: Props) {
  const [stopN, setStopN] = useState(current);
  const [type, setType] = useState(0);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setStopN(current); setType(0); } }, [open]);

  async function send(e: Event) {
    e.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    const s = stops[stopN];
    try {
      await sendReport({
        dest, tour: tourId, stop: s.num, stopName: s.t, guide: guideId, lang,
        type: T.flagTypes[type], text: body,
        coords: pos ? { lat: pos.lat, lng: pos.lng, acc: pos.acc } : undefined,
        url: location.href, appVersion: APP_VERSION,
      });
      setText('');
      onClose();
      onSnack(T.flagSent, 3200);
    } catch {
      onSnack(T.flagFail, 4500);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={T.flagTitle}>
      <form onSubmit={send}>
        <p class="mb-4 text-sm leading-[1.55] text-mute">{T.flagIntro}</p>
        <div class="field">
          <label for="flagStop">{T.flagStop}</label>
          <select id="flagStop" value={stopN} onChange={(e) => setStopN(Number((e.target as HTMLSelectElement).value))}>
            {stops.map((s, n) => <option key={s.num} value={n}>{s.num} · {s.t}</option>)}
          </select>
        </div>
        <div class="field">
          <label for="flagType">{T.flagType}</label>
          <select id="flagType" value={type} onChange={(e) => setType(Number((e.target as HTMLSelectElement).value))}>
            {T.flagTypes.map((t, n) => <option key={t} value={n}>{t}</option>)}
          </select>
        </div>
        <div class="field">
          <label for="flagTxt">{T.flagDesc}</label>
          <textarea id="flagTxt" rows={4} placeholder={T.flagDescPh} value={text} maxLength={2000} required onInput={(e) => setText((e.target as HTMLTextAreaElement).value)} />
        </div>
        <button type="submit" class="btn btn-p" disabled={busy || !text.trim()}>{busy ? T.flagSending : T.flagSend}</button>
      </form>
    </Sheet>
  );
}
