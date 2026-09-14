import { useState } from 'preact/hooks';
import type { Tour } from '../../data/tours';
import type { Dict } from '../../i18n';

type Props = { dest: string; tour: Tour; T: Dict; onStart: (guideId: string) => void };

export default function GuidePicker({ dest, tour, T, onStart }: Props) {
  const avail = tour.guides.filter((g) => !g.soon);
  const [sel, setSel] = useState<string | null>(avail.length === 1 ? avail[0].id : null);

  return (
    <section aria-label={T.guideSub}>
      <div class="flex min-h-[58px] items-center gap-2.5 px-5 py-4">
        <a href={`/${dest}/`} class="inline-flex items-center gap-1.5 text-sm font-semibold text-blu no-underline">{T.backTours}</a>
        <span class="ml-auto text-xs tracking-[0.1em] text-mute uppercase">{tour.name}</span>
      </div>
      <div class="px-6">
        <hr class="m-0 h-px border-0 bg-line" />
        <h1 class="lede mt-[22px]">{T.guideLede1}<br /><em>{T.guideLede2}</em></h1>
        <p class="sub mt-3">{T.guideSub}</p>
        <div class="mt-[26px]">
          {tour.guides.map((g) =>
            g.soon ? (
              <div class="gcard gcard-soon" key={g.id}>
                <span class="gportrait">{g.init}</span>
                <span><h3>{g.name}</h3><p class="role">{g.role}</p><p class="bio">{g.bio}</p></span>
                <span class="lock">{T.soon}</span>
              </div>
            ) : (
              <button type="button" class="gcard" key={g.id} aria-selected={sel === g.id} onClick={() => { setSel(g.id); onStart(g.id); }}>
                <span class="gportrait">{g.init}</span>
                <span><h3>{g.name}</h3><p class="role">{g.role}</p><p class="bio">{g.bio}</p></span>
              </button>
            ),
          )}
        </div>
        <div class="mt-2">
          <button type="button" class="btn btn-p" disabled={!sel} onClick={() => sel && onStart(sel)}>{T.cont}</button>
        </div>
      </div>
    </section>
  );
}
