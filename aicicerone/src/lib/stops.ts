import { VIDEOS, type Stop, type Tour } from '../data/tours';

export type StopItem = Stop & { num: string; isOpt?: boolean };

// Elenco tappe del tour, con la tappa opzionale inserita al suo posto se attiva.
export function stopList(tour: Tour, opt: boolean): StopItem[] {
  const l: StopItem[] = tour.stops.map((s, n) => ({ ...s, num: String(n + 1) }));
  if (tour.optional && opt) l.splice(tour.optional.after, 0, { ...tour.optional, num: tour.optional.label, isOpt: true });
  return l;
}

// Numero "di zona" di una tappa: la 8b conta come 9 per intestazioni di zona e avviso di transfer.
export function headNum(s: StopItem): number {
  return s.isOpt ? parseInt(s.num, 10) + 1 : Number(s.num);
}

export function transferIndex(tour: Tour, l: StopItem[]): number {
  return tour.transferBefore ? l.findIndex((s) => headNum(s) === tour.transferBefore) : -1;
}

function slug(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function videoFile(tourId: string, s: StopItem): string {
  const list = VIDEOS[tourId];
  const v = s.isOpt ? VIDEOS[`${tourId}_opt`] : Array.isArray(list) ? list[Number(s.num) - 1] : undefined;
  const name = typeof v === 'string' ? v : `${tourId}-${String(s.num).padStart(2, '0')}-${slug(s.t)}`;
  return `${name}.mp4`;
}
