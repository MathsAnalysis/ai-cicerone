import type { Tour } from '../../data/tours';
import type { Dict } from '../../i18n';
import { headNum, type StopItem } from '../../lib/stops';
import Sheet from './Sheet';

type Props = {
  open: boolean;
  onClose: () => void;
  tour: Tour;
  stops: StopItem[];
  current: number;
  done: ReadonlySet<number>;
  opt: boolean;
  onPick: (n: number) => void;
  onToggleOpt: () => void;
  T: Dict;
};

export default function ItinSheet({ open, onClose, tour, stops, current, done, opt, onPick, onToggleOpt, T }: Props) {
  const zones = new Set<number>();
  let transferShown = false;
  return (
    <Sheet open={open} onClose={onClose} title={tour.name}>
      <div class="flex flex-col">
        {stops.map((s, n) => {
          const hn = headNum(s);
          const zone = tour.zones?.[hn] && !zones.has(hn) ? (zones.add(hn), tour.zones[hn]) : null;
          const transfer = tour.transferBefore === hn && !transferShown ? ((transferShown = true), tour.transferTxt) : null;
          return (
            <div key={s.num}>
              {zone && <div class="mt-4 mb-1.5 text-[11px] font-bold tracking-[0.14em] text-blu uppercase first:mt-0">{zone}</div>}
              {transfer && <div class="my-2.5 rounded-[11px] bg-beige px-3.5 py-[11px] text-[12.5px] leading-[1.45] text-[#5c6672]">{transfer}</div>}
              <button type="button" class="flex w-full cursor-pointer items-start gap-[13px] py-[11px] text-left" onClick={() => onPick(n)}>
                <span class={`grid h-[26px] w-[26px] flex-none place-items-center rounded-full text-[11px] font-semibold ${n === current ? 'bg-terra text-white' : done.has(n) ? 'bg-blu text-white' : 'bg-beige text-mute'}`}>{s.num}</span>
                <span class="flex flex-col gap-0.5">
                  <span class={`block text-[15px] leading-[1.3] ${n === current ? 'font-semibold text-terra' : ''}`}>{s.t}</span>
                  <span class="block text-xs text-mute">{s.p}</span>
                </span>
              </button>
            </div>
          );
        })}
        {tour.optional && (
          <div class="mt-1.5 mb-0.5 flex items-center gap-3 rounded-xl px-3.5 py-3 shadow-[inset_0_0_0_1px_var(--color-line)]">
            <span class="flex flex-col gap-0.5">
              <span class="block text-sm leading-[1.3]">{tour.optional.t}</span>
              <span class="block text-xs text-mute">{T.optLabel} {tour.optional.label} · {tour.optional.p}</span>
            </span>
            <button type="button" class="tog" aria-pressed={opt} aria-label={T.optLabel} onClick={onToggleOpt} />
          </div>
        )}
      </div>
    </Sheet>
  );
}
