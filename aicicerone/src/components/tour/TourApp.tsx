import { useState } from 'preact/hooks';
import { DEST, TOURS } from '../../data/tours';
import { I18N } from '../../i18n';
import ActiveTour from './ActiveTour';
import GuidePicker from './GuidePicker';

// Isola interattiva della pagina tour: scelta della guida (renderizzata anche lato server) e tour attivo.
export default function TourApp({ dest, tour }: { dest: string; tour: string }) {
  const d = DEST[dest];
  const t = TOURS[tour];
  const T = I18N[d.lang];
  const [guideId, setGuideId] = useState<string | null>(null);
  const guide = guideId ? t.guides.find((g) => g.id === guideId) : undefined;

  if (guide) return <ActiveTour dest={dest} tourId={tour} tour={t} guide={guide} lang={d.lang} T={T} onLeave={() => setGuideId(null)} />;
  return <GuidePicker dest={dest} tour={t} T={T} onStart={setGuideId} />;
}
