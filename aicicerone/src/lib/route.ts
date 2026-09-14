import type { LatLng } from './geo';

// Percorsi pedonali reali via OSRM pubblico (dati OpenStreetMap, nessuna chiave, nessuno SLA).
// Tutto il tour in una sola richiesta; la geometria di ogni tratta si ricompone dagli step.
// ponytail: in produzione precalcolare i tratti tappa→tappa in build e spedirli come GeoJSON (NOTE §5).
const FOOT = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot/';
const MAX_WAYPOINTS = 50;

const pair = (p: LatLng) => `${p[1]},${p[0]}`;
const toLatLng = (c: [number, number]): LatLng => [c[1], c[0]];

export async function leg(a: LatLng, b: LatLng): Promise<LatLng[]> {
  try {
    const r = await fetch(`${FOOT}${pair(a)};${pair(b)}?overview=full&geometries=geojson`);
    const j = await r.json();
    const coords: [number, number][] | undefined = j?.routes?.[0]?.geometry?.coordinates;
    if (coords?.length) return coords.map(toLatLng);
  } catch {
    // rete assente o router giù: linea retta
  }
  return [a, b];
}

async function allLegs(points: LatLng[]): Promise<LatLng[][]> {
  const r = await fetch(`${FOOT}${points.map(pair).join(';')}?overview=false&steps=true&geometries=geojson`);
  const j = await r.json();
  const legs: { steps: { geometry: { coordinates: [number, number][] } }[] }[] | undefined = j?.routes?.[0]?.legs;
  if (!legs || legs.length !== points.length - 1) throw new Error(j?.message ?? 'no route');
  return legs.map((lg, i) => {
    const pts: LatLng[] = [];
    for (const st of lg.steps) for (const c of st.geometry.coordinates) pts.push(toLatLng(c));
    return pts.length ? pts : [points[i], points[i + 1]];
  });
}

const cache = new Map<string, Promise<LatLng[][]>>();

export function loadRoute(key: string, points: LatLng[]): Promise<LatLng[][]> {
  let p = cache.get(key);
  if (!p) {
    const perLeg = () => Promise.all(points.slice(1).map((pt, i) => leg(points[i], pt)));
    p = points.length <= MAX_WAYPOINTS ? allLegs(points).catch(perLeg) : perLeg();
    cache.set(key, p);
  }
  return p;
}
