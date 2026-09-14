import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Guide, Lang, Tour } from '../../data/tours';
import { fill, type Dict } from '../../i18n';
import { GEO, dist, fmtDist } from '../../lib/geo';
import { stopList, transferIndex, videoFile } from '../../lib/stops';
import ChatSheet from './ChatSheet';
import FlagSheet from './FlagSheet';
import ItinSheet from './ItinSheet';
import Player from './Player';
import TourMap from './TourMap';
import { useGps } from './useGps';

type Props = { dest: string; tourId: string; tour: Tour; guide: Guide; lang: Lang; T: Dict; onLeave: () => void };
type SheetId = 'itin' | 'chat' | 'flag' | null;

const Chev = ({ flip }: { flip?: boolean }) => (
  <svg class={`h-6 w-6 ${flip ? '' : '-scale-x-100'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 5.5 16 12l-6.5 6.5" /></svg>
);

export default function ActiveTour({ dest, tourId, tour, guide, lang, T }: Props) {
  const [i, setI] = useState(0);
  const [done, setDone] = useState<Set<number>>(() => new Set());
  const [opt, setOpt] = useState(true);
  const [sheet, setSheet] = useState<SheetId>(null);
  const [player, setPlayer] = useState(false);
  const [toast, setToast] = useState<number | null>(null);
  const [snack, setSnack] = useState<string | null>(null);
  const snackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stops = useMemo(() => stopList(tour, opt), [tour, opt]);
  const s = stops[i];
  const last = i === stops.length - 1;
  const firstZ = useMemo(() => transferIndex(tour, stops), [tour, stops]);

  const showSnack = useCallback((msg: string, ms = 2600) => {
    setSnack(msg);
    if (snackTimer.current) clearTimeout(snackTimer.current);
    snackTimer.current = setTimeout(() => setSnack(null), ms);
  }, []);

  const arrive = useCallback((n: number) => {
    setToast(n);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 9000);
  }, []);

  const { gps, toggle } = useGps({ stops, current: i, skip: done, playerOpen: player, lang, T, onArrive: arrive, onSnack: showSnack });
  const follow = gps.on && !gps.sim && !!gps.pos;

  // Elenco statico delle tappe nascosto finché il tour è attivo; avviso iniziale.
  useEffect(() => {
    const el = document.getElementById('itinerary');
    if (el) el.hidden = true;
    window.scrollTo(0, 0);
    const t = setTimeout(() => showSnack(T.startSnack, 3600), 500);
    return () => { if (el) el.hidden = false; clearTimeout(t); };
  }, []);

  const markDone = (n: number) => setDone((d) => (d.has(n) ? d : new Set(d).add(n)));

  function next() {
    if (i < stops.length - 1) {
      markDone(i);
      const n = i + 1;
      setI(n);
      if (n === firstZ && firstZ >= 0) showSnack(T.zoneSnack, 4000);
    } else {
      markDone(i);
      showSnack(T.done, 3800);
    }
  }

  function advance() {
    if (last) { setPlayer(false); markDone(i); showSnack(T.done, 3600); }
    else next();
  }

  function toggleOpt() {
    const nextOpt = !opt;
    setOpt(nextOpt);
    setI((cur) => Math.min(cur, stopList(tour, nextOpt).length - 1));
    showSnack(nextOpt ? T.optOn : T.optOff);
  }

  let notice: string;
  if (i === firstZ && firstZ >= 0 && tour.transferTxt) notice = tour.transferTxt;
  else if (follow && gps.pos) {
    const d = dist([gps.pos.lat, gps.pos.lng], s.c);
    const acc = Math.round(gps.pos.acc);
    notice = `${fill(T.nextAt, { d: fmtDist(d, lang) })} · GPS ±${acc} m${acc > (s.r ?? GEO.radius) * 1.5 ? ` · ${T.gpsWeak}` : ''}`;
  } else notice = gps.on ? T.noticeGps : T.notice;

  const toastStop = toast != null ? stops[toast] : null;

  return (
    <section class="relative flex flex-col">
      <div class="flex items-center gap-3 border-b border-line px-5 pt-3 pb-2.5">
        <img src="/apple-touch-icon.png" alt="" width="30" height="30" class="mr-0.5 h-[30px] w-[30px] object-contain object-top" />
        <div class="min-w-0">
          <div class="text-[11px] tracking-[0.14em] text-mute uppercase">{tour.city}</div>
          <div class="mt-px truncate font-serif text-base leading-[1.15]">{s.t}</div>
        </div>
        <button type="button" class="btn-gps" aria-pressed={gps.on} onClick={toggle}>
          <span class="dot" />
          <span>{gps.on ? T.gpsOn : T.gpsOff}</span>
        </button>
      </div>
      <div class="flex gap-[3px] px-5 pt-2.5" aria-hidden="true">
        {stops.map((_, n) => <i key={n} class={`h-[3px] flex-1 rounded-sm ${n === i ? 'bg-terra' : done.has(n) ? 'bg-blu' : 'bg-beige'}`} />)}
      </div>
      <div class="flex justify-between px-5 pt-[7px] text-[11px] tracking-[0.1em] text-mute uppercase">
        <span>{T.stop} {i + 1} {T.of} {stops.length}</span>
        <span>{T.guide}: {guide.name}</span>
      </div>

      <TourMap routeKey={`${tourId}${opt ? '-opt' : ''}`} center={tour.center} stops={stops} current={i} done={done} pos={gps.pos} follow={follow} onPick={setI} />

      <div class="notice" role="status">
        <svg class="mt-0.5 h-4 w-4 flex-none" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#B08A55" stroke-width="1.3" /><path d="M8 4.6v4.2M8 11.2h.01" stroke="#B08A55" stroke-width="1.4" stroke-linecap="round" /></svg>
        <span>{notice}</span>
      </div>

      <div class="px-5 pt-4">
        <div class="text-[11px] font-bold tracking-[0.14em] text-terra uppercase">{T.stop} {s.num} · {tour.city}</div>
        <h2 class="mt-[5px] text-2xl leading-[1.15]">{s.t}</h2>
        <p class="mt-[5px] text-[13px] text-mute">{s.p}</p>
        <p class="mt-[9px] text-sm leading-[1.55] text-[#4b5560] text-pretty">{s.d}</p>
      </div>

      <div class="flex gap-[9px] px-5 pt-3.5">
        <button type="button" class="btn btn-nav" aria-label="Previous stop" disabled={i === 0} onClick={() => setI(i - 1)}><Chev /></button>
        <button type="button" class="btn btn-p btn-sm" onClick={() => setPlayer(true)}>{T.play}</button>
        <button type="button" class="btn btn-nav" aria-label="Next stop" disabled={last} onClick={next}><Chev flip /></button>
      </div>
      <div class="flex flex-col gap-[9px] px-5 pt-3.5">
        <button type="button" class="btn btn-s btn-sm" onClick={() => setSheet('chat')}>{T.chatBtn}</button>
        <button type="button" class="btn btn-t btn-sm" onClick={() => setSheet('flag')}>{T.flagBtn}</button>
      </div>
      <div class="flex gap-[9px] px-5 pt-[9px] pb-2">
        <button type="button" class="btn-link" onClick={() => setSheet('itin')}>{T.itinBtn}</button>
        <a class="btn-link no-underline" href={`/${dest}/`}>{T.cityBtn}</a>
      </div>

      <ItinSheet open={sheet === 'itin'} onClose={() => setSheet(null)} tour={tour} stops={stops} current={i} done={done} opt={opt} onPick={(n) => { setI(n); setSheet(null); }} onToggleOpt={toggleOpt} T={T} />
      <ChatSheet open={sheet === 'chat'} onClose={() => setSheet(null)} dest={dest} tourId={tourId} guide={guide} stop={s} seen={[...done].map((n) => stops[n]?.num).filter(Boolean)} T={T} onSnack={showSnack} />
      <FlagSheet open={sheet === 'flag'} onClose={() => setSheet(null)} dest={dest} tourId={tourId} guideId={guide.id} lang={lang} stops={stops} current={i} pos={gps.pos} T={T} onSnack={showSnack} />

      <Player
        open={player} stop={s} file={videoFile(tourId, s)} guide={guide} T={T}
        hasPrev={i > 0} isLast={last} prevName={i > 0 ? stops[i - 1].t : ''} nextName={last ? '' : stops[i + 1].t}
        onPrev={() => setI(i - 1)} onNext={advance} onClose={() => setPlayer(false)} onEnded={() => markDone(i)} onSnack={showSnack}
      />

      <div class="toast" data-on={toast != null} role="status" aria-live="polite">
        <div class="grid h-[38px] w-[38px] flex-none place-items-center rounded-full bg-terra text-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2a6 6 0 0 0-6 6c0 4.5 6 14 6 14s6-9.5 6-14a6 6 0 0 0-6-6z" stroke="#fff" stroke-width="1.6" /><circle cx="12" cy="8" r="2" fill="#fff" /></svg>
        </div>
        <div class="flex-1">
          <div class="text-[10.5px] font-bold tracking-[0.13em] text-terra uppercase">{T.toastK}</div>
          <div class="mt-0.5 font-serif text-base leading-[1.2]">{toastStop?.t}</div>
          <div class="mt-[3px] text-[12.5px] leading-[1.4] text-mute">{guide.name} {T.toastP}</div>
          <button type="button" class="btn-toast" onClick={() => { if (toast != null) setI(toast); setToast(null); setPlayer(true); }}>{T.toastGo}</button>
        </div>
      </div>
      <div class="snack" data-on={snack != null} role="status">{snack}</div>
    </section>
  );
}
