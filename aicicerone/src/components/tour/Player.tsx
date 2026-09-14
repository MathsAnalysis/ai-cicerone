import { useEffect, useRef, useState } from 'preact/hooks';
import type { Guide } from '../../data/tours';
import type { Dict } from '../../i18n';
import type { StopItem } from '../../lib/stops';

type Props = {
  open: boolean;
  stop: StopItem;
  file: string;
  guide: Guide;
  T: Dict;
  hasPrev: boolean;
  isLast: boolean;
  prevName: string;
  nextName: string;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  onEnded: () => void;
  onSnack: (m: string) => void;
};

const VIDEO_DIR = '/video/';
const mmss = (s: number) => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

const IcoPlay = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5L8 5.5z" /></svg>;
const IcoPause = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="5" width="3.6" height="14" rx="1" /><rect x="13.4" y="5" width="3.6" height="14" rx="1" /></svg>;

// Player verticale 9:16 con comandi custom: tap → play/pausa, barra trascinabile, comandi che sfumano.
export default function Player({ open, stop, file, guide, T, hasPrev, isLast, prevName, nextName, onPrev, onNext, onClose, onEnded, onSnack }: Props) {
  const vid = useRef<HTMLVideoElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [has, setHas] = useState(false);
  const [ended, setEnded] = useState(false);
  const [paused, setPaused] = useState(true);
  const [ctls, setCtls] = useState(false);
  const [drag, setDrag] = useState(false);
  const [t, setT] = useState({ cur: 0, dur: 0 });
  const ctlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seeking = useRef(false);

  const showCtls = () => {
    setCtls(true);
    if (ctlTimer.current) clearTimeout(ctlTimer.current);
    ctlTimer.current = setTimeout(() => setCtls(false), 2200);
  };

  useEffect(() => {
    const v = vid.current;
    if (!v) return;
    if (!open) { v.pause(); return; }
    setHas(false); setEnded(false); setCtls(false); setT({ cur: 0, dur: 0 });
    v.src = VIDEO_DIR + file;
    v.play().catch(() => {});
  }, [open, file]);

  function seekTo(x: number) {
    const v = vid.current; const r = track.current?.getBoundingClientRect();
    if (!v || !r) return;
    const f = Math.min(1, Math.max(0, (x - r.left) / r.width));
    if (v.duration) { v.currentTime = f * v.duration; setT({ cur: v.currentTime, dur: v.duration }); }
  }

  function drop(e: DragEvent) {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer?.files[0];
    if (!f || !f.type.startsWith('video')) { onSnack(T.dropWrong); return; }
    const v = vid.current; if (!v) return;
    setEnded(false); v.src = URL.createObjectURL(f); setHas(true); v.play().catch(() => {});
  }

  const pct = t.dur ? (t.cur / t.dur) * 100 : 0;
  return (
    <div class={`fixed top-0 left-1/2 z-[70] h-dvh w-full max-w-[440px] -translate-x-1/2 flex-col bg-night ${open ? 'flex' : 'hidden'}`} role="dialog" aria-modal={open} aria-hidden={!open}>
      <div class="flex items-center gap-2.5 px-4 py-3.5 text-white">
        <button type="button" class="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-2 text-[13px] font-semibold text-white" onClick={onClose}>{T.pClose}</button>
        <div class="ml-auto text-right">
          <div class="text-[10.5px] tracking-[0.12em] uppercase opacity-60">{guide.role}</div>
          <div class="font-serif text-sm">{stop.t}</div>
        </div>
      </div>
      <div class="relative min-h-0 flex-1 bg-black">
        <div
          class={`absolute inset-0 grid place-items-center overflow-hidden bg-night-deep ${drag ? 'shadow-[inset_0_0_0_2px_var(--color-terra)]' : ''}`}
          onClick={(e) => { if ((e.target as HTMLElement).closest('[data-ctl]')) return; showCtls(); }}
          onDragEnter={(e) => { e.preventDefault(); setDrag(true); }}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDrag(false); }}
          onDrop={drop}
        >
          <video
            ref={vid}
            playsInline
            class={`h-full w-full object-contain ${has ? 'block' : 'hidden'}`}
            onCanPlay={() => setHas(true)}
            onError={() => { setHas(false); vid.current?.removeAttribute('src'); }}
            onPlay={() => setPaused(false)}
            onPause={() => setPaused(true)}
            onTimeUpdate={() => { const v = vid.current; if (v && !seeking.current) setT({ cur: v.currentTime, dur: v.duration || 0 }); }}
            onEnded={() => { setEnded(true); setCtls(false); onEnded(); }}
          />
          {!has && (
            <div class="px-[22px] py-[26px] text-center text-[#8b9aa5]">
              <div class="mx-auto mb-3.5 grid h-[54px] w-[54px] place-items-center rounded-full bg-white/[0.07]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 7.5v9l7.5-4.5L9 7.5z" fill="#8B9AA5" /></svg>
              </div>
              <div class="font-serif text-[17px] text-[#e4eaee]">{T.phTitle}</div>
              <div class="mt-[9px] font-mono text-[11.5px] leading-[1.5] break-all text-[#6e8290]">{file}</div>
              <div class="mt-4 text-[12.5px] leading-[1.5]">{T.phDesc}</div>
            </div>
          )}
          {has && (
            <div class={`absolute inset-0 transition-opacity duration-250 ${ctls && !ended ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}>
              <button
                type="button" data-ctl
                class="absolute top-1/2 left-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-night/40 text-white"
                aria-label={paused ? 'Play' : 'Pause'}
                onClick={(e) => { e.stopPropagation(); const v = vid.current; if (!v) return; v.paused ? v.play() : v.pause(); showCtls(); }}
              >
                {paused ? <IcoPlay /> : <IcoPause />}
              </button>
              <div class="absolute right-0 bottom-0 left-0 bg-gradient-to-b from-transparent to-night-deep/60 px-[18px] pt-[30px] pb-3.5" data-ctl>
                <div
                  ref={track}
                  class="flex h-[26px] cursor-pointer touch-none items-center"
                  onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); seeking.current = true; if (ctlTimer.current) clearTimeout(ctlTimer.current); setCtls(true); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); seekTo(e.clientX); }}
                  onPointerMove={(e) => { if (seeking.current) { e.preventDefault(); seekTo(e.clientX); } }}
                  onPointerUp={() => { seeking.current = false; showCtls(); }}
                  onPointerCancel={() => { seeking.current = false; showCtls(); }}
                >
                  <div class="relative h-[3px] w-full rounded-sm bg-white/[0.28]">
                    <div class="vfill absolute top-[-1px] bottom-[-1px] left-0 rounded-sm bg-terra" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div class="mt-[3px] flex justify-between text-[11px] tracking-[0.04em] text-white/70"><span>{mmss(t.cur)}</span><span>{mmss(t.dur)}</span></div>
              </div>
            </div>
          )}
          {ended && (
            <div class="absolute inset-0 grid place-items-center bg-gradient-to-b from-night-deep/20 to-night-deep/80 p-[26px] text-center" data-ctl>
              <div>
                <div class="text-[10.5px] font-bold tracking-[0.14em] text-white/60 uppercase">{T.vendK}</div>
                <h3 class="mt-1.5 mb-[18px] text-[23px] leading-[1.2] text-white">{stop.t}</h3>
                <button type="button" class="btn btn-p mx-auto max-w-[260px]" onClick={onNext}>{isLast ? T.vendEnd : T.vendNext}</button>
                <button type="button" class="mt-3 cursor-pointer text-[13px] font-semibold text-white/70 underline underline-offset-[3px]" onClick={() => { setEnded(false); const v = vid.current; if (v) { v.currentTime = 0; v.play().catch(() => {}); } }}>{T.vendAgain}</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div class="flex gap-[9px] border-t border-white/10 bg-night-deep px-4 pt-3 pb-[22px]">
        <button type="button" class="btn btn-sm min-h-[58px] flex-1 flex-col items-start gap-0.5 bg-white/[0.13] px-[15px] py-2.5 text-left text-white" disabled={!hasPrev} onClick={onPrev}>
          <span class="text-[10.5px] font-bold tracking-[0.1em] uppercase opacity-60">{T.prevLbl}</span>
          <span class="max-w-full truncate font-serif text-[13.5px] leading-[1.15] font-normal">{hasPrev ? prevName : '—'}</span>
        </button>
        <button type="button" class="btn btn-p btn-sm min-h-[58px] flex-1 flex-col items-end gap-0.5 px-[15px] py-2.5 text-right" onClick={onNext}>
          <span class="text-[10.5px] font-bold tracking-[0.1em] uppercase opacity-60">{isLast ? T.endLbl : T.nextLbl}</span>
          <span class="max-w-full truncate font-serif text-[13.5px] leading-[1.15] font-normal">{isLast ? T.endNm : nextName}</span>
        </button>
      </div>
    </div>
  );
}
