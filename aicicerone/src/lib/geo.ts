// Geofencing delle tappe. Pure functions: nessun accesso al browser, testabili con `npm test`.
// ponytail: si usano i fix grezzi del sistema operativo (CoreLocation / Fused Location Provider li filtrano già);
// aggiungere un Kalman solo se sul campo il marcatore risulta instabile.

export type LatLng = [number, number];
export type Fix = { lat: number; lng: number; acc: number };
export type Arrival = { n: number; count: number } | null;

export const GEO = {
  radius: 40, // m — raggio di default di ogni tappa; per-tappa via campo `r` in data/tours.ts
  hits: 2, // fix consecutivi dentro il raggio prima di dichiarare l'arrivo
  far: 1000, // m — oltre questa distanza da ogni tappa il GPS è chiaramente "fuori sede": simulazione demo
  simDelay: 7000, // ms — senza fix utile entro questo tempo parte la simulazione demo
  reroute: 80, // m — spostamento dell'utente oltre il quale si ricalcola il percorso verso la tappa
} as const;

// Equirettangolare: errore < 0.1% sotto i 10 km, più che sufficiente per un tour a piedi.
export function dist(a: LatLng, b: LatLng): number {
  const R = 6371e3;
  const x = ((b[0] - a[0]) * Math.PI) / 180;
  const y = ((b[1] - a[1]) * Math.PI) / 180 * Math.cos((a[0] * Math.PI) / 180);
  return R * Math.sqrt(x * x + y * y);
}

export function fmtDist(m: number, lang: string): string {
  if (m < 1000) return `${Math.max(5, Math.round(m / 5) * 5)} m`;
  return `${(m / 1000).toLocaleString(lang, { maximumFractionDigits: 1 })} km`;
}

export function nearest(fix: Fix, stops: readonly { c: LatLng }[]): { n: number; d: number } {
  let n = -1;
  let d = Infinity;
  for (let i = 0; i < stops.length; i++) {
    const di = dist([fix.lat, fix.lng], stops[i].c);
    if (di < d) { d = di; n = i; }
  }
  return { n, d };
}

// Regola di arrivo: la tappa candidata è la più vicina in assoluto (Voronoi), così due tappe a 30 m
// non si innescano a vicenda; deve essere non ancora incontrata, entro il suo raggio, con un fix
// abbastanza preciso, e confermata da `GEO.hits` fix consecutivi.
export function checkArrival(
  prev: Arrival,
  fix: Fix,
  stops: readonly { c: LatLng; r?: number }[],
  skip: ReadonlySet<number>,
): { next: Arrival; arrived: number | null } {
  const { n, d } = nearest(fix, stops);
  if (n < 0) return { next: null, arrived: null };
  const r = stops[n].r ?? GEO.radius;
  if (skip.has(n) || d > r || fix.acc > r * 1.5) return { next: null, arrived: null };
  const count = prev && prev.n === n ? prev.count + 1 : 1;
  if (count >= GEO.hits) return { next: null, arrived: n };
  return { next: { n, count }, arrived: null };
}
